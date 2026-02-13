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
  onToggleActive: (cardId: string, newValue: boolean) => void
  isToggling: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CardThumbnail({
  card,
  onToggleActive,
  isToggling,
}: CardThumbnailProps) {
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
          <span className="text-xs text-gray-400">
            {formatFileSize(card.fileSize)}
          </span>

          {/* Toggle button */}
          <button
            type="button"
            disabled={isToggling}
            onClick={() => onToggleActive(card.id, !card.isActive)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              card.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {isToggling ? (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  card.isActive ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
            )}
            {card.isActive ? 'Active' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* Disabled overlay */}
      {!card.isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40">
          <span className="rounded-md bg-gray-900/70 px-3 py-1.5 text-sm font-medium text-white">
            Disabled
          </span>
        </div>
      )}
    </div>
  )
}
