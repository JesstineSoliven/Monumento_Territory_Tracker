import { useState, useEffect, useCallback } from 'react'
import {
  fetchResetPreview,
  performSystemReset,
  type ResetPreview,
  type ResetProgress,
  type ResetResult,
} from './admin.service'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIRMATION_PHRASE = 'RESET ALL DATA'

const PHASE_LABELS: Record<ResetProgress['phase'], string> = {
  reports: 'Deleting reports...',
  territories: 'Deleting territories...',
  'cards-storage': 'Cleaning card storage...',
  'cards-firestore': 'Cleaning card records...',
  'unlink-cards': 'Unlinking territory cards...',
  done: 'Complete',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SystemResetPage() {
  const [preview, setPreview] = useState<ResetPreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [confirmText, setConfirmText] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const [isResetting, setIsResetting] = useState(false)
  const [progress, setProgress] = useState<ResetProgress | null>(null)
  const [result, setResult] = useState<ResetResult | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)

  // Load preview counts on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await fetchResetPreview()
        if (!cancelled) {
          setPreview(data)
          setIsLoadingPreview(false)
        }
      } catch (err) {
        if (!cancelled) {
          setPreviewError(err instanceof Error ? err.message : 'Failed to load data.')
          setIsLoadingPreview(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleProgress = useCallback((p: ResetProgress) => {
    setProgress(p)
  }, [])

  async function handleReset() {
    if (confirmText !== CONFIRMATION_PHRASE) return

    setIsResetting(true)
    setResetError(null)
    setResult(null)

    try {
      const res = await performSystemReset(handleProgress)
      setResult(res)
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'System reset failed.')
    } finally {
      setIsResetting(false)
      setShowConfirm(false)
      setConfirmText('')
      // Reload preview counts
      try {
        const data = await fetchResetPreview()
        setPreview(data)
      } catch {
        // ignore — stale counts are acceptable post-reset
      }
    }
  }

  const isConfirmValid = confirmText === CONFIRMATION_PHRASE
  const hasData = preview && preview.territoriesCount > 0

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Reset</h1>
        <p className="mt-1 text-slate-600">
          Clear all territory announcements, reports, and historical data. This action is irreversible.
        </p>
      </div>

      {/* Success result */}
      {result && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm font-semibold text-green-800">System Reset Complete</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-700">{result.territoriesDeleted}</p>
              <p className="text-xs text-green-600">Territories deleted</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{result.reportsDeleted}</p>
              <p className="text-xs text-green-600">Reports deleted</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{result.cardsUnlinked}</p>
              <p className="text-xs text-green-600">Cards unlinked</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-800 mb-1">
                {result.errors.length} non-critical error(s):
              </p>
              <ul className="text-xs text-amber-700 space-y-0.5">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Reset error */}
      {resetError && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{resetError}</p>
        </div>
      )}

      {/* Preview error */}
      {previewError && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{previewError}</p>
        </div>
      )}

      {/* Loading preview */}
      {isLoadingPreview && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="ml-4 text-slate-600">Loading system data...</p>
        </div>
      )}

      {/* Main content — only when preview loaded */}
      {!isLoadingPreview && preview && (
        <>
          {/* Warning panel */}
          <div className="rounded-lg border-2 border-red-300 bg-red-50 p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 rounded-full bg-red-100 p-2">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-red-900">Danger Zone</h2>
                <p className="mt-1 text-sm text-red-800">
                  This will permanently delete all territory announcements, assignments, and report history.
                  This action <strong>cannot be undone</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* What will be affected */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm mb-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">What will be affected</h3>

            <div className="space-y-3">
              {/* Will be deleted */}
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {preview.territoriesCount} territory announcement{preview.territoriesCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    All announcements (in-progress, completed, rejected) and their report history will be permanently deleted.
                  </p>
                </div>
              </div>

              {/* Will be unlinked */}
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.181 8.68a4.503 4.503 0 011.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 006.364 6.365l3.129-3.129m5.614-5.615l1.757-1.757a4.5 4.5 0 00-6.364-6.365l-3.129 3.129" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {preview.linkedCardsCount} territory card{preview.linkedCardsCount !== 1 ? 's' : ''} will be unlinked
                  </p>
                  <p className="text-xs text-slate-500">
                    Card images and metadata are preserved. Cards become available for new announcements.
                  </p>
                </div>
              </div>

              {/* Will be preserved */}
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-900">Preserved (not affected)</p>
                  <p className="text-xs text-slate-500">
                    User accounts, roles, territory card images, and Firebase Auth accounts remain intact.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* No data state */}
          {!hasData && !result && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="mt-4 text-sm text-slate-500">No territory data to reset.</p>
            </div>
          )}

          {/* Reset button + confirmation flow */}
          {hasData && !isResetting && !result && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              {!showConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.98] transition-all"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Reset All Territory Data
                </button>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-shrink-0 rounded-full bg-red-100 p-1.5">
                      <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-red-900">Confirm System Reset</h3>
                  </div>

                  <p className="text-sm text-slate-700 mb-4">
                    Type <code className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-mono font-bold text-red-800">{CONFIRMATION_PHRASE}</code> to confirm:
                  </p>

                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRMATION_PHRASE}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none mb-4"
                    autoComplete="off"
                    spellCheck={false}
                  />

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowConfirm(false); setConfirmText('') }}
                      className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!isConfirmValid}
                      onClick={handleReset}
                      className="flex-1 rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Permanently Delete All Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress indicator */}
          {isResetting && progress && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="text-sm font-semibold text-blue-800">
                  {PHASE_LABELS[progress.phase]}
                </p>
              </div>

              {progress.total > 0 && (
                <>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600">
                    {progress.current} / {progress.total}
                  </p>
                </>
              )}

              {progress.errors.length > 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  {progress.errors.length} error(s) encountered (will continue)
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
