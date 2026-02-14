import { useState, useEffect } from 'react'
import type { Territory } from '../types'
import { useAuth } from './useAuth'
import { subscribeToLeaderNotifications } from '../../features/territories/territories.service'

/**
 * Real-time hook for unread territory assignment notifications.
 * Returns the list of unread announced territories and the count.
 * Only active for users with 'leader' role.
 */
export function useNotifications() {
  const { appUser } = useAuth()
  const [unread, setUnread] = useState<Territory[]>([])

  const isLeader = appUser?.role === 'leader'

  useEffect(() => {
    if (!appUser || !isLeader) {
      setUnread([])
      return
    }

    const unsubscribe = subscribeToLeaderNotifications(
      appUser.uid,
      (territories) => setUnread(territories),
      () => setUnread([]),
    )

    return () => unsubscribe()
  }, [appUser, isLeader])

  return {
    unread,
    count: unread.length,
  }
}
