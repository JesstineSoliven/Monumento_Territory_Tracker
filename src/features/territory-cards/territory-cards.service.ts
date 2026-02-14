import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db, storage } from '../../lib/firebase'
import type { TerritoryCard } from '../../shared/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
export const MAX_BATCH_SIZE = 30
const MAX_CONCURRENT_UPLOADS = 5

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type as typeof ALLOWED_TYPES[number])) {
    return 'Only JPEG, PNG, and WebP images are allowed.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File exceeds 5 MB limit.'
  }
  return null
}

export function validateBatch(files: File[]): string | null {
  if (files.length === 0) return 'No files selected.'
  if (files.length > MAX_BATCH_SIZE) return `Maximum ${MAX_BATCH_SIZE} files per batch.`
  return null
}

// ---------------------------------------------------------------------------
// Storage path builder
// ---------------------------------------------------------------------------

export function buildStoragePath(fileName: string): string {
  const timestamp = Date.now()
  const dotIndex = fileName.lastIndexOf('.')
  const name = dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName
  const ext = dotIndex > 0 ? fileName.substring(dotIndex + 1) : ''
  return `territory-cards/${name}_${timestamp}.${ext}`
}

// ---------------------------------------------------------------------------
// Single file upload
// ---------------------------------------------------------------------------

export function uploadTerritoryCard(
  file: File,
  metadata: { territoryNumber: string; label: string; territoryOwner: string; characteristic: string; territorySize: string; nearestMeetingPlace: string },
  uploader: { uid: string; name: string },
  onProgress: (progress: number) => void,
): { promise: Promise<TerritoryCard>; cancel: () => void } {
  const storagePath = buildStoragePath(file.name)
  const storageRef = ref(storage, storagePath)
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  })

  const promise = new Promise<TerritoryCard>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress(progress)
      },
      (error) => {
        reject(error)
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(storageRef)
          const docRef = doc(collection(db, 'territoryCards'))

          const cardData = {
            id: docRef.id,
            territoryNumber: metadata.territoryNumber,
            label: metadata.label,
            territoryOwner: metadata.territoryOwner,
            characteristic: metadata.characteristic,
            territorySize: metadata.territorySize,
            nearestMeetingPlace: metadata.nearestMeetingPlace,
            fileName: file.name,
            storagePath,
            downloadUrl,
            fileSize: file.size,
            contentType: file.type,
            uploadedBy: uploader,
            isLinked: false,
            linkedTerritoryId: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }

          await setDoc(docRef, cardData)

          // Return with local timestamps (server timestamps resolve via onSnapshot)
          resolve({
            ...cardData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          } as TerritoryCard)
        } catch (error) {
          reject(error)
        }
      },
    )
  })

  return {
    promise,
    cancel: () => uploadTask.cancel(),
  }
}

// ---------------------------------------------------------------------------
// Batch upload with concurrency pool
// ---------------------------------------------------------------------------

export async function uploadBatch(
  files: File[],
  metadataProvider: (file: File, index: number) => { territoryNumber: string; label: string; territoryOwner: string; characteristic: string; territorySize: string; nearestMeetingPlace: string },
  uploader: { uid: string; name: string },
  onFileProgress: (fileIndex: number, progress: number) => void,
  onFileComplete: (fileIndex: number, card: TerritoryCard) => void,
  onFileError: (fileIndex: number, error: string) => void,
): Promise<void> {
  let nextIndex = 0

  async function processNext(): Promise<void> {
    while (nextIndex < files.length) {
      const currentIndex = nextIndex++
      const file = files[currentIndex]
      try {
        const { promise } = uploadTerritoryCard(
          file,
          metadataProvider(file, currentIndex),
          uploader,
          (progress) => onFileProgress(currentIndex, progress),
        )
        const card = await promise
        onFileComplete(currentIndex, card)
      } catch (err) {
        onFileError(
          currentIndex,
          err instanceof Error ? err.message : 'Upload failed',
        )
      }
    }
  }

  const workerCount = Math.min(MAX_CONCURRENT_UPLOADS, files.length)
  const workers = Array.from({ length: workerCount }, () => processNext())
  await Promise.all(workers)
}

// ---------------------------------------------------------------------------
// Real-time subscription
// ---------------------------------------------------------------------------

export function subscribeToTerritoryCards(
  callback: (cards: TerritoryCard[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'territoryCards'),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const cards = snapshot.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as TerritoryCard,
      )
      callback(cards)
    },
    (error) => {
      console.error('subscribeToTerritoryCards error:', error)
      onError?.(error)
    },
  )
}

// ---------------------------------------------------------------------------
// Delete a territory card (Firestore doc + Storage file)
// ---------------------------------------------------------------------------

export async function deleteTerritoryCard(card: TerritoryCard): Promise<void> {
  // Safety check: prevent deletion if the card is currently linked to a territory
  if (card.isLinked) {
    throw new Error(
      'Cannot delete a card that is currently linked to an active territory. Unlink the card first.',
    )
  }

  // 1. Delete the file from Firebase Storage
  try {
    const storageRef = ref(storage, card.storagePath)
    await deleteObject(storageRef)
  } catch (err: unknown) {
    // If the file is already gone (404), continue to delete the Firestore doc.
    // Any other error should be thrown.
    if (
      err instanceof Error &&
      'code' in err &&
      (err as { code: string }).code === 'storage/object-not-found'
    ) {
      console.warn('Storage file already deleted:', card.storagePath)
    } else {
      throw err
    }
  }

  // 2. Delete the Firestore metadata document
  await deleteDoc(doc(db, 'territoryCards', card.id))
}
