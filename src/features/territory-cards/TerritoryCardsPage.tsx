import { useState, useEffect } from 'react'
import { useAuth } from '../../shared/hooks/useAuth'
import {
  subscribeToTerritoryCards,
  toggleCardActive,
} from './territory-cards.service'
import CardUploader from './CardUploader'
import CardThumbnail from './CardThumbnail'
import type { TerritoryCard } from '../../shared/types'

export default function TerritoryCardsPage() {
  const { appUser } = useAuth()

  const [cards, setCards] = useState<TerritoryCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingCardId, setTogglingCardId] = useState<string | null>(null)

  // -------------------------------------------------------------------
  // Real-time subscription to territory cards
  // -------------------------------------------------------------------

  useEffect(() => {
    const unsubscribe = subscribeToTerritoryCards((updatedCards) => {
      setCards(updatedCards)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // -------------------------------------------------------------------
  // Toggle active/disabled
  // -------------------------------------------------------------------

  async function handleToggleActive(cardId: string, newValue: boolean) {
    setTogglingCardId(cardId)
    setError(null)
    try {
      await toggleCardActive(cardId, newValue)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update card status.',
      )
    } finally {
      setTogglingCardId(null)
    }
  }

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Territory Cards</h1>
        <p className="mt-2 text-gray-600">
          Upload and manage territory card images.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Upload section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Upload New Cards
        </h2>
        <CardUploader
          uploader={{
            uid: appUser!.uid,
            name: appUser!.displayName,
          }}
          onUploadComplete={() => {
            // Cards appear via real-time listener — no manual refetch needed
          }}
        />
      </div>

      <hr className="my-8 border-gray-200" />

      {/* Card gallery */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Uploaded Cards ({cards.length})
        </h2>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="ml-4 text-gray-600">Loading cards...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && cards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No territory cards uploaded yet.</p>
          </div>
        )}

        {/* Card grid */}
        {!isLoading && cards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
              <CardThumbnail
                key={card.id}
                card={card}
                onToggleActive={handleToggleActive}
                isToggling={togglingCardId === card.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
