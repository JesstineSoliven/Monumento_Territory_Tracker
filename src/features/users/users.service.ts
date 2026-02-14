import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { AppUser, UserRole, MinistryDay } from '../../shared/types'

// ---------------------------------------------------------------------------
// Subscribe to all users (real-time)
// ---------------------------------------------------------------------------

export function subscribeToUsers(
  callback: (users: AppUser[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'users'),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map(
        (d) => ({ ...d.data(), uid: d.id }) as unknown as AppUser,
      )
      callback(users)
    },
    (error) => {
      console.error('subscribeToUsers error:', error)
      onError?.(error)
    },
  )
}

// ---------------------------------------------------------------------------
// Update a user's role (admin only)
// ---------------------------------------------------------------------------

export async function updateUserRole(
  uid: string,
  newRole: UserRole,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    role: newRole,
    updatedAt: serverTimestamp(),
  })
}

// ---------------------------------------------------------------------------
// Toggle a user's active status (admin only)
// ---------------------------------------------------------------------------

export async function toggleUserActive(
  uid: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    isActive,
    updatedAt: serverTimestamp(),
  })
}

// ---------------------------------------------------------------------------
// Update a leader's assigned ministry days (admin/servant only)
// ---------------------------------------------------------------------------

export async function updateAssignedDays(
  uid: string,
  days: MinistryDay[],
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    assignedDays: days,
    updatedAt: serverTimestamp(),
  })
}
