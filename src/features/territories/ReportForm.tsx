import { useState, type FormEvent } from 'react'
import { useAuth } from '../../shared/hooks/useAuth'
import { submitReport } from './territories.service'
import type { Territory } from '../../shared/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns today's date as YYYY-MM-DD string (local timezone) */
function getTodayString(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

/** Parses a YYYY-MM-DD string into a Date at midnight local time */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Formats a Timestamp to YYYY-MM-DD */
function timestampToDateStr(ts: { toDate: () => Date } | null | undefined): string | null {
  if (!ts?.toDate) return null
  const d = ts.toDate()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReportFormProps {
  territoryId: string
  territory: Territory
  onSuccess: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportForm({ territoryId, territory, onSuccess }: ReportFormProps) {
  const { appUser } = useAuth()

  const [remarks, setRemarks] = useState('')
  const [completed, setCompleted] = useState(false)
  const [actualCompletionDate, setActualCompletionDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = getTodayString()
  const announcedDateStr = timestampToDateStr(territory.announcedAt)
  const targetDateStr = timestampToDateStr(territory.targetCompletionDate)

  // Validation
  const dateValidationError = (() => {
    if (!actualCompletionDate) return null

    const selected = parseLocalDate(actualCompletionDate)
    const todayDate = parseLocalDate(today)

    // Cannot be future date
    if (selected > todayDate) return 'Completion date cannot be in the future.'

    // Cannot be before announcement date
    if (announcedDateStr) {
      const announced = parseLocalDate(announcedDateStr)
      if (selected < announced) return 'Completion date cannot be before the announcement date.'
    }

    return null
  })()

  // Late warning
  const isLate = (() => {
    if (!actualCompletionDate || !targetDateStr) return false
    const selected = parseLocalDate(actualCompletionDate)
    const target = parseLocalDate(targetDateStr)
    return selected > target
  })()

  const isFormValid =
    remarks.trim() !== '' &&
    completed &&
    actualCompletionDate !== '' &&
    dateValidationError === null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!appUser || !isFormValid) return

    setIsSubmitting(true)
    setError(null)

    try {
      await submitReport({
        territoryId,
        reportedBy: {
          uid: appUser.uid,
          name: appUser.displayName,
        },
        completed,
        remarks: remarks.trim(),
        actualCompletionDate: parseLocalDate(actualCompletionDate),
      })

      setRemarks('')
      setCompleted(false)
      setActualCompletionDate('')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Completed toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <span className="text-sm font-medium text-slate-700">
            Mark territory as completed
          </span>
          <p className="text-xs text-slate-500">
            Required. Check this to submit a final report.
          </p>
        </div>
      </label>

      {/* Actual completion date */}
      {completed && (
        <div>
          <label htmlFor="actualCompletionDate" className="block text-sm font-medium text-slate-700 mb-1">
            Date Territory Was Completed <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="actualCompletionDate"
            required
            value={actualCompletionDate}
            max={today}
            min={announcedDateStr ?? undefined}
            onChange={(e) => setActualCompletionDate(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 ${
              dateValidationError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          {dateValidationError && (
            <p className="mt-1 text-xs text-red-600">{dateValidationError}</p>
          )}
          {!dateValidationError && isLate && (
            <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Late report:</span> This date is after the target
                completion date ({targetDateStr ? parseLocalDate(targetDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}).
                The report will be tagged as late.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Remarks */}
      {completed && (
        <div>
          <label htmlFor="remarks" className="block text-sm font-medium text-slate-700 mb-1">
            Remarks <span className="text-red-500">*</span>
          </label>
          <textarea
            id="remarks"
            rows={4}
            required
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Describe what was covered, any issues encountered, streets worked, etc."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
          />
        </div>
      )}

      {/* Completed warning */}
      {completed && actualCompletionDate && !dateValidationError && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800">
            This will mark the territory as <strong>completed</strong> and submit the final report.
            This action cannot be undone.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !isFormValid}
        className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {isSubmitting ? 'Submitting...' : 'Submit Final Report'}
      </button>
    </form>
  )
}
