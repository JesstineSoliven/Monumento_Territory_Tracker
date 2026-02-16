import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { PublicTalkPresentation } from '../../shared/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLLECTION = 'publicTalkOutlinesHistory'
const ELIGIBILITY_DAYS = 90

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize outline title for search/dedup: lowercase + trimmed */
export function normalizeOutlineKey(title: string): string {
  return title.trim().toLowerCase()
}

/** Compute nextEligibleDate = lastPresentedDate + 90 days (UTC-safe) */
export function computeNextEligibleDate(lastPresentedDate: Date): Date {
  const next = new Date(lastPresentedDate.getTime())
  next.setDate(next.getDate() + ELIGIBILITY_DAYS)
  return next
}

/** Check if a presentation is eligible today */
export function isEligible(nextEligibleDate: Timestamp): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eligible = nextEligibleDate.toDate()
  eligible.setHours(0, 0, 0, 0)
  return today >= eligible
}

// ---------------------------------------------------------------------------
// Subscribe to all presentations (real-time)
// ---------------------------------------------------------------------------

export function subscribeToPresentations(
  callback: (presentations: PublicTalkPresentation[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, COLLECTION),
    orderBy('lastPresentedDate', 'desc'),
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const presentations = snapshot.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as PublicTalkPresentation,
      )
      callback(presentations)
    },
    (error) => {
      console.error('subscribeToPresentations error:', error)
      onError?.(error)
    },
  )
}

// ---------------------------------------------------------------------------
// Excel/CSV import — batch write
// ---------------------------------------------------------------------------

export interface ImportRow {
  outlineTitle: string
  lastPresentedDate: Date
  presenterName: string
}

export interface ImportResult {
  totalRows: number
  successful: number
  skipped: number
  errors: string[]
}

/**
 * Batch-write imported rows to Firestore.
 * Deduplicates on outlineKey + lastPresentedDate within the import batch.
 * Does NOT check existing Firestore docs for duplicates (append-only design).
 */
export async function importPresentations(
  rows: ImportRow[],
  createdBy: string,
): Promise<ImportResult> {
  const result: ImportResult = {
    totalRows: rows.length,
    successful: 0,
    skipped: 0,
    errors: [],
  }

  // Deduplicate within the batch
  const seen = new Set<string>()
  const validRows: ImportRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    // Validate outline title
    if (!row.outlineTitle || !row.outlineTitle.trim()) {
      result.errors.push(`Row ${rowNum}: Empty outline title`)
      result.skipped++
      continue
    }

    // Validate presenter name
    if (!row.presenterName || !row.presenterName.trim()) {
      result.errors.push(`Row ${rowNum}: Empty presenter name`)
      result.skipped++
      continue
    }

    // Validate date
    if (!(row.lastPresentedDate instanceof Date) || isNaN(row.lastPresentedDate.getTime())) {
      result.errors.push(`Row ${rowNum}: Invalid date`)
      result.skipped++
      continue
    }

    // Check for duplicates within the import batch
    const key = normalizeOutlineKey(row.outlineTitle)
    const dateStr = row.lastPresentedDate.toISOString().split('T')[0]
    const dedupeKey = `${key}|${dateStr}`

    if (seen.has(dedupeKey)) {
      result.errors.push(`Row ${rowNum}: Duplicate entry (${row.outlineTitle} on ${dateStr})`)
      result.skipped++
      continue
    }

    seen.add(dedupeKey)
    validRows.push(row)
  }

  // Batch write (Firestore limit: 500 operations per batch)
  const BATCH_LIMIT = 450
  for (let i = 0; i < validRows.length; i += BATCH_LIMIT) {
    const chunk = validRows.slice(i, i + BATCH_LIMIT)
    const batch = writeBatch(db)

    for (const row of chunk) {
      const ref = doc(collection(db, COLLECTION))
      const nextEligible = computeNextEligibleDate(row.lastPresentedDate)

      batch.set(ref, {
        outlineTitle: row.outlineTitle.trim(),
        outlineKey: normalizeOutlineKey(row.outlineTitle),
        lastPresentedDate: Timestamp.fromDate(row.lastPresentedDate),
        presenterName: row.presenterName.trim(),
        nextEligibleDate: Timestamp.fromDate(nextEligible),
        createdAt: serverTimestamp(),
        createdBy,
      })
    }

    await batch.commit()
    result.successful += chunk.length
  }

  return result
}

// ---------------------------------------------------------------------------
// Check for existing duplicates in Firestore before import
// ---------------------------------------------------------------------------

export function findDuplicatesInExisting(
  existingPresentations: PublicTalkPresentation[],
  rows: ImportRow[],
): Set<number> {
  const existingKeys = new Set(
    existingPresentations.map((p) => {
      const dateStr = p.lastPresentedDate.toDate().toISOString().split('T')[0]
      return `${p.outlineKey}|${dateStr}`
    }),
  )

  const duplicateIndices = new Set<number>()
  for (let i = 0; i < rows.length; i++) {
    const key = normalizeOutlineKey(rows[i].outlineTitle)
    const dateStr = rows[i].lastPresentedDate.toISOString().split('T')[0]
    if (existingKeys.has(`${key}|${dateStr}`)) {
      duplicateIndices.add(i)
    }
  }

  return duplicateIndices
}
