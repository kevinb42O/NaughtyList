/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { canUseAvatarIcon, defaultAvatarIconKey, getAvatarIconLockLabel } from '../components/ProfileAvatar.jsx'
import { supabase } from '../lib/supabase.js'
import { buildClanIntel } from '../utils/clans.js'
import { gameAccountIds, normalizeGameAccounts } from '../utils/gameAccounts.js'
import { mapPlayerFromSupabase, mapPlayerToSupabase } from '../utils/supabaseMappers.js'
import { subscribeToPush } from '../utils/push.js'
import { IntelContext } from './intelContext.js'

const profileSelect = 'id, display_name, bio, avatar_icon, role, clan_tag, activision_ids, game_accounts, login_streak_count, longest_login_streak_count, last_streak_login_date, xp_total, level, streak_freezes, daily_checkin_count, supporter_tier, supporter_lifetime_amount_cents, supporter_since, supporter_active_until, supporter_badge_enabled, supporter_badge_visible, supporter_wall_visible, supporter_display_name, supporter_profile_frame, supporter_chat_flair, last_seen, created_at, updated_at'
const clanSelect = 'id, name, tag, description, badge_icon, created_by, created_at, updated_at, archived_at'
const messageReactionTables = {
  public: 'public_chat_message_reactions',
  direct: 'direct_message_reactions',
  clan: 'clan_message_reactions',
}
const messageReactionKeys = ['middle_finger', 'heart', 'rofl', 'sad_tear', 'xd']
const publicChatReadStoragePrefix = '21rats:lastPublicChatRead:'

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

function sortMessagesByCreatedAt(messages) {
  return [...messages].sort((first, second) => new Date(first.created_at) - new Date(second.created_at))
}

function sortReactions(reactions = []) {
  return [...reactions].sort((first, second) => {
    const createdAtComparison = String(first.created_at ?? '').localeCompare(String(second.created_at ?? ''))
    if (createdAtComparison !== 0) {
      return createdAtComparison
    }

    return `${first.user_id ?? ''}:${first.reaction ?? ''}`.localeCompare(`${second.user_id ?? ''}:${second.reaction ?? ''}`)
  })
}

function reactionListsMatch(firstReactions = [], secondReactions = []) {
  const sortedFirstReactions = sortReactions(firstReactions)
  const sortedSecondReactions = sortReactions(secondReactions)

  if (sortedFirstReactions.length !== sortedSecondReactions.length) {
    return false
  }

  return sortedFirstReactions.every((firstReaction, index) => {
    const secondReaction = sortedSecondReactions[index]
    return (
      firstReaction?.message_id === secondReaction?.message_id &&
      firstReaction?.user_id === secondReaction?.user_id &&
      firstReaction?.reaction === secondReaction?.reaction &&
      firstReaction?.created_at === secondReaction?.created_at
    )
  })
}

function messageRecordMatches(currentMessage, nextMessage) {
  return (
    currentMessage?.id === nextMessage?.id &&
    currentMessage?.user_id === nextMessage?.user_id &&
    currentMessage?.sender_id === nextMessage?.sender_id &&
    currentMessage?.recipient_id === nextMessage?.recipient_id &&
    currentMessage?.clan_id === nextMessage?.clan_id &&
    currentMessage?.body === nextMessage?.body &&
    currentMessage?.media_url === nextMessage?.media_url &&
    currentMessage?.media_type === nextMessage?.media_type &&
    currentMessage?.created_at === nextMessage?.created_at &&
    currentMessage?.read_at === nextMessage?.read_at &&
    currentMessage?.deleted_at === nextMessage?.deleted_at &&
    currentMessage?.deleted_by === nextMessage?.deleted_by &&
    reactionListsMatch(currentMessage?.reactions, nextMessage?.reactions)
  )
}

function mergeMessageRecords(currentMessages, nextMessages, limit) {
  const currentById = new Map(currentMessages.map((message) => [message.id, message]))
  let changed = currentMessages.length !== nextMessages.length
  const mergedMessages = sortMessagesByCreatedAt(
    nextMessages.map((nextMessage) => {
      const currentMessage = currentById.get(nextMessage.id)
      if (currentMessage && messageRecordMatches(currentMessage, nextMessage)) {
        return currentMessage
      }

      changed = true
      return nextMessage
    }),
  )
  const limitedMessages = typeof limit === 'number' ? mergedMessages.slice(-limit) : mergedMessages

  if (!changed && limitedMessages.every((message, index) => message === currentMessages[index])) {
    return currentMessages
  }

  return limitedMessages
}

function profileRecordMatches(currentProfile, nextProfile) {
  if (currentProfile === nextProfile) return true
  if (!currentProfile || !nextProfile) return false
  return (
    currentProfile.id === nextProfile.id &&
    currentProfile.display_name === nextProfile.display_name &&
    currentProfile.bio === nextProfile.bio &&
    currentProfile.avatar_icon === nextProfile.avatar_icon &&
    currentProfile.role === nextProfile.role &&
    currentProfile.clan_tag === nextProfile.clan_tag &&
    currentProfile.login_streak_count === nextProfile.login_streak_count &&
    currentProfile.longest_login_streak_count === nextProfile.longest_login_streak_count &&
    currentProfile.last_streak_login_date === nextProfile.last_streak_login_date &&
    currentProfile.xp_total === nextProfile.xp_total &&
    currentProfile.level === nextProfile.level &&
    currentProfile.streak_freezes === nextProfile.streak_freezes &&
    currentProfile.daily_checkin_count === nextProfile.daily_checkin_count &&
    currentProfile.supporter_tier === nextProfile.supporter_tier &&
    currentProfile.supporter_lifetime_amount_cents === nextProfile.supporter_lifetime_amount_cents &&
    currentProfile.supporter_since === nextProfile.supporter_since &&
    currentProfile.supporter_active_until === nextProfile.supporter_active_until &&
    currentProfile.supporter_badge_enabled === nextProfile.supporter_badge_enabled &&
    currentProfile.supporter_badge_visible === nextProfile.supporter_badge_visible &&
    currentProfile.supporter_wall_visible === nextProfile.supporter_wall_visible &&
    currentProfile.supporter_display_name === nextProfile.supporter_display_name &&
    currentProfile.supporter_profile_frame === nextProfile.supporter_profile_frame &&
    currentProfile.supporter_chat_flair === nextProfile.supporter_chat_flair &&
    currentProfile.last_seen === nextProfile.last_seen &&
    currentProfile.updated_at === nextProfile.updated_at &&
    JSON.stringify(currentProfile.activision_ids ?? null) === JSON.stringify(nextProfile.activision_ids ?? null) &&
    JSON.stringify(currentProfile.game_accounts ?? null) === JSON.stringify(nextProfile.game_accounts ?? null)
  )
}

function mergeProfileRecords(currentProfiles, nextProfiles) {
  if (currentProfiles.length !== nextProfiles.length) {
    const currentById = new Map(currentProfiles.map((profile) => [profile.id, profile]))
    return nextProfiles.map((nextProfile) => {
      const currentProfile = currentById.get(nextProfile.id)
      return currentProfile && profileRecordMatches(currentProfile, nextProfile) ? currentProfile : nextProfile
    })
  }

  const currentById = new Map(currentProfiles.map((profile) => [profile.id, profile]))
  let changed = false
  const merged = nextProfiles.map((nextProfile) => {
    const currentProfile = currentById.get(nextProfile.id)
    if (currentProfile && profileRecordMatches(currentProfile, nextProfile)) {
      return currentProfile
    }
    changed = true
    return nextProfile
  })

  if (!changed && merged.every((profile, index) => profile === currentProfiles[index])) {
    return currentProfiles
  }

  return merged
}

function upsertMessageRecord(currentMessages, nextMessage, limit) {
  const exists = currentMessages.some((currentMessage) => currentMessage.id === nextMessage.id)
  let changed = !exists
  const nextMessages = exists
    ? currentMessages.map((currentMessage) =>
        currentMessage.id === nextMessage.id && !messageRecordMatches(currentMessage, nextMessage)
          ? (() => {
              changed = true
              return { ...currentMessage, ...nextMessage, reactions: nextMessage.reactions ?? currentMessage.reactions ?? [] }
            })()
          : currentMessage,
      )
    : [...currentMessages, nextMessage]

  if (!changed) {
    return currentMessages
  }

  return sortMessagesByCreatedAt(nextMessages).slice(typeof limit === 'number' ? -limit : 0)
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
  const [donations, setDonations] = useState([])
  const [supporterWall, setSupporterWall] = useState([])
  const [publicChatMutes, setPublicChatMutes] = useState([])
  const [lastReadPublicChatMessageId, setLastReadPublicChatMessageId] = useState('')
  const [moderationEvents, setModerationEvents] = useState([])
  const [dailyCheckInResult, setDailyCheckInResult] = useState(null)
  const [lastXpAward, setLastXpAward] = useState(null)
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
  const unreadPublicChatCount = useMemo(() => {
    if (!user?.id || !lastReadPublicChatMessageId) {
      return 0
    }

    const lastReadIndex = publicMessages.findIndex((message) => message.id === lastReadPublicChatMessageId)
    const missedMessages = lastReadIndex === -1 ? publicMessages : publicMessages.slice(lastReadIndex + 1)
    return missedMessages.filter((message) => message.user_id !== user.id).length
  }, [lastReadPublicChatMessageId, publicMessages, user?.id])
  const activePublicChatMute = useMemo(() => {
    if (!user?.id) {
      return null
    }

    const now = Date.now()
    return publicChatMutes.find((mute) => (
      mute.target_user_id === user.id &&
      !mute.revoked_at &&
      new Date(mute.ends_at).getTime() > now
    )) ?? null
  }, [publicChatMutes, user?.id])

  useEffect(() => {
    profilesRef.current = profiles
  }, [profiles])

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') {
      setLastReadPublicChatMessageId('')
      return
    }

    setLastReadPublicChatMessageId(window.localStorage.getItem(`${publicChatReadStoragePrefix}${user.id}`) || '')
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || !publicMessages.length || typeof window === 'undefined') {
      return
    }

    const storageKey = `${publicChatReadStoragePrefix}${user.id}`
    if (window.localStorage.getItem(storageKey)) {
      return
    }

    const latestMessageId = publicMessages[publicMessages.length - 1]?.id
    if (latestMessageId) {
      window.localStorage.setItem(storageKey, latestMessageId)
      setLastReadPublicChatMessageId(latestMessageId)
    }
  }, [publicMessages, user?.id])

  const applyProfileRecord = useCallback((nextProfile) => {
    if (!nextProfile?.id) {
      return
    }

    setProfile((currentProfile) => (currentProfile?.id === nextProfile.id || user?.id === nextProfile.id ? nextProfile : currentProfile))
    setProfiles((currentProfiles) => {
      const exists = currentProfiles.some((currentProfile) => currentProfile.id === nextProfile.id)
      if (!exists) {
        return currentProfiles
      }

      return currentProfiles.map((currentProfile) => (currentProfile.id === nextProfile.id ? nextProfile : currentProfile))
    })
  }, [user?.id])

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

    const incoming = data ?? []
    let resolved = incoming
    setProfiles((current) => {
      const merged = mergeProfileRecords(current, incoming)
      resolved = merged
      return merged
    })
    return resolved
  }, [])

  const fetchSupporterWall = useCallback(async () => {
    const { data, error: wallError } = await supabase
      .from('supporter_wall')
      .select('profile_id, display_name, supporter_tier, supporter_since, message')
      .order('supporter_since', { ascending: true })
      .limit(24)

    if (wallError) {
      throw wallError
    }

    setSupporterWall(data ?? [])
    return data ?? []
  }, [])

  const fetchDonationAdmin = useCallback(async (nextProfiles = profilesRef.current) => {
    if (!isAdmin) {
      setDonations([])
      return []
    }

    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))
    const { data, error: donationsError } = await supabase
      .from('donations')
      .select('id, profile_id, provider, provider_payment_id, amount_cents, currency, status, donor_name, donor_email, donor_message, is_public, confirmed_at, confirmed_by, metadata, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (donationsError) {
      throw donationsError
    }

    const nextDonations = (data ?? []).map((donation) => ({
      ...donation,
      profile: profileById.get(donation.profile_id),
    }))
    setDonations(nextDonations)
    return nextDonations
  }, [isAdmin])

  const fetchPublicMessages = useCallback(async (nextProfiles = []) => {
    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))

    const { data, error: messagesError } = await supabase
      .from('public_chat_messages')
      .select('id, user_id, body, media_url, media_type, created_at')
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

    const nextMessages = messages.map((message) => withMessageReaction(message, reactionMap))
    setPublicMessages((currentMessages) => mergeMessageRecords(currentMessages, nextMessages, 100))
  }, [fetchMessageReactionMap])

  const fetchDirectMessages = useCallback(async (userId, nextProfiles = []) => {
    if (!userId) {
      setDirectMessages([])
      return
    }

    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))

    const { data, error: messagesError } = await supabase
      .from('direct_messages')
      .select('id, sender_id, recipient_id, body, media_url, media_type, read_at, created_at')
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

    const nextMessages = messages.map((message) => withMessageReaction(message, reactionMap))
    setDirectMessages((currentMessages) => mergeMessageRecords(currentMessages, nextMessages, 300))
  }, [fetchMessageReactionMap])

  const fetchPublicChatMutes = useCallback(async (nextProfiles = profilesRef.current) => {
    if (!user?.id) {
      setPublicChatMutes([])
      return []
    }

    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))
    const { data, error: mutesError } = await supabase
      .from('public_chat_mutes')
      .select('id, target_user_id, muted_by, reason, starts_at, ends_at, revoked_at, revoked_by, created_at')
      .is('revoked_at', null)
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: true })

    if (mutesError) {
      throw mutesError
    }

    const nextMutes = (data ?? []).map((mute) => ({
      ...mute,
      targetProfile: profileById.get(mute.target_user_id),
      mutedByProfile: profileById.get(mute.muted_by),
    }))
    setPublicChatMutes(nextMutes)
    return nextMutes
  }, [user?.id])

  const fetchModerationEvents = useCallback(async (nextProfiles = profilesRef.current) => {
    if (!isModerator) {
      setModerationEvents([])
      return []
    }

    const profileById = new Map(nextProfiles.map((nextProfile) => [nextProfile.id, nextProfile]))
    const { data, error: eventsError } = await supabase
      .from('moderation_events')
      .select('id, actor_user_id, target_user_id, player_id, message_id, event_type, details, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (eventsError) {
      throw eventsError
    }

    const nextEvents = (data ?? []).map((event) => ({
      ...event,
      actorProfile: profileById.get(event.actor_user_id),
      targetProfile: profileById.get(event.target_user_id),
    }))
    setModerationEvents(nextEvents)
    return nextEvents
  }, [isModerator])

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
      .select('id, clan_id, user_id, body, media_url, media_type, created_at, deleted_at, deleted_by')
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

  const fetchPlayers = useCallback(async (nextProfiles = profilesRef.current) => {
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
  }, [])

  const refresh = useCallback(async () => {
    setError('')

    try {
      const nextProfiles = await fetchProfiles()
      await fetchPlayers(nextProfiles)

      await Promise.all([
        fetchPublicMessages(nextProfiles),
        fetchDirectMessages(user?.id, nextProfiles),
        fetchPublicChatMutes(nextProfiles),
        fetchModerationEvents(nextProfiles),
        fetchSupporterWall(),
        fetchDonationAdmin(nextProfiles),
        refreshClanState(nextProfiles),
      ])
    } catch (refreshError) {
      setError(refreshError.message)
    } finally {
      setLoading(false)
    }
  }, [fetchDirectMessages, fetchDonationAdmin, fetchModerationEvents, fetchPlayers, fetchProfiles, fetchPublicChatMutes, fetchPublicMessages, fetchSupporterWall, refreshClanState, user?.id])

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

  const awardActivityXp = useCallback(async (activityKey, activityRef = '', { silent = true } = {}) => {
    if (!user?.id) {
      return null
    }

    const { data, error: xpError } = await supabase.rpc('award_my_profile_xp', {
      activity_key: activityKey,
      activity_ref: activityRef ?? '',
    })

    if (xpError) {
      if (silent) {
        console.warn(`[xp] ${activityKey} award failed: ${xpError.message}`)
        return null
      }

      throw xpError
    }

    if (data?.profile) {
      applyProfileRecord(data.profile)
    }

    if (data?.awarded && data?.xp_earned > 0) {
      setLastXpAward(data)
    }

    return data
  }, [applyProfileRecord, user?.id])

  const claimDailyCheckIn = useCallback(async () => {
    if (!user?.id) {
      return null
    }

    const { data, error: checkInError } = await supabase.rpc('claim_daily_check_in')

    if (checkInError) {
      throw checkInError
    }

    if (data?.profile) {
      applyProfileRecord(data.profile)
    }

    setDailyCheckInResult(data)

    if (data?.xp_earned > 0) {
      setLastXpAward({
        awarded: true,
        xp_earned: data.xp_earned,
        label: data.milestone_unlocked ? 'Daily Ops milestone' : 'Daily Ops claimed',
        activity_key: 'daily_check_in',
        profile: data.profile,
      })
    }

    return data
  }, [applyProfileRecord, user?.id])

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
        fetchProfiles().catch((profilesError) => setError(profilesError.message))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_chat_messages' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setPublicMessages((currentMessages) =>
            currentMessages.filter((message) => message.id !== payload.old?.id),
          )
          return
        }

        const nextMessage = payload.new
        if (!nextMessage?.id) {
          return
        }

        const profileById = new Map(profilesRef.current.map((nextProfile) => [nextProfile.id, nextProfile]))
        setPublicMessages((currentMessages) =>
          upsertMessageRecord(
            currentMessages,
            {
              ...nextMessage,
              profile: profileById.get(nextMessage.user_id),
              reactions: currentMessages.find((message) => message.id === nextMessage.id)?.reactions ?? [],
            },
            100,
          ),
        )
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, (payload) => {
        if (!user?.id) {
          return
        }

        if (payload.eventType === 'DELETE') {
          setDirectMessages((currentMessages) =>
            currentMessages.filter((message) => message.id !== payload.old?.id),
          )
          return
        }

        const nextMessage = payload.new
        if (!nextMessage?.id || (nextMessage.sender_id !== user.id && nextMessage.recipient_id !== user.id)) {
          return
        }

        const profileById = new Map(profilesRef.current.map((nextProfile) => [nextProfile.id, nextProfile]))
        setDirectMessages((currentMessages) =>
          upsertMessageRecord(
            currentMessages,
            {
              ...nextMessage,
              sender: profileById.get(nextMessage.sender_id),
              recipient: profileById.get(nextMessage.recipient_id),
              reactions: currentMessages.find((message) => message.id === nextMessage.id)?.reactions ?? [],
            },
            300,
          ),
        )
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        fetchPlayers().catch((playersError) => setError(playersError.message))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_chat_mutes' }, () => {
        fetchPublicChatMutes().catch((mutesError) => setError(mutesError.message))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moderation_events' }, () => {
        fetchModerationEvents().catch((eventsError) => setError(eventsError.message))
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
  }, [fetchModerationEvents, fetchPlayers, fetchProfiles, fetchPublicChatMutes, refreshClanState, user?.id])

  useEffect(() => {
    if (!user?.id) {
      return undefined
    }

    const pollMessages = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return
      }
      fetchProfiles()
        .then((nextProfiles) =>
          Promise.all([
            fetchPublicMessages(nextProfiles),
            fetchDirectMessages(user.id, nextProfiles),
            fetchPublicChatMutes(nextProfiles),
            fetchModerationEvents(nextProfiles),
            refreshClanState(nextProfiles),
          ]),
        )
        .catch((messagesError) => setError(messagesError.message))
    }

    // Realtime keeps state fresh; this is a slow visibility-gated safety net.
    const intervalId = window.setInterval(pollMessages, 60000)
    return () => window.clearInterval(intervalId)
  }, [fetchDirectMessages, fetchModerationEvents, fetchProfiles, fetchPublicChatMutes, fetchPublicMessages, refreshClanState, user?.id])

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
    const nextAvatarIcon = updates.avatarIcon || defaultAvatarIconKey
    const currentAvatarIcon = profile?.avatar_icon ?? defaultAvatarIconKey
    const previousBio = profile?.bio?.trim() ?? ''
    const nextBio = updates.bio?.trim() ?? ''
    const previousAccountIds = new Set(gameAccountIds(normalizeGameAccounts(profile?.game_accounts)).map((id) => id.toLowerCase()))
    const addedAccountIds = gameAccountIds(normalizedGameAccounts).filter((id) => !previousAccountIds.has(id.toLowerCase()))

    if (!canUseAvatarIcon(nextAvatarIcon, role, Number(profile?.login_streak_count ?? 0)) && nextAvatarIcon !== currentAvatarIcon) {
      throw new Error(`That avatar is locked: ${getAvatarIconLockLabel(nextAvatarIcon)}.`)
    }

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: updates.displayName?.trim() ?? '',
        bio: updates.bio?.trim() ?? '',
        avatar_icon: nextAvatarIcon,
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

    applyProfileRecord(data)
    await awardActivityXp('profile_saved')

    if (!previousBio && nextBio) {
      await awardActivityXp('profile_bio_added')
    }

    if (nextAvatarIcon !== currentAvatarIcon) {
      await awardActivityXp('profile_avatar_updated')
    }

    if (addedAccountIds.length) {
      await Promise.all(addedAccountIds.map((accountId) => awardActivityXp('profile_game_account_added', accountId)))
    } else if (normalizedGameAccounts.length) {
      await awardActivityXp('profile_game_accounts_updated')
    }

    await refresh()
  }

  async function updateSupporterPreferences({ badgeVisible, wallVisible, displayName }) {
    if (!user) {
      throw new Error('You must be logged in to update supporter preferences.')
    }

    const { data, error: preferencesError } = await supabase.rpc('update_supporter_preferences', {
      badge_visible: Boolean(badgeVisible),
      wall_visible: Boolean(wallVisible),
      display_name: displayName?.trim() || null,
    })

    if (preferencesError) {
      throw preferencesError
    }

    applyProfileRecord(data)
    await Promise.all([fetchSupporterWall(), fetchProfiles()])
    return data
  }

  async function adminRecordDonation({ profileId, amountCents, provider, reference, message, isPublic }) {
    if (!isAdmin) {
      throw new Error('Only admins can record donations.')
    }

    const { data, error: donationError } = await supabase.rpc('admin_record_donation', {
      target_profile_id: profileId,
      amount_cents: amountCents,
      provider,
      reference,
      donor_message: message,
      is_public: Boolean(isPublic),
    })

    if (donationError) {
      throw donationError
    }

    await refresh()
    return data
  }

  async function adminGrantSupporterBadge({ profileId, tier, displayName, wallVisible }) {
    if (!isAdmin) {
      throw new Error('Only admins can grant supporter badges.')
    }

    const { data, error: grantError } = await supabase.rpc('admin_grant_supporter_badge', {
      p_target_profile_id: profileId,
      p_tier: tier,
      p_display_name: displayName?.trim() || null,
      p_wall_visible: Boolean(wallVisible),
    })

    if (grantError) {
      throw grantError
    }

    applyProfileRecord(data)
    await Promise.all([fetchSupporterWall(), fetchProfiles(), fetchDonationAdmin()])
    return data
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

    await awardActivityXp('clan_created', data?.id ?? tag)
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

    await awardActivityXp('clan_join_requested', clanId)
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

    await awardActivityXp('clan_invite_sent', `${clanId}:${userId}`)
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

  async function updateClan(clanId, { name, tag, description, badgeIcon }) {
    const { data, error: updateClanError } = await supabase.rpc('update_clan', {
      target_clan_id: clanId,
      clan_name: name,
      clan_tag: tag,
      clan_description: description,
      clan_badge_icon: badgeIcon,
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

  async function sendClanMessage(clanId, body, media = null) {
    if (!user) {
      throw new Error('You must be logged in to send clan chat.')
    }

    const trimmedBody = body.trim()
    const mediaUrl = media?.mediaUrl || null
    const mediaType = media?.mediaType || null

    const { data: sentMessage, error: clanMessageError } = await supabase
      .from('clan_messages')
      .insert({
        clan_id: clanId,
        user_id: user.id,
        body: trimmedBody,
        media_url: mediaUrl,
        media_type: mediaType,
      })
      .select('id, clan_id, user_id, body, media_url, media_type, created_at, deleted_at, deleted_by')
      .single()

    if (clanMessageError) {
      throw clanMessageError
    }

    const profileById = new Map(profilesRef.current.map((nextProfile) => [nextProfile.id, nextProfile]))
    await awardActivityXp('clan_message_sent', clanId)
    return {
      ...sentMessage,
      profile: profileById.get(sentMessage.user_id),
      deletedByProfile: profileById.get(sentMessage.deleted_by),
      reactions: [],
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

    const removingExistingReaction = existingReaction?.reaction === reaction

    if (removingExistingReaction) {
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

    if (!removingExistingReaction) {
      await awardActivityXp('message_reaction_set', `${scope}:${messageId}`)
    }

    return nextReactions
  }

  const markPublicChatRead = useCallback(() => {
    if (!user?.id || !publicMessages.length || typeof window === 'undefined') {
      return
    }

    const latestMessageId = publicMessages[publicMessages.length - 1]?.id
    if (!latestMessageId) {
      return
    }

    window.localStorage.setItem(`${publicChatReadStoragePrefix}${user.id}`, latestMessageId)
    setLastReadPublicChatMessageId(latestMessageId)
  }, [publicMessages, user?.id])

  async function sendPublicMessage(body, media = null, mentionedUserIds = [], mentionEveryone = false) {
    if (!user) {
      throw new Error('You must be logged in to chat.')
    }

    if (mentionEveryone && !isModerator) {
      throw new Error('Only moderators and admins can tag @all.')
    }

    if (activePublicChatMute) {
      throw new Error(`Public chat muted until ${new Date(activePublicChatMute.ends_at).toLocaleString()}.`)
    }

    const trimmedBody = body.trim()
    const mediaUrl = media?.mediaUrl || null
    const mediaType = media?.mediaType || null

    const { data: sentMessage, error: messageError } = await supabase
      .from('public_chat_messages')
      .insert({
        user_id: user.id,
        body: trimmedBody,
        media_url: mediaUrl,
        media_type: mediaType,
      })
      .select('id, user_id, body, media_url, media_type, created_at')
      .single()

    if (messageError) {
      throw messageError
    }

    const profileById = new Map(profilesRef.current.map((nextProfile) => [nextProfile.id, nextProfile]))
    setPublicMessages((currentMessages) =>
      upsertMessageRecord(
        currentMessages,
        {
          ...sentMessage,
          profile: profileById.get(sentMessage.user_id),
          reactions: [],
        },
        100,
      ),
    )
    const mentionRecipientIds = Array.from(new Set(mentionedUserIds)).filter((recipientId) => recipientId && recipientId !== user.id)
    if (mentionRecipientIds.length || mentionEveryone) {
      const displayName = profile?.display_name || profileDisplayName(user)
      const clanTag = profile?.clan_tag || ''

      withTimeout(
        supabase.functions.invoke('send-push', {
          body: {
            type: 'public-mention',
            senderUserId: user.id,
            recipientUserIds: mentionRecipientIds,
            mentionEveryone,
            displayName,
            clanTag,
            message: trimmedBody || (mediaType === 'gif' ? 'tagged you with a GIF' : 'tagged you with an image'),
          },
        }),
        12000,
        'Mention notification request timed out.',
      )
        .then(({ data: pushResult, error: pushError }) => {
          if (pushError) {
            console.warn(`[push] Public mention delivered in chat but push failed: ${pushError.message}`)
            return
          }

          if (!pushResult?.sent) {
            console.warn('[push] Public mention delivered in chat but tagged users have no active push subscription.')
          }
        })
        .catch((pushError) => {
          console.warn(`[push] Public mention delivered in chat but push failed: ${pushError.message}`)
        })
    }
    await awardActivityXp('public_message_sent')
  }

  async function sendDirectMessage(recipientId, body, media = null) {
    if (!user) {
      throw new Error('You must be logged in to send messages.')
    }

    const trimmedBody = body.trim()
    const mediaUrl = media?.mediaUrl || null
    const mediaType = media?.mediaType || null

    const { data: sentMessage, error: messageError } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        body: trimmedBody,
        media_url: mediaUrl,
        media_type: mediaType,
      })
      .select('id, sender_id, recipient_id, body, media_url, media_type, read_at, created_at')
      .single()

    if (messageError) {
      throw messageError
    }

    const profileById = new Map(profilesRef.current.map((nextProfile) => [nextProfile.id, nextProfile]))
    setDirectMessages((currentMessages) => {
      if (currentMessages.some((currentMessage) => currentMessage.id === sentMessage.id)) {
        return currentMessages
      }

      return upsertMessageRecord(
        currentMessages,
        {
          ...sentMessage,
          sender: profileById.get(sentMessage.sender_id),
          recipient: profileById.get(sentMessage.recipient_id),
          reactions: [],
        },
        300,
      )
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
          message: trimmedBody || (mediaType === 'gif' ? 'sent a GIF' : 'sent an image'),
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

    await awardActivityXp('direct_message_sent', recipientId)
    return sentMessage
  }

  async function markDirectMessageRead(messageId) {
    return markDirectMessagesRead([messageId])
  }

  async function markDirectMessagesRead(messageIds) {
    if (!user || !messageIds?.length) {
      return
    }

    const uniqueIds = Array.from(new Set(messageIds))
    const readAt = new Date().toISOString()

    // Optimistic local patch first so the UI doesn't flicker waiting for realtime.
    setDirectMessages((currentMessages) =>
      currentMessages.map((directMessage) =>
        uniqueIds.includes(directMessage.id) && !directMessage.read_at
          ? { ...directMessage, read_at: readAt }
          : directMessage,
      ),
    )

    const { error: readError } = await supabase
      .from('direct_messages')
      .update({ read_at: readAt })
      .in('id', uniqueIds)
      .eq('recipient_id', user.id)
      .is('read_at', null)

    if (readError) {
      throw readError
    }
    // Realtime listener will pick up the update; no manual refetch needed.
  }

  async function deletePublicMessage(messageId) {
    if (!isModerator) {
      throw new Error('Only moderators and admins can delete public chat.')
    }

    const { error: deleteError } = await supabase.rpc('delete_public_chat_message', {
      target_message_id: messageId,
    })

    if (deleteError) {
      throw deleteError
    }

    setPublicMessages((currentMessages) => currentMessages.filter((message) => message.id !== messageId))
    await fetchModerationEvents()
  }

  async function setPlayerVerdict(playerId, nextStatus, note = '') {
    if (!isModerator) {
      throw new Error('Only moderators and admins can update verdicts.')
    }

    const { error: verdictError } = await supabase.rpc('set_player_moderation_status', {
      target_player_id: playerId,
      next_status: nextStatus,
      next_note: note,
    })

    if (verdictError) {
      throw verdictError
    }

    await refresh()
  }

  async function quarantinePlayer(playerId, reason = '') {
    if (!isModerator) {
      throw new Error('Only moderators and admins can quarantine entries.')
    }

    const { error: quarantineError } = await supabase.rpc('quarantine_player', {
      target_player_id: playerId,
      reason,
    })

    if (quarantineError) {
      throw quarantineError
    }

    await refresh()
  }

  async function restorePlayer(playerId) {
    if (!isModerator) {
      throw new Error('Only moderators and admins can restore entries.')
    }

    const { error: restoreError } = await supabase.rpc('restore_quarantined_player', {
      target_player_id: playerId,
    })

    if (restoreError) {
      throw restoreError
    }

    await refresh()
  }

  async function mutePublicChatUser(userId, minutes, reason = '') {
    if (!isModerator) {
      throw new Error('Only moderators and admins can mute public chat.')
    }

    const { error: muteError } = await supabase.rpc('mute_public_chat_user', {
      target_user_id: userId,
      duration_minutes: minutes,
      reason,
    })

    if (muteError) {
      throw muteError
    }

    const nextProfiles = profilesRef.current
    await Promise.all([fetchPublicChatMutes(nextProfiles), fetchModerationEvents(nextProfiles)])
  }

  async function clearPublicChatMute(muteId) {
    if (!isModerator) {
      throw new Error('Only moderators and admins can clear public chat mutes.')
    }

    const { error: clearError } = await supabase.rpc('clear_public_chat_mute', {
      target_mute_id: muteId,
    })

    if (clearError) {
      throw clearError
    }

    const nextProfiles = profilesRef.current
    await Promise.all([fetchPublicChatMutes(nextProfiles), fetchModerationEvents(nextProfiles)])
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

    await awardActivityXp('intel_added', data.id)
    await refresh()
    return data
  }

  async function deletePlayer(playerId) {
    if (!isAdmin) {
      throw new Error('Only admins can permanently delete entries.')
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
              lastKillUserId: result.last_kill_user_id ?? currentPlayer.lastKillUserId,
              lastKillDisplayName: result.last_kill_display_name ?? currentPlayer.lastKillDisplayName,
              lastKillProfileClanTag: result.last_kill_profile_clan_tag ?? currentPlayer.lastKillProfileClanTag,
              lastKillUserTotal: result.last_kill_user_total ?? currentPlayer.lastKillUserTotal,
              lastKillClanId: result.last_kill_clan_id ?? currentPlayer.lastKillClanId,
              lastKillClanTag: result.last_kill_clan_tag ?? currentPlayer.lastKillClanTag,
              lastKillClanTotal: result.last_kill_clan_total ?? currentPlayer.lastKillClanTotal,
              lastKillAt: result.last_kill_at ?? currentPlayer.lastKillAt,
            }
          : currentPlayer,
      ),
    )

    if (result.accepted) {
      fetchProfile(user.id).catch((profileError) => setError(profileError.message))
    }

    return result
  }

  const fetchPlayerKillLog = useCallback(async (playerId) => {
    const { data, error: logError } = await supabase.rpc('list_player_kill_log', {
      target_player_id: playerId,
    })

    if (logError) {
      throw logError
    }

    return (data ?? []).map((entry) => ({
      killId: entry.kill_id,
      playerId: entry.player_id,
      userId: entry.user_id,
      displayName: entry.display_name ?? '',
      profileClanTag: entry.profile_clan_tag ?? '',
      clanId: entry.clan_id ?? null,
      clanTag: entry.clan_tag ?? '',
      loggedAt: entry.logged_at,
      userKillTotal: entry.user_kill_total ?? 0,
      clanKillTotal: entry.clan_kill_total ?? null,
    }))
  }, [])

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
    await awardActivityXp('drop_in')
  }

  async function enablePushNotifications() {
    if (!user) return false
    const enabled = await subscribeToPush(user.id)
    if (enabled) {
      await awardActivityXp('push_enabled')
    }
    return enabled
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
    publicChatMutes,
    activePublicChatMute,
    moderationEvents,
    clanDirectory,
    myClanMembership,
    myClan: myClanMembership?.clan ?? null,
    myClanRole: myClanMembership?.role ?? '',
    myClanMembers,
    clanJoinRequests,
    clanInvites,
    pushSummary,
    pushEvents,
    donations,
    supporterWall,
    dailyCheckInResult,
    lastXpAward,
    unreadDirectMessageCount,
    unreadPublicChatCount,
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
    claimDailyCheckIn,
    awardActivityXp,
    clearLastXpAward: () => setLastXpAward(null),
    signIn,
    signUp,
    signOut,
    addPlayer,
    updatePlayer,
    setPlayerVerdict,
    quarantinePlayer,
    restorePlayer,
    registerPlayerKill,
    fetchPlayerKillLog,
    deletePlayer,
    deleteProfileAccount,
    claimAdmin,
    setProfileRole,
    updateProfile,
    updateSupporterPreferences,
    adminRecordDonation,
    adminGrantSupporterBadge,
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
    markPublicChatRead,
    markDirectMessageRead,
    markDirectMessagesRead,
    deletePublicMessage,
    mutePublicChatUser,
    clearPublicChatMute,
    deleteClanMessage,
    fetchClanMembers,
    fetchClanMessages,
    fetchClanAuditEvents,
    reorderPlayers,
    broadcastOnline,
    enablePushNotifications,
    fetchPushConsole,
    fetchDonationAdmin,
    sendCustomPush,
  }

  return <IntelContext.Provider value={value}>{children}</IntelContext.Provider>
}

export default IntelProvider
