import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'
import type { AppUser } from '../shared/types'
import {
  subscribeToAuthState,
  subscribeToUserDocument,
  loginWithEmail,
  registerWithEmail,
  logout as logoutService,
  getAuthErrorMessage,
} from './auth.service'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthState {
  firebaseUser: User | null
  appUser: AppUser | null
  isLoading: boolean            // true during initial auth check + Firestore doc fetch
  isOperationLoading: boolean   // true during login / register / logout
  error: string | null
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    displayName: string,
    congregation: string,
  ) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

// ---------------------------------------------------------------------------
// Context (initialized to null — forces useAuth hook to guard access)
// ---------------------------------------------------------------------------

export const AuthContext = createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOperationLoading, setIsOperationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs to track subscription cleanup
  const unsubUserDocRef = useRef<(() => void) | null>(null)

  // -------------------------------------------------------------------
  // Phase 1: Listen to Firebase Auth state
  // -------------------------------------------------------------------
  useEffect(() => {
    const unsubAuth = subscribeToAuthState((user) => {
      setFirebaseUser(user)

      if (!user) {
        // Logged out — clean up Firestore subscription and reset state
        unsubUserDocRef.current?.()
        unsubUserDocRef.current = null
        setAppUser(null)
        setIsLoading(false)
      }
    })

    return () => {
      unsubAuth()
      unsubUserDocRef.current?.()
    }
  }, [])

  // -------------------------------------------------------------------
  // Phase 2: When Firebase user changes, subscribe to Firestore user doc
  // -------------------------------------------------------------------
  useEffect(() => {
    const uid = firebaseUser?.uid
    if (!uid) return

    // Clean up any previous Firestore listener (e.g., different user)
    unsubUserDocRef.current?.()

    setIsLoading(true)
    const unsubUserDoc = subscribeToUserDocument(uid, (userDoc) => {
      setAppUser(userDoc)
      setIsLoading(false)
    })

    unsubUserDocRef.current = unsubUserDoc

    return () => {
      unsubUserDoc()
    }
  }, [firebaseUser?.uid]) // Keyed on uid, not the User object reference

  // -------------------------------------------------------------------
  // Auth actions
  // -------------------------------------------------------------------

  const login = useCallback(async (email: string, password: string) => {
    setIsOperationLoading(true)
    setError(null)
    try {
      await loginWithEmail(email, password)
      // Don't set firebaseUser manually — onAuthStateChanged handles it
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(getAuthErrorMessage(code))
    } finally {
      setIsOperationLoading(false)
    }
  }, [])

  const register = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      congregation: string,
    ) => {
      setIsOperationLoading(true)
      setError(null)
      try {
        await registerWithEmail(email, password, displayName, congregation)
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? ''
        setError(getAuthErrorMessage(code))
      } finally {
        setIsOperationLoading(false)
      }
    },
    [],
  )

  const logout = useCallback(async () => {
    setIsOperationLoading(true)
    setError(null)
    try {
      await logoutService()
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(getAuthErrorMessage(code))
    } finally {
      setIsOperationLoading(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  // -------------------------------------------------------------------
  // Memoized context value — prevents unnecessary re-renders
  // -------------------------------------------------------------------

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      appUser,
      isLoading,
      isOperationLoading,
      error,
      login,
      register,
      logout,
      clearError,
    }),
    [firebaseUser, appUser, isLoading, isOperationLoading, error, login, register, logout, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
