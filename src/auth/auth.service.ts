import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { AppUser, UserRole } from '../shared/types'

// ---------------------------------------------------------------------------
// Auth operations
// ---------------------------------------------------------------------------

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
  congregation: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const user = credential.user

  // Create the corresponding Firestore user document.
  // NOTE: Firestore security rules must allow authenticated users to create
  // their own document. Required rule on users/{uid}:
  //   allow create: if isAuthenticated() && request.auth.uid == uid;
  await createUserDocument(user.uid, user.email ?? email, displayName, congregation)

  return user
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

// ---------------------------------------------------------------------------
// Auth state listener
// ---------------------------------------------------------------------------

export function subscribeToAuthState(
  callback: (user: User | null) => void,
): Unsubscribe {
  return onAuthStateChanged(auth, callback)
}

// ---------------------------------------------------------------------------
// Firestore user document
// ---------------------------------------------------------------------------

export async function createUserDocument(
  uid: string,
  email: string,
  displayName: string,
  congregation: string,
  role: UserRole = 'publisher',
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    displayName,
    role,
    congregation,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function subscribeToUserDocument(
  uid: string,
  callback: (user: AppUser | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: uid, ...snapshot.data() } as unknown as AppUser)
    } else {
      callback(null)
    }
  })
}

// ---------------------------------------------------------------------------
// Error mapping — Firebase error codes → user-friendly messages
// ---------------------------------------------------------------------------

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
}

export function getAuthErrorMessage(errorCode: string): string {
  return AUTH_ERROR_MESSAGES[errorCode] ?? 'An unexpected error occurred. Please try again.'
}
