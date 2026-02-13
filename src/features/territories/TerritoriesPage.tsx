import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Territory } from '../../shared/types'
import { useAuth } from '../../shared/hooks/useAuth'
import { subscribeToTerritories, subscribeToMyTerritories } from './territories.service'

export default function TerritoriesPage() {
  const { appUser } = useAuth()

  const [territories, setTerritories] = useState<Territory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const isLeader = appUser?.role === 'leader'

  useEffect(() => {
    if (!appUser) return

    // Leaders see only their assigned territories
    // Everyone else (admin, servant, publisher) sees all territories
    const unsubscribe = isLeader
      ? subscribeToMyTerritories(
          appUser.uid,
          (updated) => {
            setTerritories(updated)
            setIsLoading(false)
          },
          () => setIsLoading(false),
        )
      : subscribeToTerritories(
          (updated) => {
            setTerritories(updated)
            setIsLoading(false)
          },
          () => setIsLoading(false),
        )

    return () => unsubscribe()
  }, [appUser, isLeader])

  const inProgress = territories.filter((t) => t.status === 'in-progress')
  const completed = territories.filter((t) => t.status === 'completed')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isLeader ? 'My Territories' : 'Territories'}
        </h1>
        <p className="mt-1 text-gray-600">
          {isLeader
            ? 'Territories assigned to you. Tap a territory to view the card and submit reports.'
            : 'All announced territories. Tap a territory to view details.'}
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="ml-4 text-gray-600">Loading territories...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && territories.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
            />
          </svg>
          <p className="mt-4 text-gray-500">
            {isLeader
              ? 'No territories assigned to you yet.'
              : 'No territories have been announced yet.'}
          </p>
        </div>
      )}

      {/* Territory lists */}
      {!isLoading && territories.length > 0 && (
        <div className="space-y-8">
          {/* In-progress */}
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                In Progress ({inProgress.length})
              </h2>
              <div className="space-y-3">
                {inProgress.map((territory) => (
                  <TerritoryCard key={territory.id} territory={territory} isLeader={isLeader} />
                ))}
              </div>
            </section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Completed ({completed.length})
              </h2>
              <div className="space-y-3">
                {completed.map((territory) => (
                  <TerritoryCard key={territory.id} territory={territory} isLeader={isLeader} />
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
// Territory card row — clickable, links to detail page
// ---------------------------------------------------------------------------

function TerritoryCard({
  territory,
  isLeader,
}: {
  territory: Territory
  isLeader: boolean
}) {
  const statusColors: Record<string, string> = {
    'open': 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
  }

  const announcedDate = territory.announcedAt?.toDate?.()
  const dateStr = announcedDate
    ? announcedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'

  return (
    <Link
      to={`/territories/${territory.id}`}
      className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
    >
      {/* Card thumbnail */}
      {territory.card?.downloadUrl ? (
        <div className="h-16 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
          <img
            src={territory.card.downloadUrl}
            alt={territory.number}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="h-16 w-20 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center">
          <span className="text-xs text-gray-400">No card</span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900">{territory.number}</p>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              statusColors[territory.status] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {territory.status}
          </span>
        </div>
        <p className="text-sm text-gray-600 truncate">{territory.name}</p>
        {territory.currentAssignment && !isLeader && (
          <p className="text-xs text-gray-500 mt-1">
            Leader: <span className="font-medium">{territory.currentAssignment.leaderName}</span>
          </p>
        )}
      </div>

      {/* Meta + arrow */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="text-xs text-gray-400">{dateStr}</p>
          {territory.completionCount > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {territory.completionCount}x done
            </p>
          )}
        </div>
        <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  )
}
