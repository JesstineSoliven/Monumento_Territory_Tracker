import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '../../auth/AuthContext'

/**
 * Hook to access authentication state and actions.
 *
 * Must be used within an <AuthProvider>.
 * Returns a typed AuthContextValue — no null checks needed at call sites.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
