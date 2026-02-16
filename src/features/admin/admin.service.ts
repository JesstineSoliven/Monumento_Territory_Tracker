import {
  collection,
  getDocs,
  writeBatch,
  query,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResetProgress {
  phase: 'reports' | 'territories' | 'cards-storage' | 'cards-firestore' | 'unlink-cards' | 'done'
  current: number
  total: number
  errors: string[]
}

export interface ResetResult {
  territoriesDeleted: number
  reportsDeleted: number
  cardsUnlinked: number
  errors: string[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_LIMIT = 450 // Firestore batch limit is 500, leave margin

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Delete documents in batches respecting Firestore's 500-op limit. */
async function batchDeleteDocs(
  refs: { ref: ReturnType<typeof doc> }[],
  onProgress?: (deleted: number) => void,
): Promise<number> {
  let deleted = 0

  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const chunk = refs.slice(i, i + BATCH_LIMIT)
    const batch = writeBatch(db)
    chunk.forEach((item) => batch.delete(item.ref))
    await batch.commit()
    deleted += chunk.length
    onProgress?.(deleted)
  }

  return deleted
}

// ---------------------------------------------------------------------------
// System Reset — Hard Reset with Confirmation (Option B)
// ---------------------------------------------------------------------------
// Deletes:
//   1. All report subcollections under each territory
//   2. All territory documents
//   3. Unlinks all territory cards (resets isLinked, clears linkedTerritoryId)
// Preserves:
//   - Users collection (accounts, roles)
//   - Territory card images and metadata (only unlinks them)
//   - Firebase Auth accounts
// ---------------------------------------------------------------------------

export async function performSystemReset(
  onProgress: (progress: ResetProgress) => void,
): Promise<ResetResult> {
  const errors: string[] = []
  let reportsDeleted = 0
  let territoriesDeleted = 0
  let cardsUnlinked = 0

  // -----------------------------------------------------------------------
  // Phase 1: Fetch all territory IDs and delete their report subcollections
  // -----------------------------------------------------------------------

  const territoriesSnapshot = await getDocs(collection(db, 'territories'))
  const territoryDocs = territoriesSnapshot.docs
  const totalTerritories = territoryDocs.length

  onProgress({
    phase: 'reports',
    current: 0,
    total: totalTerritories,
    errors,
  })

  for (let i = 0; i < territoryDocs.length; i++) {
    const territoryDoc = territoryDocs[i]
    try {
      const reportsSnapshot = await getDocs(
        query(collection(db, 'territories', territoryDoc.id, 'reports')),
      )

      if (reportsSnapshot.size > 0) {
        const reportRefs = reportsSnapshot.docs.map((d) => ({ ref: d.ref }))
        const deleted = await batchDeleteDocs(reportRefs)
        reportsDeleted += deleted
      }
    } catch (err) {
      errors.push(`Reports for territory ${territoryDoc.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    onProgress({
      phase: 'reports',
      current: i + 1,
      total: totalTerritories,
      errors,
    })
  }

  // -----------------------------------------------------------------------
  // Phase 2: Delete all territory documents
  // -----------------------------------------------------------------------

  onProgress({
    phase: 'territories',
    current: 0,
    total: totalTerritories,
    errors,
  })

  try {
    const territoryRefs = territoryDocs.map((d) => ({ ref: d.ref }))
    territoriesDeleted = await batchDeleteDocs(territoryRefs, (deleted) => {
      onProgress({
        phase: 'territories',
        current: deleted,
        total: totalTerritories,
        errors,
      })
    })
  } catch (err) {
    errors.push(`Territory deletion: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  // -----------------------------------------------------------------------
  // Phase 3: Unlink all territory cards (reset isLinked flags)
  // -----------------------------------------------------------------------

  const cardsSnapshot = await getDocs(collection(db, 'territoryCards'))
  const linkedCards = cardsSnapshot.docs.filter(
    (d) => d.data().isLinked === true,
  )

  onProgress({
    phase: 'unlink-cards',
    current: 0,
    total: linkedCards.length,
    errors,
  })

  for (let i = 0; i < linkedCards.length; i += BATCH_LIMIT) {
    const chunk = linkedCards.slice(i, i + BATCH_LIMIT)
    const batch = writeBatch(db)
    chunk.forEach((cardDoc) => {
      batch.update(cardDoc.ref, {
        isLinked: false,
        linkedTerritoryId: null,
        updatedAt: serverTimestamp(),
      })
    })
    await batch.commit()
    cardsUnlinked += chunk.length

    onProgress({
      phase: 'unlink-cards',
      current: cardsUnlinked,
      total: linkedCards.length,
      errors,
    })
  }

  // -----------------------------------------------------------------------
  // Done
  // -----------------------------------------------------------------------

  onProgress({
    phase: 'done',
    current: 0,
    total: 0,
    errors,
  })

  return {
    territoriesDeleted,
    reportsDeleted,
    cardsUnlinked,
    errors,
  }
}

// ---------------------------------------------------------------------------
// Pre-flight check — fetch counts so user sees what will be affected
// ---------------------------------------------------------------------------

export interface ResetPreview {
  territoriesCount: number
  linkedCardsCount: number
}

export async function fetchResetPreview(): Promise<ResetPreview> {
  const [territoriesSnap, cardsSnap] = await Promise.all([
    getDocs(collection(db, 'territories')),
    getDocs(collection(db, 'territoryCards')),
  ])

  const linkedCardsCount = cardsSnap.docs.filter(
    (d) => d.data().isLinked === true,
  ).length

  return {
    territoriesCount: territoriesSnap.size,
    linkedCardsCount,
  }
}
