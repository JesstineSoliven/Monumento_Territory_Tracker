import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Territory } from '../../shared/types'
import { useAuth } from '../../shared/hooks/useAuth'
import { useNotifications } from '../../shared/hooks/useNotifications'
import {
  subscribeToTerritories,
  subscribeToMyTerritories,
  acceptTerritory,
  rejectTerritory,
} from '../territories/territories.service'

export default function DashboardPage() {
  const { appUser } = useAuth()
  const { unread } = useNotifications()

  const [territories, setTerritories] = useState<Territory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const isLeader = appUser?.role === 'leader'

  useEffect(() => {
    if (!appUser) return

    const unsubscribe = isLeader
      ? subscribeToMyTerritories(
          appUser.uid,
          (t) => { setTerritories(t); setIsLoading(false) },
          () => setIsLoading(false),
        )
      : subscribeToTerritories(
          (t) => { setTerritories(t); setIsLoading(false) },
          () => setIsLoading(false),
        )

    return () => unsubscribe()
  }, [appUser, isLeader])

  const inProgress = territories.filter((t) => t.status === 'in-progress')
  const completed = territories.filter((t) => t.status === 'completed')

  // Greeting based on role
  const greetings: Record<string, string> = {
    admin: 'System overview and management tools.',
    servant: 'Announce territories and manage cards.',
    leader: 'View your assigned territories and submit reports.',
    publisher: 'Browse announced territories.',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome, {appUser?.displayName ?? 'User'}
        </h1>
        <p className="mt-1 text-slate-600">
          {greetings[appUser?.role ?? 'publisher']}
        </p>
      </div>

      {/* Leader: assigned ministry days */}
      {isLeader && appUser?.assignedDays && appUser.assignedDays.length > 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h2 className="text-sm font-semibold text-blue-800 mb-2">Your Ministry Days</h2>
          <div className="flex flex-wrap gap-2">
            {appUser.assignedDays.map((day) => (
              <span
                key={day}
                className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white"
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Leader: pending assignment notifications */}
      {isLeader && unread.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.85 3.5a.75.75 0 00-1.117-1 9.719 9.719 0 00-2.348 4.876.75.75 0 001.479.248A8.219 8.219 0 015.85 3.5zM19.267 2.5a.75.75 0 10-1.118 1 8.22 8.22 0 011.987 4.124.75.75 0 001.48-.248A9.72 9.72 0 0019.266 2.5z" />
              <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 005.25 9v.75a8.217 8.217 0 01-2.119 5.52.75.75 0 00.298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 107.48 0 24.583 24.583 0 004.83-1.244.75.75 0 00.298-1.205 8.217 8.217 0 01-2.118-5.52V9A6.75 6.75 0 0012 2.25zM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 004.496 0l.002.1a2.25 2.25 0 01-4.5 0z" clipRule="evenodd" />
            </svg>
            New Assignments ({unread.length})
          </h2>
          <div className="space-y-3">
            {unread.map((t) => (
              <NotificationCard key={t.id} territory={t} />
            ))}
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label={isLeader ? 'My In-Progress' : 'In Progress'}
          value={isLoading ? '...' : String(inProgress.length)}
          color="blue"
        />
        <StatCard
          label={isLeader ? 'My Completed' : 'Completed'}
          value={isLoading ? '...' : String(completed.length)}
          color="green"
        />
        <StatCard
          label="Total"
          value={isLoading ? '...' : String(territories.length)}
          color="gray"
        />
      </div>

      {/* Quick actions — role-based */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Everyone: view territories */}
          <QuickAction
            to="/territories"
            title={isLeader ? 'My Territories' : 'View Territories'}
            description={
              isLeader
                ? 'View your assigned territories and submit reports'
                : 'Browse all announced territories'
            }
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            }
          />

          {/* Servant + Admin: announce */}
          {(appUser?.role === 'admin' || appUser?.role === 'servant') && (
            <QuickAction
              to="/announce"
              title="Announce Territory"
              description="Select a card and assign a leader"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                </svg>
              }
            />
          )}

          {/* Servant + Admin: upload cards */}
          {(appUser?.role === 'admin' || appUser?.role === 'servant') && (
            <QuickAction
              to="/territory-cards"
              title="Manage Cards"
              description="Upload and manage territory card images"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              }
            />
          )}

          {/* Servant + Admin: monthly reports */}
          {(appUser?.role === 'admin' || appUser?.role === 'servant') && (
            <QuickAction
              to="/reports"
              title="Monthly Report"
              description="View report status and export monthly data"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              }
            />
          )}

          {/* Admin: manage users */}
          {appUser?.role === 'admin' && (
            <QuickAction
              to="/users"
              title="Manage Users"
              description="Assign roles and manage accounts"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
            />
          )}
        </div>
      </div>

      {/* Recent in-progress territories */}
      {!isLoading && inProgress.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {isLeader ? 'Your Active Territories' : 'Recent In-Progress'}
          </h2>
          <div className="space-y-3">
            {inProgress.slice(0, 5).map((t) => (
              <Link
                key={t.id}
                to={`/territories/${t.id}`}
                className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-card hover:border-blue-300 hover:shadow-card-hover transition-all duration-200"
              >
                {t.card?.downloadUrl ? (
                  <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                    <img
                      src={t.card.downloadUrl}
                      alt={t.number}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-16 flex-shrink-0 rounded-md bg-slate-100 flex items-center justify-center">
                    <span className="text-xs text-slate-400">--</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{t.number}</p>
                  <p className="text-xs text-slate-500 truncate">{t.name}</p>
                </div>
                {t.currentAssignment && (
                  <p className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">
                    {t.currentAssignment.leaderName}
                  </p>
                )}
                <svg className="h-5 w-5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
            {inProgress.length > 5 && (
              <Link
                to="/territories"
                className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 py-2"
              >
                View all {inProgress.length} territories
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat card component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: 'blue' | 'green' | 'gray'
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    gray: 'bg-slate-50 border-slate-200 text-slate-700',
  }

  return (
    <div className={`rounded-lg border p-5 shadow-card ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick action card
// ---------------------------------------------------------------------------

function QuickAction({
  to,
  title,
  description,
  icon,
}: {
  to: string
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-card hover:border-blue-300 hover:shadow-card-hover active:scale-[0.98] transition-all duration-200"
    >
      <div className="flex-shrink-0 rounded-md bg-blue-50 p-2 text-blue-600">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Notification card with accept/reject
// ---------------------------------------------------------------------------

function NotificationCard({ territory }: { territory: Territory }) {
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const announcedDate = territory.announcedAt?.toDate?.()
  const dateStr = announcedDate
    ? announcedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'

  const targetDate = territory.targetCompletionDate?.toDate?.()
  const targetStr = targetDate
    ? targetDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  async function handleAccept() {
    setIsAccepting(true)
    setError(null)
    try {
      await acceptTerritory(territory.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept.')
    } finally {
      setIsAccepting(false)
    }
  }

  async function handleReject() {
    setIsRejecting(true)
    setError(null)
    setShowRejectConfirm(false)
    try {
      await rejectTerritory(territory.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject.')
    } finally {
      setIsRejecting(false)
    }
  }

  const isBusy = isAccepting || isRejecting

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 p-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Card thumbnail */}
        {territory.card?.downloadUrl ? (
          <div className="h-16 w-20 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
            <img
              src={territory.card.downloadUrl}
              alt={territory.number}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="h-16 w-20 flex-shrink-0 rounded-md bg-slate-100 flex items-center justify-center">
            <span className="text-xs text-slate-400">--</span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900">{territory.number}</p>
            <span className="inline-block rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
              New Assignment
            </span>
          </div>
          <p className="text-sm text-slate-700 truncate">{territory.name}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <p className="text-xs text-slate-500">Announced: {dateStr}</p>
            {targetStr && (
              <p className="text-xs text-slate-500">Due: {targetStr}</p>
            )}
          </div>
          {territory.announcedBy && (
            <p className="text-xs text-slate-400 mt-0.5">
              by {territory.announcedBy.name}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {!showRejectConfirm ? (
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            disabled={isBusy}
            onClick={handleAccept}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAccepting ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            Accept
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setShowRejectConfirm(true)}
            className="flex-1 flex items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800 font-medium mb-2">
            Reject this assignment?
          </p>
          <p className="text-xs text-red-600 mb-3">
            The servant will need to reassign this territory to another leader.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setShowRejectConfirm(false)}
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isRejecting && (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Confirm Reject
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
