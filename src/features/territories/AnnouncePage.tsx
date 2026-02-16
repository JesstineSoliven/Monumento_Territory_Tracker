import { useState, useEffect } from 'react'
import type { Territory, ReportStatus } from '../../shared/types'
import { subscribeToTerritories, deriveReportStatus } from './territories.service'
import AnnounceForm from './AnnounceForm'

export default function AnnouncePage() {
  const [territories, setTerritories] = useState<Territory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToTerritories((updated) => {
      setTerritories(updated)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [])

  function handleSuccess() {
    setShowForm(false)
    setSuccessMessage('Territory announced successfully!')
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const inProgress = territories.filter((t) => t.status === 'in-progress')
  const completed = territories.filter((t) => t.status === 'completed')

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announce Territories</h1>
          <p className="mt-1 text-slate-600">
            Select a territory card and assign a leader to announce a territory.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            showForm
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {showForm ? 'Cancel' : '+ New Announcement'}
        </button>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Announce form */}
      {showForm && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            New Territory Announcement
          </h2>
          <AnnounceForm onSuccess={handleSuccess} />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="ml-4 text-slate-600">Loading territories...</p>
        </div>
      )}

      {/* Announced territories list */}
      {!isLoading && (
        <div className="space-y-8">
          {/* In-progress territories */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              In Progress ({inProgress.length})
            </h2>
            {inProgress.length === 0 ? (
              <p className="text-sm text-slate-500">No territories currently in progress.</p>
            ) : (
              <div className="space-y-3">
                {inProgress.map((territory) => (
                  <TerritoryRow key={territory.id} territory={territory} />
                ))}
              </div>
            )}
          </section>

          {/* Completed territories */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Completed ({completed.length})
              </h2>
              <div className="space-y-3">
                {completed.map((territory) => (
                  <TerritoryRow key={territory.id} territory={territory} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Territory row component
// ---------------------------------------------------------------------------

function TerritoryRow({ territory }: { territory: Territory }) {
  const statusColors: Record<string, string> = {
    'announced': 'bg-amber-100 text-amber-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
  }

  const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }

  const announcedDate = territory.announcedAt?.toDate?.()
  const dateStr = announcedDate ? announcedDate.toLocaleDateString('en-US', dateOpts) : '—'

  const targetDate = territory.targetCompletionDate?.toDate?.()
  const targetStr = targetDate ? targetDate.toLocaleDateString('en-US', dateOpts) : null

  // Check if overdue (target date has passed and territory is still in-progress)
  const isOverdue =
    territory.status === 'in-progress' &&
    targetDate != null &&
    targetDate < new Date()

  return (
    <div className={`flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm ${
      isOverdue ? 'border-red-300' : 'border-slate-200'
    }`}>
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
          <span className="text-xs text-slate-400">No card</span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-900">{territory.number}</p>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              statusColors[territory.status] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {territory.status}
          </span>
          {isOverdue && (
            <span className="inline-block rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
              Overdue
            </span>
          )}
          <ReportStatusBadge status={deriveReportStatus(territory)} />
        </div>
        <p className="text-sm text-slate-600 truncate">{territory.name}</p>
        {territory.currentAssignment && (
          <p className="text-xs text-slate-500 mt-1">
            Assigned to: <span className="font-medium">{territory.currentAssignment.leaderName}</span>
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-slate-400">{dateStr}</p>
        {targetStr && (
          <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
            Due: {targetStr}
          </p>
        )}
        {territory.actualCompletionDate?.toDate && (
          <p className="text-xs text-slate-400 mt-0.5">
            Done: {territory.actualCompletionDate.toDate().toLocaleDateString('en-US', dateOpts)}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-0.5">
          by {territory.announcedBy?.name ?? '—'}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Report status badge component
// ---------------------------------------------------------------------------

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const styles: Record<ReportStatus, string> = {
    on_time: 'bg-green-100 text-green-800',
    late: 'bg-amber-100 text-amber-800',
    missing: 'bg-red-100 text-red-800',
  }

  const labels: Record<ReportStatus, string> = {
    on_time: 'On Time',
    late: 'Late',
    missing: 'Missing',
  }

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
