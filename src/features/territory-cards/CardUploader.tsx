import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react'
import type { FileUploadState } from '../../shared/types'
import {
  validateFile,
  validateBatch,
  uploadBatch,
  ALLOWED_TYPES,
} from './territory-cards.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function deriveMetadata(file: File): { territoryNumber: string; label: string; territoryOwner: string; characteristic: string; territorySize: string; nearestMeetingPlace: string } {
  const nameWithoutExt = file.name.replace(/\.[^.]+$/, '')
  return { territoryNumber: nameWithoutExt, label: nameWithoutExt, territoryOwner: '', characteristic: '', territorySize: '', nearestMeetingPlace: '' }
}

let fileIdCounter = 0

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CardUploaderProps {
  uploader: { uid: string; name: string }
  onUploadComplete: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CardUploader({ uploader, onUploadComplete }: CardUploaderProps) {
  const [files, setFiles] = useState<FileUploadState[]>([])
  const [fileMetadata, setFileMetadata] = useState<
    Map<string, { territoryNumber: string; label: string; territoryOwner: string; characteristic: string; territorySize: string; nearestMeetingPlace: string }>
  >(new Map())
  const [batchError, setBatchError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // -------------------------------------------------------------------
  // File selection
  // -------------------------------------------------------------------

  const processFiles = useCallback((rawFiles: File[]) => {
    setBatchError(null)

    const batchErr = validateBatch(rawFiles)
    if (batchErr) {
      setBatchError(batchErr)
      return
    }

    const newFiles: FileUploadState[] = []
    const newMetadata = new Map(fileMetadata)

    for (const file of rawFiles) {
      const id = `file_${++fileIdCounter}`
      const validationError = validateFile(file)

      newFiles.push({
        file,
        id,
        status: validationError ? 'error' : 'pending',
        progress: 0,
        error: validationError,
      })

      if (!validationError) {
        newMetadata.set(id, deriveMetadata(file))
      }
    }

    setFiles(newFiles)
    setFileMetadata(newMetadata)
  }, [fileMetadata])

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const rawFiles = Array.from(e.dataTransfer.files)
    processFiles(rawFiles)
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const rawFiles = Array.from(e.target.files)
    processFiles(rawFiles)
    // Reset input so the same files can be re-selected
    e.target.value = ''
  }

  function handleRemoveFile(fileId: string) {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    setFileMetadata((prev) => {
      const next = new Map(prev)
      next.delete(fileId)
      return next
    })
  }

  function handleClearAll() {
    setFiles([])
    setFileMetadata(new Map())
    setBatchError(null)
  }

  function handleMetadataChange(
    fileId: string,
    field: 'territoryNumber' | 'label' | 'territoryOwner' | 'characteristic' | 'territorySize' | 'nearestMeetingPlace',
    value: string,
  ) {
    setFileMetadata((prev) => {
      const next = new Map(prev)
      const current = next.get(fileId) ?? { territoryNumber: '', label: '', territoryOwner: '', characteristic: '', territorySize: '', nearestMeetingPlace: '' }
      next.set(fileId, { ...current, [field]: value })
      return next
    })
  }

  // -------------------------------------------------------------------
  // Upload
  // -------------------------------------------------------------------

  async function handleUpload() {
    const validFiles = files.filter((f) => f.status === 'pending')
    if (validFiles.length === 0) return

    setIsUploading(true)
    setBatchError(null)

    // Build ordered arrays for the batch function
    const filesToUpload = validFiles.map((f) => f.file)
    const fileIdMap = validFiles.map((f) => f.id)

    await uploadBatch(
      filesToUpload,
      (_file, index) => {
        const id = fileIdMap[index]
        return fileMetadata.get(id) ?? { territoryNumber: '', label: '', territoryOwner: '', characteristic: '', territorySize: '', nearestMeetingPlace: '' }
      },
      uploader,
      // onProgress
      (batchIndex, progress) => {
        const id = fileIdMap[batchIndex]
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'uploading', progress } : f,
          ),
        )
      },
      // onComplete
      (batchIndex) => {
        const id = fileIdMap[batchIndex]
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'complete', progress: 100 } : f,
          ),
        )
      },
      // onError
      (batchIndex, error) => {
        const id = fileIdMap[batchIndex]
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'error', error } : f,
          ),
        )
      },
    )

    setIsUploading(false)
    onUploadComplete()
  }

  // -------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------

  const validPendingCount = files.filter((f) => f.status === 'pending').length
  const completedCount = files.filter((f) => f.status === 'complete').length
  const hasFiles = files.length > 0

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div>
      {/* Batch error */}
      {batchError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{batchError}</p>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
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
        <p className="mt-2 text-sm text-slate-600">
          Drag and drop images here, or{' '}
          <span className="font-semibold text-blue-600">click to browse</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          JPEG, PNG, WebP — max 5 MB each — up to 30 files
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* File list */}
      {hasFiles && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
              {completedCount > 0 && (
                <span className="text-green-600 ml-1">
                  ({completedCount} uploaded)
                </span>
              )}
            </p>
            {!isUploading && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {files.map((f) => (
              <div
                key={f.id}
                className={`rounded-md border p-3 ${
                  f.status === 'error'
                    ? 'border-red-200 bg-red-50'
                    : f.status === 'complete'
                      ? 'border-green-200 bg-green-50'
                      : 'border-slate-200 bg-white'
                }`}
              >
                {/* File header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Status icon */}
                    {f.status === 'complete' && (
                      <span className="text-green-600 text-sm">&#10003;</span>
                    )}
                    {f.status === 'error' && (
                      <span className="text-red-600 text-sm font-bold">&#10005;</span>
                    )}
                    {(f.status === 'pending' || f.status === 'uploading') && (
                      <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                    )}

                    <p className="text-sm text-slate-900 truncate">{f.file.name}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {formatFileSize(f.file.size)}
                    </span>
                  </div>

                  {/* Remove button (only before upload) */}
                  {f.status === 'pending' && !isUploading && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(f.id)}
                      className="text-xs text-slate-400 hover:text-red-600 ml-2"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Error message */}
                {f.error && (
                  <p className="text-xs text-red-600 mt-1">{f.error}</p>
                )}

                {/* Progress bar */}
                {f.status === 'uploading' && (
                  <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}

                {/* Editable metadata (only for valid pending files before upload) */}
                {f.status === 'pending' && !isUploading && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Territory #"
                        value={fileMetadata.get(f.id)?.territoryNumber ?? ''}
                        onChange={(e) =>
                          handleMetadataChange(f.id, 'territoryNumber', e.target.value)
                        }
                        className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Label"
                        value={fileMetadata.get(f.id)?.label ?? ''}
                        onChange={(e) =>
                          handleMetadataChange(f.id, 'label', e.target.value)
                        }
                        className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Territory Owner"
                        value={fileMetadata.get(f.id)?.territoryOwner ?? ''}
                        onChange={(e) =>
                          handleMetadataChange(f.id, 'territoryOwner', e.target.value)
                        }
                        className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Characteristic (e.g., residential)"
                        value={fileMetadata.get(f.id)?.characteristic ?? ''}
                        onChange={(e) =>
                          handleMetadataChange(f.id, 'characteristic', e.target.value)
                        }
                        className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Territory Size (e.g., approx 80 households)"
                        value={fileMetadata.get(f.id)?.territorySize ?? ''}
                        onChange={(e) =>
                          handleMetadataChange(f.id, 'territorySize', e.target.value)
                        }
                        className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Nearest Meeting Place"
                        value={fileMetadata.get(f.id)?.nearestMeetingPlace ?? ''}
                        onChange={(e) =>
                          handleMetadataChange(f.id, 'nearestMeetingPlace', e.target.value)
                        }
                        className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Upload button */}
          {validPendingCount > 0 && (
            <button
              type="button"
              disabled={isUploading}
              onClick={handleUpload}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isUploading
                ? 'Uploading...'
                : `Upload ${validPendingCount} file${validPendingCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
