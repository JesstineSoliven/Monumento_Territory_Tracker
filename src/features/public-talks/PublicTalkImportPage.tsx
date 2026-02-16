import { useState, useEffect, useRef, useCallback } from 'react'
import { read, utils } from 'xlsx'
import { useAuth } from '../../shared/hooks/useAuth'
import {
  importPresentations,
  subscribeToPresentations,
  findDuplicatesInExisting,
} from './public-talks.service'
import type { ImportRow, ImportResult } from './public-talks.service'
import type { PublicTalkPresentation } from '../../shared/types'

// ---------------------------------------------------------------------------
// Date parsing helper — handles common Excel date formats safely
// ---------------------------------------------------------------------------

function parseExcelDate(value: unknown): Date | null {
  if (value == null) return null

  // xlsx may return a JS Date directly for date-formatted cells
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }

  // xlsx may return a number (Excel serial date)
  if (typeof value === 'number') {
    // Excel epoch is Jan 1, 1900. Day 1 = 1900-01-01.
    // The xlsx library typically converts serial dates to JS dates,
    // but handle raw numbers just in case.
    const excelEpoch = new Date(1899, 11, 30) // Dec 30, 1899
    const result = new Date(excelEpoch.getTime() + value * 86400000)
    return isNaN(result.getTime()) ? null : result
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    // Try standard Date.parse
    const parsed = new Date(trimmed)
    if (!isNaN(parsed.getTime())) return parsed

    // Try common formats: MM/DD/YYYY, DD/MM/YYYY, YYYY/MM/DD
    const parts = trimmed.split(/[/\-.]/)
    if (parts.length === 3) {
      const [a, b, c] = parts.map(Number)
      // MM/DD/YYYY
      if (a >= 1 && a <= 12 && b >= 1 && b <= 31 && c >= 1900) {
        const d = new Date(c, a - 1, b)
        if (!isNaN(d.getTime())) return d
      }
      // YYYY/MM/DD
      if (a >= 1900 && b >= 1 && b <= 12 && c >= 1 && c <= 31) {
        const d = new Date(a, b - 1, c)
        if (!isNaN(d.getTime())) return d
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PublicTalkImportPage() {
  const { appUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [existingPresentations, setExistingPresentations] = useState<PublicTalkPresentation[]>([])
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set())

  // Subscribe to existing data to detect duplicates
  useEffect(() => {
    const unsub = subscribeToPresentations((data) => {
      setExistingPresentations(data)
    })
    return unsub
  }, [])

  // Check for duplicates whenever parsed rows or existing data changes
  useEffect(() => {
    if (parsedRows.length > 0 && existingPresentations.length > 0) {
      const dupes = findDuplicatesInExisting(existingPresentations, parsedRows)
      setDuplicateIndices(dupes)
    } else {
      setDuplicateIndices(new Set())
    }
  }, [parsedRows, existingPresentations])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setImportResult(null)
    setParsedRows([])
    setParseErrors([])
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = read(data, { type: 'array', cellDates: true })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

        if (json.length === 0) {
          setError('The file contains no data rows.')
          return
        }

        const rows: ImportRow[] = []
        const errors: string[] = []

        for (let i = 0; i < json.length; i++) {
          const row = json[i]
          const rowNum = i + 2 // Excel rows are 1-indexed, +1 for header

          // Get values by column position (first 3 columns)
          const keys = Object.keys(row)
          const outlineTitle = String(row[keys[0]] ?? '').trim()
          const dateRaw = row[keys[1]]
          const presenterName = String(row[keys[2]] ?? '').trim()

          if (!outlineTitle) {
            errors.push(`Row ${rowNum}: Empty outline title`)
            continue
          }

          const parsedDate = parseExcelDate(dateRaw)
          if (!parsedDate) {
            errors.push(`Row ${rowNum}: Invalid date "${String(dateRaw)}"`)
            continue
          }

          if (!presenterName) {
            errors.push(`Row ${rowNum}: Empty presenter name`)
            continue
          }

          rows.push({ outlineTitle, lastPresentedDate: parsedDate, presenterName })
        }

        setParsedRows(rows)
        setParseErrors(errors)
      } catch (err) {
        setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
    reader.readAsArrayBuffer(file)

    // Reset input so the same file can be re-selected
    e.target.value = ''
  }, [])

  const handleImport = useCallback(async () => {
    if (!appUser || parsedRows.length === 0) return

    // Filter out rows that are duplicates in existing Firestore data
    const rowsToImport = parsedRows.filter((_, i) => !duplicateIndices.has(i))

    if (rowsToImport.length === 0) {
      setError('All rows are duplicates of existing records. Nothing to import.')
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      const result = await importPresentations(rowsToImport, appUser.uid)

      // Adjust counts to include the Firestore-level duplicates we skipped
      result.totalRows = parsedRows.length
      result.skipped += duplicateIndices.size

      setImportResult(result)
      setParsedRows([])
      setFileName(null)
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsImporting(false)
    }
  }, [appUser, parsedRows, duplicateIndices])

  const handleReset = useCallback(() => {
    setParsedRows([])
    setParseErrors([])
    setFileName(null)
    setImportResult(null)
    setError(null)
    setDuplicateIndices(new Set())
  }, [])

  const DATE_OPTS: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Import Public Talk History</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload an Excel (.xlsx) or CSV file with 3 columns: Outline Title, Last Date Presented, Presenter Name.
        </p>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-green-800 mb-2">Import Complete</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md bg-white border border-green-200 px-3 py-2 text-center">
              <p className="text-lg font-bold text-slate-900">{importResult.totalRows}</p>
              <p className="text-xs text-slate-500">Total Rows</p>
            </div>
            <div className="rounded-md bg-white border border-green-200 px-3 py-2 text-center">
              <p className="text-lg font-bold text-green-600">{importResult.successful}</p>
              <p className="text-xs text-slate-500">Imported</p>
            </div>
            <div className="rounded-md bg-white border border-green-200 px-3 py-2 text-center">
              <p className="text-lg font-bold text-orange-600">{importResult.skipped}</p>
              <p className="text-xs text-slate-500">Skipped</p>
            </div>
            <div className="rounded-md bg-white border border-green-200 px-3 py-2 text-center">
              <p className="text-lg font-bold text-red-600">{importResult.errors.length}</p>
              <p className="text-xs text-slate-500">Errors</p>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="mt-3 max-h-32 overflow-y-auto rounded-md bg-red-50 border border-red-200 p-2">
              {importResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-700">{err}</p>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="mt-3 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors duration-150"
          >
            Import Another File
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* File upload area */}
      {!importResult && (
        <>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mb-6 cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors duration-200"
          >
            <svg
              className="mx-auto h-10 w-10 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-700">
              {fileName ? fileName : 'Click to select an Excel or CSV file'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Accepts .xlsx and .csv files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Preview table */}
          {parsedRows.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Preview ({parsedRows.length} valid row{parsedRows.length !== 1 ? 's' : ''})
                  {duplicateIndices.size > 0 && (
                    <span className="ml-2 text-orange-600 font-normal">
                      ({duplicateIndices.size} duplicate{duplicateIndices.size !== 1 ? 's' : ''} will be skipped)
                    </span>
                  )}
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-150"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting}
                    className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150"
                  >
                    {isImporting && (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                    {isImporting ? 'Importing...' : `Import ${parsedRows.length - duplicateIndices.size} Row${parsedRows.length - duplicateIndices.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
                <div className="max-h-80 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          #
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Outline Title
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Last Presented
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Presenter
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((row, i) => {
                        const isDupe = duplicateIndices.has(i)
                        return (
                          <tr
                            key={i}
                            className={isDupe ? 'bg-orange-50/50' : 'hover:bg-slate-50'}
                          >
                            <td className="px-4 py-2.5 text-xs text-slate-400">{i + 1}</td>
                            <td className="px-4 py-2.5 text-sm text-slate-900">{row.outlineTitle}</td>
                            <td className="px-4 py-2.5 text-sm text-slate-600">
                              {row.lastPresentedDate.toLocaleDateString('en-US', DATE_OPTS)}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-slate-600">{row.presenterName}</td>
                            <td className="px-4 py-2.5">
                              {isDupe ? (
                                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                                  Duplicate
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                  Ready
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h3 className="text-sm font-semibold text-orange-800 mb-2">
                Parse Warnings ({parseErrors.length})
              </h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {parseErrors.map((err, i) => (
                  <p key={i} className="text-xs text-orange-700">{err}</p>
                ))}
              </div>
            </div>
          )}

          {/* Format guide */}
          {parsedRows.length === 0 && !fileName && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Expected File Format</h3>
              <div className="overflow-x-auto">
                <table className="text-xs text-slate-600 border border-slate-200 rounded">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-1.5 text-left font-medium">Column A</th>
                      <th className="px-3 py-1.5 text-left font-medium">Column B</th>
                      <th className="px-3 py-1.5 text-left font-medium">Column C</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-200">
                      <td className="px-3 py-1.5">Outline Title</td>
                      <td className="px-3 py-1.5">Last Date Presented</td>
                      <td className="px-3 py-1.5">Presenter Name</td>
                    </tr>
                    <tr className="border-t border-slate-100 text-slate-400 italic">
                      <td className="px-3 py-1.5">Be Zealous for Fine Works</td>
                      <td className="px-3 py-1.5">01/15/2026</td>
                      <td className="px-3 py-1.5">Bro. Santos</td>
                    </tr>
                    <tr className="border-t border-slate-100 text-slate-400 italic">
                      <td className="px-3 py-1.5">Maintain Inner Peace</td>
                      <td className="px-3 py-1.5">12/20/2025</td>
                      <td className="px-3 py-1.5">Bro. Reyes</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                The first row should be headers. Dates can be in most common formats.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
