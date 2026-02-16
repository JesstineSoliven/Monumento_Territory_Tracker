import { useState, useEffect, useMemo } from 'react'
import {
  subscribeToPresentations,
  isEligible,
  normalizeOutlineKey,
} from './public-talks.service'
import type { PublicTalkPresentation } from '../../shared/types'

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}

function formatDate(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts?.toDate) return '\u2014'
  return ts.toDate().toLocaleDateString('en-US', DATE_OPTS)
}

export default function PublicTalkSearchPage() {
  const [presentations, setPresentations] = useState<PublicTalkPresentation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeToPresentations(
      (data) => {
        setPresentations(data)
        setIsLoading(false)
      },
      (err) => {
        setError(err.message)
        setIsLoading(false)
      },
    )
    return unsub
  }, [])

  // Group by outlineKey — show only the LATEST presentation per outline
  const latestByOutline = useMemo(() => {
    const map = new Map<string, PublicTalkPresentation>()
    for (const p of presentations) {
      const existing = map.get(p.outlineKey)
      if (
        !existing ||
        p.lastPresentedDate.toMillis() > existing.lastPresentedDate.toMillis()
      ) {
        map.set(p.outlineKey, p)
      }
    }
    return Array.from(map.values())
  }, [presentations])

  // Filter by search term (case-insensitive, partial match)
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return latestByOutline
    const normalized = normalizeOutlineKey(searchTerm)
    return latestByOutline.filter((p) => p.outlineKey.includes(normalized))
  }, [latestByOutline, searchTerm])

  // Sort: not-eligible first (upcoming), then eligible
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aEligible = isEligible(a.nextEligibleDate)
      const bEligible = isEligible(b.nextEligibleDate)
      if (aEligible !== bEligible) return aEligible ? 1 : -1
      return a.outlineTitle.localeCompare(b.outlineTitle)
    })
  }, [filtered])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Public Talk Outlines</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search for an outline to check eligibility. Outlines must wait 90 days before reassignment.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by outline title..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors duration-150"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm text-slate-500">Loading outlines...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && latestByOutline.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-slate-200 py-16 text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No outlines yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            An admin can import outline history from an Excel file.
          </p>
        </div>
      )}

      {/* No search results */}
      {!isLoading && !error && latestByOutline.length > 0 && sorted.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white py-12 text-center">
          <p className="text-sm text-slate-500">
            No outlines match "<span className="font-medium text-slate-700">{searchTerm}</span>"
          </p>
        </div>
      )}

      {/* Results table */}
      {!isLoading && sorted.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Outline Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Last Presented
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Presenter
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Next Eligible
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((p) => {
                  const eligible = isEligible(p.nextEligibleDate)
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 transition-colors duration-100"
                    >
                      <td className="px-4 py-3.5 text-sm font-medium text-slate-900">
                        {p.outlineTitle}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {formatDate(p.lastPresentedDate)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {p.presenterName}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {formatDate(p.nextEligibleDate)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            eligible
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          <span
                            className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                              eligible ? 'bg-green-500' : 'bg-orange-500'
                            }`}
                          />
                          {eligible ? 'Eligible' : 'Not Eligible Yet'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Result count */}
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5">
            <p className="text-xs text-slate-500">
              Showing {sorted.length} of {latestByOutline.length} outline{latestByOutline.length !== 1 ? 's' : ''}
              {searchTerm.trim() && ` matching "${searchTerm.trim()}"`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
