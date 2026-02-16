import { useState, useCallback } from 'react'

interface SafeImageProps {
  src: string | undefined | null
  alt: string
  className?: string
  containerClassName?: string
}

export default function SafeImage({
  src,
  alt,
  className = 'h-full w-full object-cover',
  containerClassName,
}: SafeImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  const handleLoad = useCallback(() => setStatus('loaded'), [])
  const handleError = useCallback(() => setStatus('error'), [])

  // No URL at all — show placeholder
  if (!src) {
    return (
      <div className={containerClassName}>
        <div className="h-full w-full flex items-center justify-center bg-slate-100">
          <svg
            className="h-6 w-6 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClassName}>
      {/* Skeleton pulse while loading */}
      {status === 'loading' && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
      )}

      {/* Error fallback */}
      {status === 'error' && (
        <div className="h-full w-full flex items-center justify-center bg-slate-100">
          <svg
            className="h-6 w-6 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
      )}

      {/* Actual image (hidden on error) */}
      {status !== 'error' && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} ${status === 'loading' ? 'invisible' : ''}`}
        />
      )}
    </div>
  )
}
