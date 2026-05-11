/* eslint-disable react-hooks/preserve-manual-memoization, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { buildClanIntel } from '../utils/clans.js'
import { mapPlayerFromSupabase, mapPlayerToSupabase } from '../utils/supabaseMappers.js'
import { subscribeToPush } from '../utils/push.js'
import { IntelContext } from './intelContext.js'

function profileDisplayName(user) {
  return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Operator'
}

function IntelProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [players, setPlayers] = useState([])
  const [trustVotes, setTrustVotes] = useState([])
  const [publicMessages, setPublicMessages] = useState([])
  const [directMessages, setDirectMessages] = useState([])
  const [onlineUserIds, setOnlineUserIds] = useState([])
  const [userVotes, setUserVotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [error, setError] = useState('')

  const user = session?.user ?? null
  const role = profile?.role ?? 'anonymous'
  const isAuthenticated = Boolean(user)
  const isAdmin = role === 'admin'
  const isModerator = role === 'moderator' || role === 'admin'

  const fetchProfiles = useCallback(async () => {
    const { data, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, role, clan_tag, activision_ids, last_seen, created_at, updated_at')
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

  const fetchPlayerVotes = useCallback(async (userId) => {
    if (!userId) {
      setUserVotes({})
      return
    }

    const { data, error: votesError } = await supabase
      .from('trust_votes')
      .select('player_id, score')
      .eq('user_id', userId)

    if (votesError) {
      throw votesError
    }

    setUserVotes(
      Object.fromEntries((data ?? []).map((vote) => [vote.player_id, vote.score])),
    )
  }, [])

  const fetchTrustVotes = useCallback(async (nextProfiles = [], nextPlayers = []) => {
    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))
    const playerById = new Map(nextPlayers.map((nextPlayer) => [nextPlayer.id, nextPlayer]))

    const { data, error: votesError } = await supabase
      .from('trust_votes')
      .select('id, player_id, user_id, score, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (votesError) {
      throw votesError
    }

    setTrustVotes(
      (data ?? []).map((vote) => ({
        ...vote,
        profile: profileById.get(vote.user_id),
        player: playerById.get(vote.player_id),
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
        fetchTrustVotes(nextProfiles, nextPlayers),
        fetchPlayerVotes(user?.id),
        fetchPublicMessages(nextProfiles),
        fetchDirectMessages(user?.id, nextProfiles),
      ])
    } catch (refreshError) {
      setError(refreshError.message)
    } finally {
      setLoading(false)
    }
  }, [fetchDirectMessages, fetchPlayerVotes, fetchProfiles, fetchPublicMessages, fetchTrustVotes, user?.id])

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return null
    }

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, role, clan_tag, activision_ids, last_seen, created_at, updated_at')
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
      setAuthLoading(false)
    }

    loadSession()

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
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
      .channel('naughty-list-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_chat_messages' }, () => {
        refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => {
        refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trust_votes' }, () => {
        refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

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

    // Auto-subscribe to push notifications when signed in
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

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: updates.displayName?.trim() ?? '',
        clan_tag: updates.clanTag?.trim() ?? '',
        activision_ids: updates.activisionIds ?? [],
      })
      .eq('id', user.id)
      .select('id, display_name, role, clan_tag, activision_ids, last_seen, created_at, updated_at')
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

    await refresh()
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

    await refresh()
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

    await refresh()
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

  async function voteTrust(playerId, score) {
    if (!user) {
      throw new Error('You must be logged in to vote.')
    }

    const { error: voteError } = await supabase.from('trust_votes').upsert(
      {
        player_id: playerId,
        user_id: user.id,
        score: Number(score),
      },
      { onConflict: 'player_id,user_id' },
    )

    if (voteError) {
      throw voteError
    }

    await refresh()
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

  async function deleteTrustVote(voteId) {
    if (!isModerator) {
      throw new Error('Only moderators and admins can delete votes.')
    }

    const { error: deleteError } = await supabase.from('trust_votes').delete().eq('id', voteId)

    if (deleteError) {
      throw deleteError
    }

    await refresh()
  }

  async function reorderPlayers(orderedIds) {
    if (!isAdmin) {
      throw new Error('Only admins can reorder the list.')
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
    const { error: fnError } = await supabase.functions.invoke('send-push', {
      body: { displayName, clanTag, senderUserId: user.id },
    })
    if (fnError) throw fnError
  }

  const value = {
    session,
    user,
    profile,
    profiles,
    players,
    trustVotes,
    publicMessages,
    directMessages,
    onlineUserIds,
    clans,
    userVotes,
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
    voteTrust,
    deletePlayer,
    deleteTrustVote,
    claimAdmin,
    setProfileRole,
    updateProfile,
    sendPublicMessage,
    sendDirectMessage,
    markDirectMessageRead,
    deletePublicMessage,
    reorderPlayers,
    broadcastOnline,
  }

  return <IntelContext.Provider value={value}>{children}</IntelContext.Provider>
}

export default IntelProvider
