import { useState, useEffect, type FormEvent } from 'react'
import type { TerritoryCard, AppUser } from '../../shared/types'
import { useAuth } from '../../shared/hooks/useAuth'
import CardPicker from '../territory-cards/CardPicker'
import {
  announceTerritory,
  subscribeToLeaders,
} from './territories.service'

export default function AnnounceForm({ onSuccess }: { onSuccess: () => void }) {
  const { appUser } = useAuth()

  // Form state
  const [selectedCard, setSelectedCard] = useState<TerritoryCard | null>(null)
  const [selectedLeaderId, setSelectedLeaderId] = useState('')
  const [description, setDescription] = useState('')

  // Leaders data
  const [leaders, setLeaders] = useState<AppUser[]>([])
  const [isLoadingLeaders, setIsLoadingLeaders] = useState(true)

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToLeaders((updatedLeaders) => {
      setLeaders(updatedLeaders)
      setIsLoadingLeaders(false)
    })
    return () => unsubscribe()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedCard || !selectedLeaderId || !appUser) return

    const leader = leaders.find((l) => l.uid === selectedLeaderId)
    if (!leader) return

    setIsSubmitting(true)
    setError(null)

    try {
      await announceTerritory({
        card: selectedCard,
        leaderId: leader.uid,
        leaderName: leader.displayName,
        description,
        announcedBy: {
          uid: appUser.uid,
          name: appUser.displayName,
        },
      })

      // Reset form
      setSelectedCard(null)
      setSelectedLeaderId('')
      setDescription('')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to announce territory.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = selectedCard !== null && selectedLeaderId !== ''

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Step 1: Select territory card */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          1. Select a Territory Card
        </label>
        <CardPicker
          selectedCardId={selectedCard?.id ?? null}
          onSelect={setSelectedCard}
        />
        {selectedCard && (
          <div className="mt-3 rounded-md bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-800">
              Selected: <span className="font-semibold">{selectedCard.territoryNumber}</span> — {selectedCard.label}
            </p>
            {selectedCard.territoryOwner && (
              <p className="text-xs text-blue-600 mt-1">Owner: {selectedCard.territoryOwner}</p>
            )}
            {selectedCard.characteristic && (
              <p className="text-xs text-blue-600">Type: {selectedCard.characteristic}</p>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Assign leader */}
      <div>
        <label htmlFor="leader" className="block text-sm font-medium text-gray-700 mb-1">
          2. Assign a Leader
        </label>
        {isLoadingLeaders ? (
          <div className="flex items-center gap-2 py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm text-gray-500">Loading leaders...</span>
          </div>
        ) : leaders.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">
            No active leaders found. Ask an admin to assign the leader role to users.
          </p>
        ) : (
          <select
            id="leader"
            value={selectedLeaderId}
            onChange={(e) => setSelectedLeaderId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">— Select a leader —</option>
            {leaders.map((leader) => (
              <option key={leader.uid} value={leader.uid}>
                {leader.displayName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Step 3: Description (optional) */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          3. Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any special instructions or notes about this territory..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {isSubmitting ? 'Announcing...' : 'Announce Territory'}
      </button>
    </form>
  )
}
