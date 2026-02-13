import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '../shared/types'
import { useAuth } from '../shared/hooks/useAuth'

interface RoleGuardProps {
  allowedRoles: UserRole[]
  redirectTo?: string
}

export default function RoleGuard({
  allowedRoles,
  redirectTo = '/',
}: RoleGuardProps) {
  const { appUser } = useAuth()

  // Safety check — should never happen because RoleGuard is nested inside AuthGuard,
  // but TypeScript doesn't know that.
  if (!appUser) {
    return <Navigate to="/login" replace />
  }

  // User's role is not in the allowed list — redirect
  if (!allowedRoles.includes(appUser.role)) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
