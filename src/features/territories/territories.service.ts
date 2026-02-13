import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  writeBatch,
  increment,
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Territory, TerritoryCard, AppUser, Report } from '../../shared/types'

// ---------------------------------------------------------------------------
// Announce a territory — creates a territory doc and links the card
// ---------------------------------------------------------------------------

export interface AnnouncePayload {
  card: TerritoryCard
  leaderId: string
  leaderName: string
  description: string
  announcedBy: { uid: string; name: string }
}

export async function announceTerritory(payload: AnnouncePayload): Promise<string> {
  const { card, leaderId, leaderName, description, announcedBy } = payload

  const territoryRef = doc(collection(db, 'territories'))
  const cardRef = doc(db, 'territoryCards', card.id)

  const batch = writeBatch(db)

  // 1. Create territory document
  batch.set(territoryRef, {
    number: card.territoryNumber,
    name: card.label,
    description,
    status: 'in-progress',
    card: {
      cardId: card.id,
      downloadUrl: card.downloadUrl,
      territoryNumber: card.territoryNumber,
    },
    currentAssignment: {
      leaderId,
      leaderName,
      assignedAt: serverTimestamp(),
    },
    announcedBy,
    announcedAt: serverTimestamp(),
    lastCompletedAt: null,
    completionCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // 2. Mark the card as linked
  batch.update(cardRef, {
    isLinked: true,
    linkedTerritoryId: territoryRef.id,
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
  return territoryRef.id
}

// ---------------------------------------------------------------------------
// Subscribe to all territories (real-time)
// ---------------------------------------------------------------------------

export function subscribeToTerritories(
  callback: (territories: Territory[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'territories'),
    orderBy('announcedAt', 'desc'),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const territories = snapshot.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as Territory,
      )
      callback(territories)
    },
    (error) => {
      console.error('subscribeToTerritories error:', error)
      onError?.(error)
    },
  )
}

// ---------------------------------------------------------------------------
// Subscribe to territories filtered by status
// ---------------------------------------------------------------------------

export function subscribeToTerritoriesByStatus(
  status: string,
  callback: (territories: Territory[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  // Single where clause to avoid requiring a composite index.
  // Client-side sort handles ordering.
  const q = query(
    collection(db, 'territories'),
    where('status', '==', status),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const territories = snapshot.docs
        .map((d) => ({ ...d.data(), id: d.id }) as Territory)
        .sort((a, b) => {
          const aTime = a.announcedAt?.toMillis?.() ?? 0
          const bTime = b.announcedAt?.toMillis?.() ?? 0
          return bTime - aTime
        })
      callback(territories)
    },
    (error) => {
      console.error('subscribeToTerritoriesByStatus error:', error)
      onError?.(error)
    },
  )
}

// ---------------------------------------------------------------------------
// Fetch available territory cards (active, not linked)
// ---------------------------------------------------------------------------

export function subscribeToAvailableCards(
  callback: (cards: TerritoryCard[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  // Single where clause to avoid requiring a composite index.
  // Client-side filter handles isActive + sorts by territoryNumber.
  const q = query(
    collection(db, 'territoryCards'),
    where('isLinked', '==', false),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const cards = snapshot.docs
        .map((d) => ({ ...d.data(), id: d.id }) as TerritoryCard)
        .filter((c) => c.isActive)
        .sort((a, b) => a.territoryNumber.localeCompare(b.territoryNumber))
      callback(cards)
    },
    (error) => {
      console.error('subscribeToAvailableCards error:', error)
      onError?.(error)
    },
  )
}

// ---------------------------------------------------------------------------
// Fetch users with "leader" role (for assignment dropdown)
// ---------------------------------------------------------------------------

export function subscribeToLeaders(
  callback: (leaders: AppUser[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  // Single where clause to avoid requiring a composite index.
  // Client-side filter handles isActive.
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'leader'),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const leaders = snapshot.docs
        .map((d) => ({ ...d.data(), uid: d.id }) as unknown as AppUser)
        .filter((u) => u.isActive)
      callback(leaders)
    },
    (error) => {
      console.error('subscribeToLeaders error:', error)
      onError?.(error)
    },
  )
}

// ---------------------------------------------------------------------------
// Mark territory as completed
// ---------------------------------------------------------------------------

export async function markTerritoryCompleted(territoryId: string): Promise<void> {
  await updateDoc(doc(db, 'territories', territoryId), {
    status: 'completed',
    lastCompletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// ---------------------------------------------------------------------------
// Subscribe to territories assigned to a specific leader
// ---------------------------------------------------------------------------

export function subscribeToMyTerritories(
  leaderId: string,
  callback: (territories: Territory[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'territories'),
    where('currentAssignment.leaderId', '==', leaderId),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const territories = snapshot.docs
        .map((d) => ({ ...d.data(), id: d.id }) as Territory)
        .sort((a, b) => {
          const aTime = a.announcedAt?.toMillis?.() ?? 0
          const bTime = b.announcedAt?.toMillis?.() ?? 0
          return bTime - aTime
        })
      callback(territories)
    },
    (error) => {
      console.error('subscribeToMyTerritories error:', error)
      onError?.(error)
    },
  )
}

// ---------------------------------------------------------------------------
// Subscribe to a single territory
// ---------------------------------------------------------------------------

export function subscribeToTerritory(
  territoryId: string,
  callback: (territory: Territory | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'territories', territoryId),
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ ...snapshot.data(), id: snapshot.id } as Territory)
      } else {
        callback(null)
      }
    },
    (error) => {
      console.error('subscribeToTerritory error:', error)
      onError?.(error)
    },
  )
}

// ---------------------------------------------------------------------------
// Reports — submit a report for a territory
// ---------------------------------------------------------------------------

export interface ReportPayload {
  territoryId: string
  reportedBy: { uid: string; name: string }
  completed: boolean
  remarks: string
}

export async function submitReport(payload: ReportPayload): Promise<string> {
  const { territoryId, reportedBy, completed, remarks } = payload

  const reportRef = doc(collection(db, 'territories', territoryId, 'reports'))

  await setDoc(reportRef, {
    territoryId,
    reportedBy,
    completed,
    remarks,
    reportedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  })

  // If the leader marked it as completed, update the territory status
  if (completed) {
    await updateDoc(doc(db, 'territories', territoryId), {
      status: 'completed',
      lastCompletedAt: serverTimestamp(),
      completionCount: increment(1),
      updatedAt: serverTimestamp(),
    })
  }

  return reportRef.id
}

// ---------------------------------------------------------------------------
// Subscribe to reports for a territory
// ---------------------------------------------------------------------------

export function subscribeToReports(
  territoryId: string,
  callback: (reports: Report[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'territories', territoryId, 'reports'),
    orderBy('reportedAt', 'desc'),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const reports = snapshot.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as Report,
      )
      callback(reports)
    },
    (error) => {
      console.error('subscribeToReports error:', error)
      onError?.(error)
    },
  )
}
