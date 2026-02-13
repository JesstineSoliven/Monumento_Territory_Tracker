import type { Timestamp } from 'firebase/firestore'

// --- User Roles ---

export type UserRole = 'admin' | 'servant' | 'leader' | 'publisher'

// --- User ---

export interface AppUser {
  uid: string
  email: string
  displayName: string
  role: UserRole
  congregation: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// --- Territory ---

export type TerritoryStatus = 'open' | 'in-progress' | 'completed'

export interface TerritoryAssignment {
  leaderId: string
  leaderName: string
  assignedAt: Timestamp
}

export interface TerritoryCardRef {
  cardId: string
  downloadUrl: string
  territoryNumber: string
}

export interface Territory {
  id: string
  number: string
  name: string
  description: string
  status: TerritoryStatus
  card: TerritoryCardRef | null
  currentAssignment: TerritoryAssignment | null
  announcedBy: {
    uid: string
    name: string
  }
  announcedAt: Timestamp
  lastCompletedAt: Timestamp | null
  completionCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

// --- Report ---

export interface Report {
  id: string
  territoryId: string
  reportedBy: {
    uid: string
    name: string
  }
  completed: boolean
  remarks: string
  reportedAt: Timestamp
  createdAt: Timestamp
}

// --- Territory Card ---

export interface TerritoryCard {
  id: string
  territoryNumber: string
  label: string
  territoryOwner: string
  characteristic: string
  territorySize: string
  nearestMeetingPlace: string
  fileName: string
  storagePath: string
  downloadUrl: string
  fileSize: number
  contentType: string
  uploadedBy: {
    uid: string
    name: string
  }
  isActive: boolean
  isLinked: boolean
  linkedTerritoryId: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

// --- Upload Tracking ---

export type FileUploadStatus = 'pending' | 'uploading' | 'complete' | 'error'

export interface FileUploadState {
  file: File
  id: string
  status: FileUploadStatus
  progress: number
  error: string | null
}
