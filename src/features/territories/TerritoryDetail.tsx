import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { Territory, Report } from '../../shared/types'
import { useAuth } from '../../shared/hooks/useAuth'
import { subscribeToTerritory, subscribeToReports } from './territories.service'
import ReportForm from './ReportForm'

export default function TerritoryDetail() {
  const { id } = useParams<{ id: string }>()
  const { appUser } = useAuth()

  const [territory, setTerritory] = useState<Territory | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  const [showReportForm, setShowReportForm] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Subscribe to territory document
  useEffect(() => {
    if (!id) return
    const unsubscribe = subscribeToTerritory(
      id,
      (t) => {
        setTerritory(t)
        setIsLoading(false)
      },
      () => setIsLoading(false),
    )
    return () => unsubscribe()
  }, [id])

  // Subscribe to reports subcollection
  useEffect(() => {
    if (!id) return
    const unsubscribe = subscribeToReports(
      id,
      (r) => {
        setReports(r)
        setIsLoadingReports(false)
      },
      () => setIsLoadingReports(false),
    )
    return () => unsubscribe()
  }, [id])

  function handleReportSuccess() {
    setShowReportForm(false)
    setSuccessMessage('Report submitted successfully!')
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // Determine if the current user can submit reports
  const canReport =
    appUser &&
    territory &&
    territory.status === 'in-progress' &&
    ['admin', 'servant', 'leader'].includes(appUser.role)

  // Is the user the assigned leader?
  const isAssignedLeader =
    appUser && territory?.currentAssignment?.leaderId === appUser.uid

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-600">Loading territory...</p>
        </div>
      </div>
    )
  }

  // Not found
  if (!territory) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Territory Not Found</h2>
          <p className="mt-2 text-gray-600">This territory may have been deleted.</p>
          <Link
            to="/territories"
            className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Back to Territories
          </Link>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    'open': 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
  }

  const announcedDate = territory.announcedAt?.toDate?.()
  const announcedStr = announcedDate
    ? announcedDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        to="/territories"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Territories
      </Link>

      {/* Territory header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{territory.number}</h1>
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                statusColors[territory.status] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {territory.status}
            </span>
          </div>
          <p className="mt-1 text-gray-600">{territory.name}</p>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: card image + territory info */}
        <div className="space-y-6">
          {/* Territory card image */}
          {territory.card?.downloadUrl && (
            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
              <img
                src={territory.card.downloadUrl}
                alt={`Territory card ${territory.number}`}
                className="w-full object-contain"
              />
            </div>
          )}

          {/* Territory info */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Territory Details</h2>
            <dl className="space-y-2 text-sm">
              {territory.description && (
                <div>
                  <dt className="text-gray-500">Description</dt>
                  <dd className="text-gray-900 mt-0.5">{territory.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Announced</dt>
                <dd className="text-gray-900 mt-0.5">
                  {announcedStr} by {territory.announcedBy?.name ?? '—'}
                </dd>
              </div>
              {territory.currentAssignment && (
                <div>
                  <dt className="text-gray-500">Assigned Leader</dt>
                  <dd className="text-gray-900 mt-0.5">
                    {territory.currentAssignment.leaderName}
                    {isAssignedLeader && (
                      <span className="ml-2 text-xs text-blue-600 font-medium">(You)</span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Times Completed</dt>
                <dd className="text-gray-900 mt-0.5">{territory.completionCount}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right column: report form + report history */}
        <div className="space-y-6">
          {/* Submit report section */}
          {canReport && (
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Submit Report</h2>
                <button
                  type="button"
                  onClick={() => setShowReportForm(!showReportForm)}
                  className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                    showReportForm
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {showReportForm ? 'Cancel' : '+ New Report'}
                </button>
              </div>

              {showReportForm && (
                <ReportForm territoryId={territory.id} onSuccess={handleReportSuccess} />
              )}

              {!showReportForm && !isAssignedLeader && (
                <p className="text-xs text-gray-500">
                  You can submit a report even though you're not the assigned leader.
                </p>
              )}
            </div>
          )}

          {/* Territory completed notice */}
          {territory.status === 'completed' && (
            <div className="rounded-md bg-green-50 border border-green-200 p-4">
              <p className="text-sm font-medium text-green-800">
                This territory has been completed.
              </p>
              {territory.lastCompletedAt?.toDate && (
                <p className="text-xs text-green-600 mt-1">
                  Completed on{' '}
                  {territory.lastCompletedAt.toDate().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          )}

          {/* Report history */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Report History ({reports.length})
            </h2>

            {isLoadingReports && (
              <div className="flex items-center gap-2 py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="text-sm text-gray-500">Loading reports...</span>
              </div>
            )}

            {!isLoadingReports && reports.length === 0 && (
              <p className="text-sm text-gray-500">No reports submitted yet.</p>
            )}

            {!isLoadingReports && reports.length > 0 && (
              <div className="space-y-3">
                {reports.map((report) => (
                  <ReportRow key={report.id} report={report} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Report row component
// ---------------------------------------------------------------------------

function ReportRow({ report }: { report: Report }) {
  const reportDate = report.reportedAt?.toDate?.()
  const dateStr = reportDate
    ? reportDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—'

  return (
    <div
      className={`rounded-md border p-3 ${
        report.completed
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-gray-700">
          {report.reportedBy?.name ?? 'Unknown'}
        </p>
        <div className="flex items-center gap-2">
          {report.completed && (
            <span className="inline-block rounded-full bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800">
              Final
            </span>
          )}
          <span className="text-xs text-gray-400">{dateStr}</span>
        </div>
      </div>
      <p className="text-sm text-gray-900 whitespace-pre-wrap">{report.remarks}</p>
    </div>
  )
}
