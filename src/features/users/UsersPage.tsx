import { useState, useEffect } from 'react'
import type { AppUser, UserRole, MinistryDay } from '../../shared/types'
import { useAuth } from '../../shared/hooks/useAuth'
import {
  subscribeToUsers,
  updateUserRole,
  toggleUserActive,
  updateAssignedDays,
} from './users.service'

const ALL_ROLES: UserRole[] = ['admin', 'servant', 'leader', 'publisher']
const ALL_MINISTRY_DAYS: MinistryDay[] = ['Tuesday', 'Wednesday', 'Thursday', 'Friday']

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700',
  servant: 'bg-purple-100 text-purple-700',
  leader: 'bg-blue-100 text-blue-700',
  publisher: 'bg-slate-100 text-slate-600',
}

export default function UsersPage() {
  const { appUser } = useAuth()

  const [users, setUsers] = useState<AppUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToUsers(
      (updated) => {
        setUsers(updated)
        setIsLoading(false)
      },
      () => setIsLoading(false),
    )
    return () => unsubscribe()
  }, [])

  async function handleRoleChange(uid: string, newRole: UserRole) {
    setUpdatingId(uid)
    setError(null)
    try {
      await updateUserRole(uid, newRole)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleToggleActive(uid: string, currentActive: boolean) {
    setUpdatingId(uid)
    setError(null)
    try {
      await toggleUserActive(uid, !currentActive)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDayToggle(uid: string, day: MinistryDay, currentDays: MinistryDay[]) {
    setUpdatingId(uid)
    setError(null)
    try {
      const updatedDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day]
      await updateAssignedDays(uid, updatedDays)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assigned days.')
    } finally {
      setUpdatingId(null)
    }
  }

  const activeUsers = users.filter((u) => u.isActive)
  const deactivatedUsers = users.filter((u) => !u.isActive)
  const leaders = users.filter((u) => u.role === 'leader' && u.isActive)

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manage Users</h1>
        <p className="mt-1 text-slate-600">
          View all registered users. Change roles, activate/deactivate accounts, and manage leader schedules.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="ml-4 text-slate-600">Loading users...</p>
        </div>
      )}

      {!isLoading && users.length === 0 && (
        <p className="text-sm text-slate-500 py-8 text-center">No users found.</p>
      )}

      {!isLoading && activeUsers.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Active Users ({activeUsers.length})
          </h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Congregation
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeUsers.map((user) => (
                  <UserRow
                    key={user.uid}
                    user={user}
                    currentAdminUid={appUser?.uid ?? ''}
                    isUpdating={updatingId === user.uid}
                    onRoleChange={handleRoleChange}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Leader Assigned Ministry Days */}
      {!isLoading && leaders.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Leader Assigned Ministry Days
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Assign ministry days for each leader. Leaders will see their assigned days on their dashboard.
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Leader
                  </th>
                  {ALL_MINISTRY_DAYS.map((day) => (
                    <th
                      key={day}
                      className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leaders.map((leader) => (
                  <LeaderDayRow
                    key={leader.uid}
                    leader={leader}
                    isUpdating={updatingId === leader.uid}
                    onDayToggle={handleDayToggle}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!isLoading && deactivatedUsers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Deactivated ({deactivatedUsers.length})
          </h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Congregation
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {deactivatedUsers.map((user) => (
                  <UserRow
                    key={user.uid}
                    user={user}
                    currentAdminUid={appUser?.uid ?? ''}
                    isUpdating={updatingId === user.uid}
                    onRoleChange={handleRoleChange}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// User row component
// ---------------------------------------------------------------------------

function UserRow({
  user,
  currentAdminUid,
  isUpdating,
  onRoleChange,
  onToggleActive,
}: {
  user: AppUser
  currentAdminUid: string
  isUpdating: boolean
  onRoleChange: (uid: string, role: UserRole) => void
  onToggleActive: (uid: string, currentActive: boolean) => void
}) {
  const isSelf = user.uid === currentAdminUid

  const createdDate = user.createdAt?.toDate?.()
  const dateStr = createdDate
    ? createdDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'

  return (
    <tr className={!user.isActive ? 'bg-slate-50 opacity-75' : ''}>
      {/* Name + avatar */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              {user.displayName}
              {isSelf && <span className="ml-1 text-xs text-blue-600">(You)</span>}
            </p>
            <p className="text-xs text-slate-400">{dateStr}</p>
          </div>
        </div>
      </td>

      {/* Email */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
        {user.email}
      </td>

      {/* Role selector */}
      <td className="px-4 py-3 whitespace-nowrap">
        {isSelf ? (
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              ROLE_COLORS[user.role]
            }`}
          >
            {user.role}
          </span>
        ) : (
          <select
            value={user.role}
            disabled={isUpdating}
            onChange={(e) => onRoleChange(user.uid, e.target.value as UserRole)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
        )}
      </td>

      {/* Congregation */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
        {user.congregation}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        {isSelf ? (
          <span className="text-xs text-slate-400">—</span>
        ) : (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onToggleActive(user.uid, user.isActive)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              user.isActive
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {isUpdating ? (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            {user.isActive ? 'Deactivate' : 'Activate'}
          </button>
        )}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Leader day assignment row component
// ---------------------------------------------------------------------------

function LeaderDayRow({
  leader,
  isUpdating,
  onDayToggle,
}: {
  leader: AppUser
  isUpdating: boolean
  onDayToggle: (uid: string, day: MinistryDay, currentDays: MinistryDay[]) => void
}) {
  const assignedDays = leader.assignedDays ?? []

  return (
    <tr>
      {/* Leader info */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {leader.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              {leader.displayName}
            </p>
            <p className="text-xs text-slate-400">{leader.congregation}</p>
          </div>
        </div>
      </td>

      {/* Day checkboxes */}
      {ALL_MINISTRY_DAYS.map((day) => {
        const isChecked = assignedDays.includes(day)
        return (
          <td key={day} className="px-4 py-3 text-center">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onDayToggle(leader.uid, day, assignedDays)}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isChecked
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
              title={`${isChecked ? 'Remove' : 'Assign'} ${day}`}
            >
              {isUpdating ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : isChecked ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </td>
        )
      })}
    </tr>
  )
}
