import { useState } from 'react'
import type { TerritoryCard } from '../../shared/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CardThumbnailProps {
  card: TerritoryCard
  onDelete: (card: TerritoryCard) => void
  isDeleting: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CardThumbnail({
  card,
  onDelete,
  isDeleting,
}: CardThumbnailProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  function handleDeleteClick() {
    setShowConfirm(true)
  }

  function handleConfirmDelete() {
    setShowConfirm(false)
    onDelete(card)
  }

  function handleCancelDelete() {
    setShowConfirm(false)
  }

  return (
    <div className="relative rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={card.downloadUrl}
          alt={card.label}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-bold text-gray-900 truncate">
          {card.territoryNumber}
        </p>
        <p className="text-xs text-gray-600 truncate mt-0.5">{card.label}</p>

        {/* Description fields */}
        {(card.territoryOwner || card.characteristic || card.territorySize || card.nearestMeetingPlace) && (
          <div className="mt-2 space-y-0.5 border-t border-gray-100 pt-2">
            {card.territoryOwner && (
              <p className="text-xs text-gray-500 truncate">
                <span className="font-medium text-gray-600">Owner:</span> {card.territoryOwner}
              </p>
            )}
            {card.characteristic && (
              <p className="text-xs text-gray-500 truncate">
                <span className="font-medium text-gray-600">Type:</span> {card.characteristic}
              </p>
            )}
            {card.territorySize && (
              <p className="text-xs text-gray-500 truncate">
                <span className="font-medium text-gray-600">Size:</span> {card.territorySize}
              </p>
            )}
            {card.nearestMeetingPlace && (
              <p className="text-xs text-gray-500 truncate">
                <span className="font-medium text-gray-600">Meeting Place:</span> {card.nearestMeetingPlace}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {formatFileSize(card.fileSize)}
            </span>
            {/* Linked indicator (non-blocking — informational only) */}
            {card.isLinked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.03a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
                </svg>
                Linked
              </span>
            )}
          </div>

          {/* Delete button — always available for admin/servant */}
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDeleteClick}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-red-50 text-red-700 hover:bg-red-100"
          >
            {isDeleting ? (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            )}
            Delete
          </button>
        </div>
      </div>

      {/* Confirmation dialog overlay */}
      {showConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg p-4 mx-3 max-w-[280px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-shrink-0 rounded-full bg-red-100 p-1.5">
                <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                Delete Card?
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              This will permanently delete <span className="font-semibold">{card.territoryNumber}</span> and its image. This action cannot be undone.
            </p>
            {card.isLinked && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-3">
                This card is linked to an active territory. The announcement history will be preserved, but the card image will no longer be available.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
