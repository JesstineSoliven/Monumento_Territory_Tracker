import type { Timestamp } from 'firebase/firestore'

// --- User Roles ---

export type UserRole = 'admin' | 'servant' | 'leader' | 'publisher'

// --- User ---

export type MinistryDay = 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'

export interface AppUser {
  uid: string
  email: string
  displayName: string
  role: UserRole
  congregation: string
  isActive: boolean
  assignedDays: MinistryDay[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

// --- Territory ---

export type TerritoryStatus = 'announced' | 'in-progress' | 'completed' | 'rejected'

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
  targetCompletionDate: Timestamp | null
  assignedLeaderId: string | null
  notificationRead: boolean
  acceptedAt: Timestamp | null
  rejectedAt: Timestamp | null
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
