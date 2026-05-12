/* eslint-disable react-hooks/preserve-manual-memoization, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { buildClanIntel } from '../utils/clans.js'
import { gameAccountIds, normalizeGameAccounts } from '../utils/gameAccounts.js'
import { mapPlayerFromSupabase, mapPlayerToSupabase } from '../utils/supabaseMappers.js'
import { subscribeToPush } from '../utils/push.js'
import { IntelContext } from './intelContext.js'

const profileSelect = 'id, display_name, bio, role, clan_tag, activision_ids, game_accounts, last_seen, created_at, updated_at'
const clanSelect = 'id, name, tag, description, created_by, created_at, updated_at, archived_at'
const messageReactionTables = {
  public: 'public_chat_message_reactions',
  direct: 'direct_message_reactions',
  clan: 'clan_message_reactions',
}
const messageReactionKeys = ['middle_finger', 'heart', 'rofl', 'sad_tear', 'xd']

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
  const [clanDirectory, setClanDirectory] = useState([])
  const [myClanMembership, setMyClanMembership] = useState(null)
  const [myClanMembers, setMyClanMembers] = useState([])
  const [clanJoinRequests, setClanJoinRequests] = useState([])
  const [clanInvites, setClanInvites] = useState([])
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
  const profilesRef = useRef([])

  const user = session?.user ?? null
  const role = profile?.role ?? 'anonymous'
  const isAuthenticated = Boolean(user)
  const isAdmin = role === 'admin'
  const isModerator = role === 'moderator' || role === 'admin'
  const unreadDirectMessageCount = directMessages.filter(
    (message) => message.recipient_id === user?.id && !message.read_at,
  ).length

  useEffect(() => {
    profilesRef.current = profiles
  }, [profiles])

  const fetchMessageReactionMap = useCallback(async (scope, messageIds) => {
    const reactionTable = messageReactionTables[scope]

    if (!reactionTable || !messageIds.length) {
      return new Map()
    }

    const { data, error: reactionsError } = await supabase
      .from(reactionTable)
      .select('message_id, user_id, reaction, created_at')
      .in('message_id', messageIds)

    if (reactionsError) {
      throw reactionsError
    }

    return (data ?? []).reduce((reactionMap, reaction) => {
      const currentReactions = reactionMap.get(reaction.message_id) ?? []
      currentReactions.push(reaction)
      reactionMap.set(reaction.message_id, currentReactions)
      return reactionMap
    }, new Map())
  }, [])

  function withMessageReaction(message, reactionMap) {
    return {
      ...message,
      reactions: reactionMap.get(message.id) ?? [],
    }
  }

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

    const messages = (data ?? [])
      .map((message) => ({
        ...message,
        profile: profileById.get(message.user_id),
      }))
      .reverse()
    const reactionMap = await fetchMessageReactionMap('public', messages.map((message) => message.id))

    setPublicMessages(messages.map((message) => withMessageReaction(message, reactionMap)))
  }, [fetchMessageReactionMap])

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

    const messages = (data ?? []).map((message) => ({
      ...message,
      sender: profileById.get(message.sender_id),
      recipient: profileById.get(message.recipient_id),
    }))
    const reactionMap = await fetchMessageReactionMap('direct', messages.map((message) => message.id))

    setDirectMessages(messages.map((message) => withMessageReaction(message, reactionMap)))
  }, [fetchMessageReactionMap])

  const fetchClanDirectory = useCallback(async () => {
    const { data, error: clanDirectoryError } = await supabase.rpc('list_clan_directory')

    if (clanDirectoryError) {
      throw clanDirectoryError
    }

    const nextDirectory = (data ?? []).map((clan) => ({
      ...clan,
      memberCount: Number(clan.member_count ?? 0),
    }))

    setClanDirectory(nextDirectory)
    return nextDirectory
  }, [])

  const fetchMyClanMembership = useCallback(async () => {
    if (!user?.id) {
      setMyClanMembership(null)
      return null
    }

    const { data, error: clanMembershipError } = await supabase
      .from('clan_members')
      .select(`clan_id, user_id, role, joined_at, added_by, clans (${clanSelect})`)
      .eq('user_id', user.id)
      .maybeSingle()

    if (clanMembershipError) {
      throw clanMembershipError
    }

    const nextMembership = data
      ? {
          ...data,
          clan: data.clans,
        }
      : null

    setMyClanMembership(nextMembership)
    return nextMembership
  }, [user?.id])

  const fetchClanMembers = useCallback(async (clanId, nextProfiles = profiles) => {
    if (!clanId || !user?.id) {
      return []
    }

    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))
    const roleRank = {
      owner: 0,
      officer: 1,
      veteran: 2,
      sergeant: 3,
      member: 4,
      recruit: 5,
    }

    const { data, error: clanMembersError } = await supabase
      .from('clan_members')
      .select('clan_id, user_id, role, joined_at, added_by')
      .eq('clan_id', clanId)
      .order('joined_at', { ascending: true })

    if (clanMembersError) {
      throw clanMembersError
    }

    return (data ?? [])
      .map((member) => ({
        ...member,
        profile: profileById.get(member.user_id),
        addedByProfile: profileById.get(member.added_by),
      }))
      .sort((first, second) => {
        return (
          roleRank[first.role] - roleRank[second.role] ||
          (first.profile?.display_name || '').localeCompare(second.profile?.display_name || '')
        )
      })
  }, [profiles, user?.id])

  const fetchMyClanMembers = useCallback(async (clanId, nextProfiles = profiles) => {
    if (!clanId) {
      setMyClanMembers([])
      return []
    }

    const nextMembers = await fetchClanMembers(clanId, nextProfiles)
    setMyClanMembers(nextMembers)
    return nextMembers
  }, [fetchClanMembers, profiles])

  const fetchVisibleClanRequests = useCallback(async (nextProfiles = profiles) => {
    if (!user?.id) {
      setClanJoinRequests([])
      return []
    }

    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))

    const { data, error: clanRequestsError } = await supabase
      .from('clan_join_requests')
      .select(`id, clan_id, user_id, message, status, created_at, responded_at, responded_by, clans (${clanSelect})`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (clanRequestsError) {
      throw clanRequestsError
    }

    const nextRequests = (data ?? []).map((request) => ({
      ...request,
      clan: request.clans,
      profile: profileById.get(request.user_id),
      respondedByProfile: profileById.get(request.responded_by),
    }))

    setClanJoinRequests(nextRequests)
    return nextRequests
  }, [profiles, user?.id])

  const fetchVisibleClanInvites = useCallback(async (nextProfiles = profiles) => {
    if (!user?.id) {
      setClanInvites([])
      return []
    }

    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))

    const { data, error: clanInvitesError } = await supabase
      .from('clan_invites')
      .select(`id, clan_id, invitee_user_id, invited_by_user_id, message, status, created_at, responded_at, responded_by, clans (${clanSelect})`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (clanInvitesError) {
      throw clanInvitesError
    }

    const nextInvites = (data ?? []).map((invite) => ({
      ...invite,
      clan: invite.clans,
      inviteeProfile: profileById.get(invite.invitee_user_id),
      invitedByProfile: profileById.get(invite.invited_by_user_id),
      respondedByProfile: profileById.get(invite.responded_by),
    }))

    setClanInvites(nextInvites)
    return nextInvites
  }, [profiles, user?.id])

  const refreshClanState = useCallback(async (nextProfiles = profiles) => {
    if (!user?.id) {
      const nextDirectory = await fetchClanDirectory()
      setMyClanMembership(null)
      setMyClanMembers([])
      setClanJoinRequests([])
      setClanInvites([])
      return {
        directory: nextDirectory,
        membership: null,
      }
    }

    const [nextDirectory, nextMembership] = await Promise.all([
      fetchClanDirectory(),
      fetchMyClanMembership(),
      fetchVisibleClanRequests(nextProfiles),
      fetchVisibleClanInvites(nextProfiles),
    ])

    if (nextMembership?.clan_id) {
      await fetchMyClanMembers(nextMembership.clan_id, nextProfiles)
    } else {
      setMyClanMembers([])
    }

    return {
      directory: nextDirectory,
      membership: nextMembership,
    }
  }, [fetchClanDirectory, fetchMyClanMembers, fetchMyClanMembership, fetchVisibleClanInvites, fetchVisibleClanRequests, profiles, user?.id])

  const fetchClanMessages = useCallback(async (clanId, nextProfiles = profilesRef.current) => {
    if (!clanId || !user?.id) {
      return []
    }

    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))

    const { data, error: clanMessagesError } = await supabase
      .from('clan_messages')
      .select('id, clan_id, user_id, body, created_at, deleted_at, deleted_by')
      .eq('clan_id', clanId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (clanMessagesError) {
      throw clanMessagesError
    }

    const messages = (data ?? []).map((message) => ({
      ...message,
      profile: profileById.get(message.user_id),
      deletedByProfile: profileById.get(message.deleted_by),
    }))
    const reactionMap = await fetchMessageReactionMap('clan', messages.map((message) => message.id))

    return messages.map((message) => withMessageReaction(message, reactionMap))
  }, [fetchMessageReactionMap, user?.id])

  const fetchClanAuditEvents = useCallback(async (clanId, nextProfiles = profilesRef.current) => {
    if (!clanId || !user?.id) {
      return []
    }

    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))

    const { data, error: clanAuditError } = await supabase
      .from('clan_audit_events')
      .select('id, clan_id, actor_user_id, target_user_id, event_type, details, created_at')
      .eq('clan_id', clanId)
      .order('created_at', { ascending: false })
      .limit(40)

    if (clanAuditError) {
      throw clanAuditError
    }

    return (data ?? []).map((event) => ({
      ...event,
      actorProfile: profileById.get(event.actor_user_id),
      targetProfile: profileById.get(event.target_user_id),
    }))
  }, [user?.id])

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
        refreshClanState(nextProfiles),
      ])
    } catch (refreshError) {
      setError(refreshError.message)
    } finally {
      setLoading(false)
    }
  }, [fetchDirectMessages, fetchProfiles, fetchPublicMessages, refreshClanState, user?.id])

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

  const refreshAfterClanMutation = useCallback(async () => {
    await Promise.all([fetchProfile(user?.id), refresh()])
  }, [fetchProfile, refresh, user?.id])

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clans' }, () => {
        fetchProfiles()
          .then((nextProfiles) => refreshClanState(nextProfiles))
          .catch((clanError) => setError(clanError.message))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clan_members' }, () => {
        fetchProfiles()
          .then((nextProfiles) => refreshClanState(nextProfiles))
          .catch((clanError) => setError(clanError.message))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clan_join_requests' }, () => {
        fetchProfiles()
          .then((nextProfiles) => refreshClanState(nextProfiles))
          .catch((clanError) => setError(clanError.message))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clan_invites' }, () => {
        fetchProfiles()
          .then((nextProfiles) => refreshClanState(nextProfiles))
          .catch((clanError) => setError(clanError.message))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchDirectMessages, fetchProfiles, fetchPublicMessages, refresh, refreshClanState, user?.id])

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
            refreshClanState(nextProfiles),
          ]),
        )
        .catch((messagesError) => setError(messagesError.message))
    }

    const intervalId = window.setInterval(pollMessages, 3000)
    return () => window.clearInterval(intervalId)
  }, [fetchDirectMessages, fetchProfiles, fetchPublicMessages, refreshClanState, user?.id])

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
        bio: updates.bio?.trim() ?? '',
        ...(typeof updates.clanTag === 'string' ? { clan_tag: updates.clanTag.trim() } : {}),
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

  async function createClan({ name, tag, description }) {
    if (!user) {
      throw new Error('You must be logged in to create a clan.')
    }

    const { data, error: createClanError } = await supabase.rpc('create_clan', {
      clan_name: name,
      clan_tag: tag,
      clan_description: description,
    })

    if (createClanError) {
      throw createClanError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function requestClanJoin(clanId, message = '') {
    if (!user) {
      throw new Error('You must be logged in to request a clan invite.')
    }

    const { data, error: clanRequestError } = await supabase.rpc('request_clan_join', {
      target_clan_id: clanId,
      request_message: message,
    })

    if (clanRequestError) {
      throw clanRequestError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function cancelClanJoinRequest(requestId) {
    const { data, error: cancelClanRequestError } = await supabase.rpc('cancel_clan_join_request', {
      target_request_id: requestId,
    })

    if (cancelClanRequestError) {
      throw cancelClanRequestError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function approveClanJoinRequest(requestId) {
    const { data, error: approveClanRequestError } = await supabase.rpc('approve_clan_join_request', {
      target_request_id: requestId,
    })

    if (approveClanRequestError) {
      throw approveClanRequestError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function rejectClanJoinRequest(requestId) {
    const { data, error: rejectClanRequestError } = await supabase.rpc('reject_clan_join_request', {
      target_request_id: requestId,
    })

    if (rejectClanRequestError) {
      throw rejectClanRequestError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function inviteClanMember(clanId, userId, message = '') {
    const { data, error: inviteClanMemberError } = await supabase.rpc('invite_clan_member', {
      target_clan_id: clanId,
      target_user_id: userId,
      invite_message: message,
    })

    if (inviteClanMemberError) {
      throw inviteClanMemberError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function acceptClanInvite(inviteId) {
    const { data, error: acceptClanInviteError } = await supabase.rpc('accept_clan_invite', {
      target_invite_id: inviteId,
    })

    if (acceptClanInviteError) {
      throw acceptClanInviteError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function declineClanInvite(inviteId) {
    const { data, error: declineClanInviteError } = await supabase.rpc('decline_clan_invite', {
      target_invite_id: inviteId,
    })

    if (declineClanInviteError) {
      throw declineClanInviteError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function removeClanMember(clanId, userId) {
    const { data, error: removeClanMemberError } = await supabase.rpc('remove_clan_member', {
      target_clan_id: clanId,
      target_user_id: userId,
    })

    if (removeClanMemberError) {
      throw removeClanMemberError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function leaveClan(clanId) {
    const { data, error: leaveClanError } = await supabase.rpc('leave_clan', {
      target_clan_id: clanId,
    })

    if (leaveClanError) {
      throw leaveClanError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function updateClanMemberRole(clanId, userId, nextRole) {
    const { data, error: clanRoleError } = await supabase.rpc('update_clan_member_role', {
      target_clan_id: clanId,
      target_user_id: userId,
      next_role: nextRole,
    })

    if (clanRoleError) {
      throw clanRoleError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function transferClanOwnership(clanId, userId) {
    const { data, error: transferClanOwnershipError } = await supabase.rpc('transfer_clan_ownership', {
      target_clan_id: clanId,
      target_user_id: userId,
    })

    if (transferClanOwnershipError) {
      throw transferClanOwnershipError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function updateClan(clanId, { name, tag, description }) {
    const { data, error: updateClanError } = await supabase.rpc('update_clan', {
      target_clan_id: clanId,
      clan_name: name,
      clan_tag: tag,
      clan_description: description,
    })

    if (updateClanError) {
      throw updateClanError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function archiveClan(clanId) {
    const { data, error: archiveClanError } = await supabase.rpc('archive_clan', {
      target_clan_id: clanId,
    })

    if (archiveClanError) {
      throw archiveClanError
    }

    await refreshAfterClanMutation()
    return data
  }

  async function sendClanMessage(clanId, body) {
    if (!user) {
      throw new Error('You must be logged in to send clan chat.')
    }

    const { error: clanMessageError } = await supabase.from('clan_messages').insert({
      clan_id: clanId,
      user_id: user.id,
      body: body.trim(),
    })

    if (clanMessageError) {
      throw clanMessageError
    }
  }

  async function deleteClanMessage(messageId) {
    const { data, error: deleteClanMessageError } = await supabase.rpc('delete_clan_message', {
      target_message_id: messageId,
    })

    if (deleteClanMessageError) {
      throw deleteClanMessageError
    }

    return data
  }

  async function setMessageReaction(scope, messageId, reaction) {
    if (!user) {
      throw new Error('You must be logged in to react to messages.')
    }

    const reactionTable = messageReactionTables[scope]

    if (!reactionTable) {
      throw new Error('Unknown message reaction scope.')
    }

    if (!messageReactionKeys.includes(reaction)) {
      throw new Error('Unknown reaction.')
    }

    const { data: existingReaction, error: existingReactionError } = await supabase
      .from(reactionTable)
      .select('reaction')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingReactionError) {
      throw existingReactionError
    }

    if (existingReaction?.reaction === reaction) {
      const { error: deleteReactionError } = await supabase
        .from(reactionTable)
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)

      if (deleteReactionError) {
        throw deleteReactionError
      }
    } else {
      const { error: upsertReactionError } = await supabase
        .from(reactionTable)
        .upsert(
          {
            message_id: messageId,
            user_id: user.id,
            reaction,
          },
          { onConflict: 'message_id,user_id' },
        )

      if (upsertReactionError) {
        throw upsertReactionError
      }
    }

    const reactionMap = await fetchMessageReactionMap(scope, [messageId])
    const nextReactions = reactionMap.get(messageId) ?? []

    if (scope === 'public') {
      setPublicMessages((currentMessages) =>
        currentMessages.map((message) => (message.id === messageId ? { ...message, reactions: nextReactions } : message)),
      )
    }

    if (scope === 'direct') {
      setDirectMessages((currentMessages) =>
        currentMessages.map((message) => (message.id === messageId ? { ...message, reactions: nextReactions } : message)),
      )
    }

    return nextReactions
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

    const trimmedBody = body.trim()

    const { data: sentMessage, error: messageError } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        body: trimmedBody,
      })
      .select('id, sender_id, recipient_id, body, read_at, created_at')
      .single()

    if (messageError) {
      throw messageError
    }

    const profileById = new Map(profilesRef.current.map((nextProfile) => [nextProfile.id, nextProfile]))
    setDirectMessages((currentMessages) => {
      if (currentMessages.some((currentMessage) => currentMessage.id === sentMessage.id)) {
        return currentMessages
      }

      return [
        ...currentMessages,
        {
          ...sentMessage,
          sender: profileById.get(sentMessage.sender_id),
          recipient: profileById.get(sentMessage.recipient_id),
          reactions: [],
        },
      ].sort((first, second) => new Date(first.created_at) - new Date(second.created_at))
    })

    const displayName = profile?.display_name || profileDisplayName(user)
    const clanTag = profile?.clan_tag || ''

    withTimeout(
      supabase.functions.invoke('send-push', {
        body: {
          type: 'direct-message',
          senderUserId: user.id,
          recipientUserId: recipientId,
          displayName,
          clanTag,
          message: trimmedBody,
        },
      }),
      12000,
      'Push notification request timed out.',
    )
      .then(({ data: pushResult, error: pushError }) => {
        if (pushError) {
          console.warn(`[push] DM delivered in-app but push failed: ${pushError.message}`)
          return
        }

        if (!pushResult?.sent) {
          console.warn('[push] DM delivered in-app but recipient has no active push subscription.')
        }
      })
      .catch((pushError) => {
        console.warn(`[push] DM delivered in-app but push failed: ${pushError.message}`)
      })

    return sentMessage
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

  async function updatePlayer(playerId, updates) {
    if (!isModerator) {
      throw new Error('Only moderators and admins can edit entries.')
    }

    const { error: updateError } = await supabase
      .from('players')
      .update({
        name: updates.name.trim(),
        clan: updates.clan?.trim() ?? '',
        threat_level: updates.threatLevel,
        initial_trust_score: Number(updates.trustScore),
        tags: updates.tags ?? [],
        evidence_url: updates.evidenceUrl?.trim() ?? '',
        notes: updates.notes?.trim() ?? '',
        moderated_at: new Date().toISOString(),
        moderated_by: user?.id,
      })
      .eq('id', playerId)

    if (updateError) {
      throw updateError
    }

    await refresh()
  }

  async function registerPlayerKill(playerId) {
    if (!user) {
      throw new Error('You must be logged in to log a kill.')
    }

    const { data, error: killError } = await supabase.rpc('register_player_kill', {
      target_player_id: playerId,
    })

    if (killError) {
      throw killError
    }

    const result = Array.isArray(data) ? data[0] : data

    if (!result) {
      throw new Error('Kill log did not return a result.')
    }

    setPlayers((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === playerId
          ? {
              ...currentPlayer,
              killCount: result.kill_count ?? currentPlayer.killCount,
              myLastKillAt: result.recorded_at ?? currentPlayer.myLastKillAt,
              myKillCooldownEndsAt: result.cooldown_ends_at ?? currentPlayer.myKillCooldownEndsAt,
            }
          : currentPlayer,
      ),
    )

    return result
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

  async function deleteProfileAccount(userId) {
    if (!isAdmin) {
      throw new Error('Only admins can delete accounts.')
    }

    if (userId === user?.id) {
      throw new Error('You cannot delete your own admin account.')
    }

    const targetProfile = profiles.find((nextProfile) => nextProfile.id === userId)
    if (targetProfile?.role === 'admin') {
      throw new Error('The admin account is locked.')
    }

    const { data, error: deleteError } = await withTimeout(
      supabase.functions.invoke('admin-users', {
        body: { type: 'delete-account', targetUserId: userId },
      }),
      12000,
      'Account deletion request timed out.',
    )

    if (deleteError) {
      throw deleteError
    }

    setProfiles((currentProfiles) => currentProfiles.filter((currentProfile) => currentProfile.id !== userId))
    await refresh()
    return data
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
    clanDirectory,
    myClanMembership,
    myClan: myClanMembership?.clan ?? null,
    myClanRole: myClanMembership?.role ?? '',
    myClanMembers,
    clanJoinRequests,
    clanInvites,
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
    updatePlayer,
    registerPlayerKill,
    deletePlayer,
    deleteProfileAccount,
    claimAdmin,
    setProfileRole,
    updateProfile,
    createClan,
    requestClanJoin,
    cancelClanJoinRequest,
    approveClanJoinRequest,
    rejectClanJoinRequest,
    inviteClanMember,
    acceptClanInvite,
    declineClanInvite,
    removeClanMember,
    leaveClan,
    updateClanMemberRole,
    transferClanOwnership,
    updateClan,
    archiveClan,
    sendPublicMessage,
    sendDirectMessage,
    sendClanMessage,
    setMessageReaction,
    markDirectMessageRead,
    deletePublicMessage,
    deleteClanMessage,
    fetchClanMembers,
    fetchClanMessages,
    fetchClanAuditEvents,
    reorderPlayers,
    broadcastOnline,
    enablePushNotifications,
    fetchPushConsole,
    sendCustomPush,
  }

  return <IntelContext.Provider value={value}>{children}</IntelContext.Provider>
}

export default IntelProvider
