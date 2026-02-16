import { Navigate } from 'react-router-dom'
import { useAuth } from '../shared/hooks/useAuth'
import AppLayout from '../shared/components/AppLayout'

export default function AuthGuard() {
  const { firebaseUser, appUser, isLoading } = useAuth()

  // Still determining auth state — show loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated — redirect to login
  if (!firebaseUser) {
    return <Navigate to="/login" replace />
  }

  // Authenticated but no Firestore user document yet
  if (!appUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md text-center p-8">
          <h2 className="text-xl font-semibold text-slate-900">Account Pending</h2>
          <p className="mt-2 text-slate-600">
            Your account is being set up. Please wait a moment or contact an administrator.
          </p>
        </div>
      </div>
    )
  }

  // Account deactivated
  if (!appUser.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md text-center p-8">
          <h2 className="text-xl font-semibold text-red-700">Account Deactivated</h2>
          <p className="mt-2 text-slate-600">
            Your account has been deactivated. Please contact an administrator.
          </p>
        </div>
      </div>
    )
  }

  // All checks pass — render sidebar layout + child routes
  return <AppLayout />
}
