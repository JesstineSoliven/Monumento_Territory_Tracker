import { useState, useEffect } from 'react'
import type { TerritoryCard } from '../../shared/types'
import { subscribeToAvailableCards } from '../territories/territories.service'

interface CardPickerProps {
  selectedCardId: string | null
  onSelect: (card: TerritoryCard | null) => void
}

export default function CardPicker({ selectedCardId, onSelect }: CardPickerProps) {
  const [cards, setCards] = useState<TerritoryCard[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToAvailableCards((updatedCards) => {
      setCards(updatedCards)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="text-sm text-gray-500">Loading cards...</span>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">
        No available cards. Upload cards first in the Territory Cards page.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {cards.map((card) => {
        const isSelected = card.id === selectedCardId
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelect(isSelected ? null : card)}
            className={`relative rounded-lg border-2 overflow-hidden text-left transition-all ${
              isSelected
                ? 'border-blue-600 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="aspect-[4/3] overflow-hidden bg-gray-100">
              <img
                src={card.downloadUrl}
                alt={card.label}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-2">
              <p className="text-xs font-bold text-gray-900 truncate">
                {card.territoryNumber}
              </p>
              <p className="text-xs text-gray-500 truncate">{card.label}</p>
            </div>
            {isSelected && (
              <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
