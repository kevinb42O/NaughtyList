import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const typingThrottleMs = 1200
const typingTtlMs = 3600

export function useRealtimeTyping({ enabled = true, profile, roomKey, user }) {
  const userId = user?.id ?? ''
  const userEmail = user?.email ?? ''
  const displayName = profile?.display_name || userEmail.split('@')[0] || 'Operator'
  const clanTag = profile?.clan_tag || ''
  const channelRef = useRef(null)
  const lastSentAtRef = useRef(0)
  const [typingByUserId, setTypingByUserId] = useState({})

  useEffect(() => {
    lastSentAtRef.current = 0

    if (!enabled || !roomKey || !userId) {
      return undefined
    }

    const channel = supabase.channel(`typing:${roomKey}`, {
      config: { broadcast: { self: false } },
    })

    channelRef.current = channel
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === userId) {
          return
        }

        setTypingByUserId((current) => ({
          ...current,
          [payload.userId]: {
            userId: payload.userId,
            roomKey,
            displayName: payload.displayName || 'Operator',
            clanTag: payload.clanTag || '',
            expiresAt: Date.now() + typingTtlMs,
          },
        }))
      })
      .subscribe()

    const cleanupInterval = window.setInterval(() => {
      const now = Date.now()
      setTypingByUserId((current) => {
        const nextEntries = Object.entries(current).filter(([, typingUser]) => typingUser.expiresAt > now)
        if (nextEntries.length === Object.keys(current).length) {
          return current
        }

        return Object.fromEntries(nextEntries)
      })
    }, 1000)

    return () => {
      window.clearInterval(cleanupInterval)
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [enabled, roomKey, userId])

  const typingUsers = useMemo(() => {
    return Object.values(typingByUserId).filter((typingUser) => typingUser.roomKey === roomKey)
  }, [roomKey, typingByUserId])

  const sendTyping = useCallback(() => {
    if (!enabled || !roomKey || !userId || !channelRef.current) {
      return
    }

    const now = Date.now()
    if (now - lastSentAtRef.current < typingThrottleMs) {
      return
    }

    lastSentAtRef.current = now
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId,
        displayName,
        clanTag,
      },
    })
  }, [clanTag, displayName, enabled, roomKey, userId])

  return { sendTyping, typingUsers }
}
