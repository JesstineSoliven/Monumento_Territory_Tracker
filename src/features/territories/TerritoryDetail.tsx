import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { Territory, Report, ReportStatus } from '../../shared/types'
import { useAuth } from '../../shared/hooks/useAuth'
import { subscribeToTerritory, subscribeToReports, deriveReportStatus } from './territories.service'
import ReportForm from './ReportForm'
import SafeImage from '../../shared/components/SafeImage'

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
    !territory.reportSubmitted &&
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
          <p className="mt-4 text-slate-600">Loading territory...</p>
        </div>
      </div>
    )
  }

  // Not found
  if (!territory) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-slate-900">Territory Not Found</h2>
          <p className="mt-2 text-slate-600">This territory may have been deleted.</p>
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
    'announced': 'bg-amber-100 text-amber-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
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
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Back link */}
      <Link
        to="/territories"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
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
            <h1 className="text-2xl font-bold text-slate-900">{territory.number}</h1>
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                statusColors[territory.status] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {territory.status}
            </span>
          </div>
          <p className="mt-1 text-slate-600">{territory.name}</p>
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
          {territory.card && (
            <SafeImage
              src={territory.card.downloadUrl}
              alt={`Territory card ${territory.number}`}
              className="w-full object-contain"
              containerClassName="relative rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm"
            />
          )}

          {/* Territory info */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Territory Details</h2>
            <dl className="space-y-2 text-sm">
              {territory.description && (
                <div>
                  <dt className="text-slate-500">Description</dt>
                  <dd className="text-slate-900 mt-0.5">{territory.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Announced</dt>
                <dd className="text-slate-900 mt-0.5">
                  {announcedStr} by {territory.announcedBy?.name ?? '—'}
                </dd>
              </div>
              {territory.targetCompletionDate?.toDate && (
                <div>
                  <dt className="text-slate-500">Target Completion</dt>
                  <dd className={`mt-0.5 ${
                    territory.status === 'in-progress' &&
                    territory.targetCompletionDate.toDate() < new Date()
                      ? 'text-red-600 font-medium'
                      : 'text-slate-900'
                  }`}>
                    {territory.targetCompletionDate.toDate().toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {territory.status === 'in-progress' &&
                      territory.targetCompletionDate.toDate() < new Date() && (
                        <span className="ml-2 text-xs text-red-500">(Overdue)</span>
                      )}
                  </dd>
                </div>
              )}
              {territory.currentAssignment && (
                <div>
                  <dt className="text-slate-500">Assigned Leader</dt>
                  <dd className="text-slate-900 mt-0.5">
                    {territory.currentAssignment.leaderName}
                    {isAssignedLeader && (
                      <span className="ml-2 text-xs text-blue-600 font-medium">(You)</span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Times Completed</dt>
                <dd className="text-slate-900 mt-0.5">{territory.completionCount}</dd>
              </div>
              {/* Report status */}
              <div>
                <dt className="text-slate-500">Report Status</dt>
                <dd className="mt-0.5">
                  <ReportStatusBadge status={deriveReportStatus(territory)} />
                </dd>
              </div>
              {/* Actual completion date */}
              {territory.actualCompletionDate?.toDate && (
                <div>
                  <dt className="text-slate-500">Actual Completion</dt>
                  <dd className="text-slate-900 mt-0.5">
                    {territory.actualCompletionDate.toDate().toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
              {/* Report submitted at */}
              {territory.reportSubmittedAt?.toDate && (
                <div>
                  <dt className="text-slate-500">Report Submitted</dt>
                  <dd className="text-slate-900 mt-0.5">
                    {territory.reportSubmittedAt.toDate().toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Right column: report form + report history */}
        <div className="space-y-6">
          {/* Submit report section */}
          {canReport && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Submit Report</h2>
                <button
                  type="button"
                  onClick={() => setShowReportForm(!showReportForm)}
                  className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                    showReportForm
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {showReportForm ? 'Cancel' : '+ New Report'}
                </button>
              </div>

              {showReportForm && (
                <ReportForm territoryId={territory.id} territory={territory} onSuccess={handleReportSuccess} />
              )}

              {!showReportForm && !isAssignedLeader && (
                <p className="text-xs text-slate-500">
                  You can submit a report even though you're not the assigned leader.
                </p>
              )}
            </div>
          )}

          {/* Territory completed notice */}
          {territory.status === 'completed' && (
            <div className="rounded-md bg-green-50 border border-green-200 p-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-green-800">
                  This territory has been completed.
                </p>
                <ReportStatusBadge status={deriveReportStatus(territory)} />
              </div>
              {territory.actualCompletionDate?.toDate && (
                <p className="text-xs text-green-600 mt-1">
                  Completed on{' '}
                  {territory.actualCompletionDate.toDate().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          )}

          {/* Report already submitted notice */}
          {territory.reportSubmitted && territory.status === 'in-progress' && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm font-medium text-blue-800">
                A final report has already been submitted for this territory.
              </p>
            </div>
          )}

          {/* Report history */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Report History ({reports.length})
            </h2>

            {isLoadingReports && (
              <div className="flex items-center gap-2 py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="text-sm text-slate-500">Loading reports...</span>
              </div>
            )}

            {!isLoadingReports && reports.length === 0 && (
              <p className="text-sm text-slate-500">No reports submitted yet.</p>
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
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-slate-700">
          {report.reportedBy?.name ?? 'Unknown'}
        </p>
        <div className="flex items-center gap-2">
          {report.completed && (
            <span className="inline-block rounded-full bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800">
              Final
            </span>
          )}
          <span className="text-xs text-slate-400">{dateStr}</span>
        </div>
      </div>
      {report.actualCompletionDate?.toDate && (
        <p className="text-xs text-slate-500 mt-1">
          Completed: {report.actualCompletionDate.toDate().toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </p>
      )}
      <p className="text-sm text-slate-900 whitespace-pre-wrap mt-1">{report.remarks}</p>
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
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
