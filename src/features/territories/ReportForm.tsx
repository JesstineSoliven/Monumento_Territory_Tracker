import { useState, type FormEvent } from 'react'
import { useAuth } from '../../shared/hooks/useAuth'
import { submitReport } from './territories.service'

interface ReportFormProps {
  territoryId: string
  onSuccess: () => void
}

export default function ReportForm({ territoryId, onSuccess }: ReportFormProps) {
  const { appUser } = useAuth()

  const [remarks, setRemarks] = useState('')
  const [completed, setCompleted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!appUser || !remarks.trim()) return

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
      })

      setRemarks('')
      setCompleted(false)
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

      {/* Remarks */}
      <div>
        <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
          Remarks
        </label>
        <textarea
          id="remarks"
          rows={4}
          required
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Describe what was covered, any issues encountered, streets worked, etc."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
        />
      </div>

      {/* Completed toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <span className="text-sm font-medium text-gray-700">
            Mark territory as completed
          </span>
          <p className="text-xs text-gray-500">
            Check this if the entire territory has been fully worked.
            Leave unchecked for partial progress reports.
          </p>
        </div>
      </label>

      {/* Completed warning */}
      {completed && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800">
            This will mark the territory as <strong>completed</strong>. This action records a final report.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !remarks.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {isSubmitting ? 'Submitting...' : completed ? 'Submit Final Report' : 'Submit Progress Report'}
      </button>
    </form>
  )
}
