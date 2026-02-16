import { useState, useEffect, useMemo } from 'react'
import type { Territory, ReportStatus } from '../../shared/types'
import {
  subscribeToTerritories,
  buildMonthlyExport,
  exportToCSV,
  deriveReportStatus,
} from './territories.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

function filterByMonth(territories: Territory[], monthValue: string): Territory[] {
  const [year, month] = monthValue.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  return territories.filter((t) => {
    const announced = t.announcedAt?.toDate?.()
    if (!announced) return false
    return announced >= start && announced < end
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MonthlyReportPage() {
  const [allTerritories, setAllTerritories] = useState<Territory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const monthOptions = useMemo(() => getMonthOptions(), [])
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? '')

  useEffect(() => {
    const unsubscribe = subscribeToTerritories((updated) => {
      setAllTerritories(updated)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const filtered = useMemo(
    () => filterByMonth(allTerritories, selectedMonth),
    [allTerritories, selectedMonth],
  )

  const { rows, summary } = useMemo(() => buildMonthlyExport(filtered), [filtered])

  const selectedLabel = monthOptions.find((o) => o.value === selectedMonth)?.label ?? selectedMonth

  function handleExport() {
    exportToCSV(rows, summary, selectedMonth)
  }

  const dateOpts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Monthly Report</h1>
          <p className="mt-1 text-slate-600">
            View territory report status and export monthly data.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150"
        >
          Export CSV
        </button>
      </div>

      {/* Month selector */}
      <div className="mb-6">
        <label htmlFor="monthSelect" className="block text-sm font-medium text-slate-700 mb-1">
          Select Month
        </label>
        <select
          id="monthSelect"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Total" value={summary.total} color="gray" />
        <SummaryCard label="On Time" value={summary.onTime} color="green" />
        <SummaryCard label="Late" value={summary.late} color="orange" />
        <SummaryCard label="Missing" value={summary.missing} color="red" />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="ml-4 text-slate-600">Loading...</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No territories announced in {selectedLabel}.</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left sticky top-0 z-10">
                <th className="px-4 py-3 font-semibold text-slate-700">Territory</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Leader</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Target Date</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Actual Date</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Report Submitted</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => {
                const status = deriveReportStatus(t)
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{t.number}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{t.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {t.currentAssignment?.leaderName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {t.targetCompletionDate?.toDate?.()
                        ? t.targetCompletionDate.toDate().toLocaleDateString('en-US', dateOpts)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {t.actualCompletionDate?.toDate?.()
                        ? t.actualCompletionDate.toDate().toLocaleDateString('en-US', dateOpts)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {t.reportSubmittedAt?.toDate?.()
                        ? t.reportSubmittedAt.toDate().toLocaleDateString('en-US', dateOpts)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'gray' | 'green' | 'orange' | 'red'
}) {
  const styles = {
    gray: 'bg-slate-50 border-slate-200 text-slate-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  }

  return (
    <div className={`rounded-lg border p-4 shadow-card ${styles[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: ReportStatus }) {
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
