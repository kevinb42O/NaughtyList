/* eslint-disable react-hooks/preserve-manual-memoization, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { buildClanIntel } from '../utils/clans.js'
import { gameAccountIds, normalizeGameAccounts } from '../utils/gameAccounts.js'
import { mapPlayerFromSupabase, mapPlayerToSupabase } from '../utils/supabaseMappers.js'
import { subscribeToPush } from '../utils/push.js'
import { IntelContext } from './intelContext.js'

const profileSelect = 'id, display_name, role, clan_tag, activision_ids, game_accounts, last_seen, created_at, updated_at'

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms)
    }),
  ])
}

function profileDisplayName(user) {
  return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Operator'
}

function IntelProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [players, setPlayers] = useState([])
  const [publicMessages, setPublicMessages] = useState([])
  const [directMessages, setDirectMessages] = useState([])
  const [onlineUserIds, setOnlineUserIds] = useState([])
  const [pushSummary, setPushSummary] = useState({
    subscribed_users: 0,
    active_subscriptions: 0,
    sent_notifications: 0,
  })
  const [pushEvents, setPushEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [error, setError] = useState('')

  const user = session?.user ?? null
  const role = profile?.role ?? 'anonymous'
  const isAuthenticated = Boolean(user)
  const isAdmin = role === 'admin'
  const isModerator = role === 'moderator' || role === 'admin'
  const unreadDirectMessageCount = directMessages.filter(
    (message) => message.recipient_id === user?.id && !message.read_at,
  ).length

  const fetchProfiles = useCallback(async () => {
    const { data, error: profilesError } = await supabase
      .from('profiles')
      .select(profileSelect)
      .order('created_at', { ascending: true })

    if (profilesError) {
      throw profilesError
    }

    setProfiles(data ?? [])
    return data ?? []
  }, [])

  const fetchPublicMessages = useCallback(async (nextProfiles = []) => {
    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))

    const { data, error: messagesError } = await supabase
      .from('public_chat_messages')
      .select('id, user_id, body, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (messagesError) {
      throw messagesError
    }

    setPublicMessages(
      (data ?? [])
        .map((message) => ({
          ...message,
          profile: profileById.get(message.user_id),
        }))
        .reverse(),
    )
  }, [])

  const fetchDirectMessages = useCallback(async (userId, nextProfiles = []) => {
    if (!userId) {
      setDirectMessages([])
      return
    }

    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))

    const { data, error: messagesError } = await supabase
      .from('direct_messages')
      .select('id, sender_id, recipient_id, body, read_at, created_at')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: true })
      .limit(300)

    if (messagesError) {
      throw messagesError
    }

    setDirectMessages(
      (data ?? []).map((message) => ({
        ...message,
        sender: profileById.get(message.sender_id),
        recipient: profileById.get(message.recipient_id),
      })),
    )
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const nextProfiles = await fetchProfiles()
      const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))
      const { data, error: playersError } = await supabase
        .from('players_with_scores')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (playersError) {
        throw playersError
      }

      const nextPlayers = (data ?? [])
        .map((row) => mapPlayerFromSupabase(row, profileById))
        .sort((a, b) => a.sortOrder - b.sortOrder)
      setPlayers(nextPlayers)

      await Promise.all([
        fetchPublicMessages(nextProfiles),
        fetchDirectMessages(user?.id, nextProfiles),
      ])
    } catch (refreshError) {
      setError(refreshError.message)
    } finally {
      setLoading(false)
    }
  }, [fetchDirectMessages, fetchProfiles, fetchPublicMessages, user?.id])

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return null
    }

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select(profileSelect)
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    setProfile(data)
    return data
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      const { data } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      setSession(data.session)
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token)
      }
      setAuthLoading(false)
    }

    loadSession()

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.access_token) {
        supabase.realtime.setAuth(nextSession.access_token)
      }
      setAuthLoading(false)
    })

    return () => {
      isMounted = false
      authSubscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    fetchProfile(user?.id).catch((profileError) => setError(profileError.message))
  }, [fetchProfile, user?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const channel = supabase
      .channel('21rats-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_chat_messages' }, () => {
        fetchProfiles()
          .then((nextProfiles) => fetchPublicMessages(nextProfiles))
          .catch((messagesError) => setError(messagesError.message))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => {
        fetchProfiles()
          .then((nextProfiles) => fetchDirectMessages(user?.id, nextProfiles))
          .catch((messagesError) => setError(messagesError.message))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchDirectMessages, fetchProfiles, fetchPublicMessages, refresh, user?.id])

  useEffect(() => {
    if (!user?.id) {
      return undefined
    }

    const pollMessages = () => {
      fetchProfiles()
        .then((nextProfiles) =>
          Promise.all([
            fetchPublicMessages(nextProfiles),
            fetchDirectMessages(user.id, nextProfiles),
          ]),
        )
        .catch((messagesError) => setError(messagesError.message))
    }

    const intervalId = window.setInterval(pollMessages, 3000)
    return () => window.clearInterval(intervalId)
  }, [fetchDirectMessages, fetchProfiles, fetchPublicMessages, user?.id])

  useEffect(() => {
    if (!user) {
      setOnlineUserIds([])
      return undefined
    }

    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState()
        setOnlineUserIds(Object.keys(presenceState))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          })
        }
      })

    supabase
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', user.id)
      .then(() => {})

    subscribeToPush(user.id).catch(() => {})

    return () => {
      supabase.removeChannel(presenceChannel)
    }
  }, [user])

  async function signIn(email, password) {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      throw signInError
    }
  }

  async function signUp(email, password, displayName) {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    })

    if (signUpError) {
      throw signUpError
    }
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      throw signOutError
    }
  }

  async function updateProfile(updates) {
    if (!user) {
      throw new Error('You must be logged in to update your profile.')
    }

    const normalizedGameAccounts = normalizeGameAccounts(updates.gameAccounts)

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: updates.displayName?.trim() ?? '',
        clan_tag: updates.clanTag?.trim() ?? '',
        activision_ids: gameAccountIds(normalizedGameAccounts),
        game_accounts: normalizedGameAccounts,
      })
      .eq('id', user.id)
      .select(profileSelect)
      .single()

    if (updateError) {
      throw updateError
    }

    setProfile(data)
    await refresh()
  }

  async function sendPublicMessage(body) {
    if (!user) {
      throw new Error('You must be logged in to chat.')
    }

    const { error: messageError } = await supabase.from('public_chat_messages').insert({
      user_id: user.id,
      body: body.trim(),
    })

    if (messageError) {
      throw messageError
    }

    const nextProfiles = await fetchProfiles()
    await fetchPublicMessages(nextProfiles)
  }

  async function sendDirectMessage(recipientId, body) {
    if (!user) {
      throw new Error('You must be logged in to send messages.')
    }

    const { error: messageError } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      recipient_id: recipientId,
      body: body.trim(),
    })

    if (messageError) {
      throw messageError
    }

    const displayName = profile?.display_name || profileDisplayName(user)
    const clanTag = profile?.clan_tag || ''
    const { data: pushResult, error: pushError } = await withTimeout(
      supabase.functions.invoke('send-push', {
        body: {
          type: 'direct-message',
          senderUserId: user.id,
          recipientUserId: recipientId,
          displayName,
          clanTag,
          message: body.trim(),
        },
      }),
      12000,
      'Push notification request timed out.',
    )

    if (pushError) {
      throw new Error(`Message sent, but push failed: ${pushError.message}`)
    }

    if (!pushResult?.sent) {
      console.warn('[push] DM delivered in-app but recipient has no active push subscription.')
    }

    const nextProfiles = await fetchProfiles()
    await fetchDirectMessages(user.id, nextProfiles)
  }

  async function markDirectMessageRead(messageId) {
    if (!user) {
      return
    }

    const { error: readError } = await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)

    if (readError) {
      throw readError
    }

    const nextProfiles = await fetchProfiles()
    await fetchDirectMessages(user.id, nextProfiles)
  }

  async function deletePublicMessage(messageId) {
    if (!isModerator) {
      throw new Error('Only moderators and admins can delete public chat.')
    }

    const { error: deleteError } = await supabase
      .from('public_chat_messages')
      .delete()
      .eq('id', messageId)

    if (deleteError) {
      throw deleteError
    }

    await refresh()
  }

  async function addPlayer(player) {
    if (!user) {
      throw new Error('You must be logged in to add operators.')
    }

    const { data, error: insertError } = await supabase
      .from('players')
      .insert(mapPlayerToSupabase(player, user.id))
      .select('id')
      .single()

    if (insertError) {
      throw insertError
    }

    await refresh()
    return data
  }

  async function deletePlayer(playerId) {
    if (!isModerator) {
      throw new Error('Only moderators and admins can delete entries.')
    }

    const { error: deleteError } = await supabase.from('players').delete().eq('id', playerId)

    if (deleteError) {
      throw deleteError
    }

    await refresh()
  }

  async function reorderPlayers(orderedIds) {
    if (!isAdmin) {
      throw new Error('Only admins can reorder the board.')
    }

    // Optimistically update local state immediately
    setPlayers((current) => {
      const byId = new Map(current.map((p) => [p.id, p]))
      return orderedIds.map((id, index) => ({ ...byId.get(id), sortOrder: index + 1 })).filter(Boolean)
    })

    // Persist each updated sort_order to Supabase
    const updates = orderedIds.map((id, index) =>
      supabase.from('players').update({ sort_order: index + 1 }).eq('id', id),
    )
    await Promise.all(updates)
  }

  async function claimAdmin() {
    const { data, error: claimError } = await supabase.rpc('claim_admin_role')

    if (claimError) {
      throw claimError
    }

    setProfile(data)
    await refresh()
    return data
  }

  async function setProfileRole(userId, nextRole) {
    const { data, error: roleError } = await supabase.rpc('set_profile_role', {
      target_user_id: userId,
      next_role: nextRole,
    })

    if (roleError) {
      throw roleError
    }

    setProfiles((currentProfiles) =>
      currentProfiles.map((currentProfile) =>
        currentProfile.id === userId ? data : currentProfile,
      ),
    )

    if (profile?.id === userId) {
      setProfile(data)
    }

    await refresh()
  }

  const clans = useMemo(() => buildClanIntel(players), [players])

  async function broadcastOnline() {
    if (!user) throw new Error('You must be logged in.')
    const displayName = profile?.display_name || profileDisplayName(user)
    const clanTag = profile?.clan_tag || ''
    const { data, error: fnError } = await withTimeout(
      supabase.functions.invoke('send-push', {
        body: { type: 'online', displayName, clanTag, senderUserId: user.id },
      }),
      12000,
      'Online ping request timed out.',
    )
    if (fnError) throw fnError
    if (!data?.sent) {
      throw new Error('No active phone subscriptions found for the team yet.')
    }
  }

  async function enablePushNotifications() {
    if (!user) return false
    return subscribeToPush(user.id)
  }

  const fetchPushConsole = useCallback(async () => {
    if (!isAdmin) {
      setPushSummary({ subscribed_users: 0, active_subscriptions: 0, sent_notifications: 0 })
      setPushEvents([])
      return null
    }

    const { data, error: pushError } = await withTimeout(
      supabase.functions.invoke('send-push', {
        body: { type: 'push-stats' },
      }),
      12000,
      'Push console request timed out.',
    )

    if (pushError) {
      throw pushError
    }

    const nextSummary = data?.summary ?? {
      subscribed_users: 0,
      active_subscriptions: 0,
      sent_notifications: 0,
    }
    setPushSummary(nextSummary)
    setPushEvents(data?.events ?? [])
    return data
  }, [isAdmin])

  const sendCustomPush = useCallback(async ({ title, body, url }) => {
    if (!isAdmin) {
      throw new Error('Only admins can send custom notifications.')
    }

    const { data, error: pushError } = await withTimeout(
      supabase.functions.invoke('send-push', {
        body: {
          type: 'custom-notification',
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || '/',
        },
      }),
      12000,
      'Custom notification request timed out.',
    )

    if (pushError) {
      throw pushError
    }

    await fetchPushConsole()
    return data
  }, [fetchPushConsole, isAdmin])

  const value = {
    session,
    user,
    profile,
    profiles,
    players,
    publicMessages,
    directMessages,
    pushSummary,
    pushEvents,
    unreadDirectMessageCount,
    onlineUserIds,
    clans,
    loading: loading || authLoading,
    error,
    role,
    isAuthenticated,
    isModerator,
    isAdmin,
    profileDisplayName: profile?.display_name || profileDisplayName(user),
    refresh,
    signIn,
    signUp,
    signOut,
    addPlayer,
    deletePlayer,
    claimAdmin,
    setProfileRole,
    updateProfile,
    sendPublicMessage,
    sendDirectMessage,
    markDirectMessageRead,
    deletePublicMessage,
    reorderPlayers,
    broadcastOnline,
    enablePushNotifications,
    fetchPushConsole,
    sendCustomPush,
  }

  return <IntelContext.Provider value={value}>{children}</IntelContext.Provider>
}

export default IntelProvider
