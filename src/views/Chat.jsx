import { Crown, Eye, MessageSquare, Reply, Shield } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ClanBadge from '../components/ClanBadge.jsx'
import MediaComposer from '../components/MediaComposer.jsx'
import MessageMedia from '../components/MessageMedia.jsx'
import MessageReplyPreview from '../components/MessageReplyPreview.jsx'
import MessageReactions from '../components/MessageReactions.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import SupporterBadge from '../components/SupporterBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { useChatAutoScroll } from '../utils/chatScroll.js'
import { useRealtimeTyping } from '../utils/chatTyping.js'
import { findActiveMentionToken, hasEveryoneMention, insertMentionEveryoneToken, insertMentionToken, mentionHandle, mentionLabel, mentionedProfileIds } from '../utils/mentions.js'
import { useMobileViewportPanelHeight } from '../utils/mobileViewport.js'
import { clanPrefix, displayProfileName, isProfileOnline } from '../utils/profiles.js'

function isSameDay(firstValue, secondValue) {
  const first = new Date(firstValue)
  const second = new Date(secondValue)

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  )
}

function formatDayLabel(value) {
  const current = new Date(value)
  const now = new Date()
  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)

  if (isSameDay(current, now)) {
    return 'Today'
  }

  if (isSameDay(current, yesterday)) {
    return 'Yesterday'
  }

  return current.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMessageTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

function clanMessageMatches(currentMessage, nextMessage) {
  return (
    currentMessage?.id === nextMessage?.id &&
    currentMessage?.clan_id === nextMessage?.clan_id &&
    currentMessage?.user_id === nextMessage?.user_id &&
    currentMessage?.body === nextMessage?.body &&
    currentMessage?.media_url === nextMessage?.media_url &&
    currentMessage?.media_type === nextMessage?.media_type &&
    currentMessage?.created_at === nextMessage?.created_at &&
    currentMessage?.deleted_at === nextMessage?.deleted_at &&
    currentMessage?.deleted_by === nextMessage?.deleted_by &&
    reactionListsMatch(currentMessage?.reactions, nextMessage?.reactions)
  )
}

function mergeClanMessages(currentMessages, nextMessages) {
  const currentById = new Map(currentMessages.map((message) => [message.id, message]))
  let changed = currentMessages.length !== nextMessages.length
  const mergedMessages = [...nextMessages]
    .map((nextMessage) => {
      const currentMessage = currentById.get(nextMessage.id)
      if (currentMessage && clanMessageMatches(currentMessage, nextMessage)) {
        return currentMessage
      }

      changed = true
      return nextMessage
    })
    .sort((first, second) => new Date(first.created_at) - new Date(second.created_at))

  if (!changed && mergedMessages.every((message, index) => message === currentMessages[index])) {
    return currentMessages
  }

  return mergedMessages
}

function ProfileInitial({ profile, mine, online }) {
  return <ProfileAvatar className={mine ? 'ring-red-400/20' : ''} profile={profile} online={online} showOnline size="sm" />
}

function Chat() {
  const [searchParams] = useSearchParams()
  const {
    user,
    profile,
    isAdmin,
    isModerator,
    isAuthenticated,
    activePublicChatMute,
    publicMessages,
    profiles,
    clanDirectory,
    myClan,
    myClanRole,
    onlineUserIds,
    sendPublicMessage,
    sendClanMessage,
    fetchClanMessages,
    setMessageReaction,
    markPublicChatRead,
  } = useIntel()
  const [message, setMessage] = useState('')
  const [pendingMedia, setPendingMedia] = useState(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [activeRoom, setActiveRoom] = useState(searchParams.get('room') === 'clan' ? 'clan' : 'public')
  const [selectedClanId, setSelectedClanId] = useState(searchParams.get('clan') || '')
  const [clanMessageState, setClanMessageState] = useState({ clanId: '', messages: [] })
  const [clanLoading, setClanLoading] = useState(false)
  const [replyToMessage, setReplyToMessage] = useState(null)
  const myClanId = myClan?.id ?? ''

  const availableClanRooms = useMemo(() => {
    const roomsById = new Map()

    if (myClan) {
      roomsById.set(myClan.id, myClan)
    }

    if (isAdmin) {
      clanDirectory.forEach((clan) => {
        roomsById.set(clan.id, clan)
      })
    }

    return Array.from(roomsById.values()).sort((first, second) => first.name.localeCompare(second.name))
  }, [clanDirectory, isAdmin, myClan])

  const canUseClanRoom = Boolean(myClanId || isAdmin)
  const resolvedSelectedClanId = useMemo(() => {
    if (!canUseClanRoom) {
      return ''
    }

    if (selectedClanId && availableClanRooms.some((clan) => clan.id === selectedClanId)) {
      return selectedClanId
    }

    if (myClanId && availableClanRooms.some((clan) => clan.id === myClanId)) {
      return myClanId
    }

    return availableClanRooms[0]?.id || ''
  }, [availableClanRooms, canUseClanRoom, myClanId, selectedClanId])
  const [chatPanelRef, chatPanelHeight] = useMobileViewportPanelHeight(`${activeRoom}:${canUseClanRoom}:${resolvedSelectedClanId}:${selectedClanId}`)
  const selectedClan = availableClanRooms.find((clan) => clan.id === resolvedSelectedClanId) ?? null
  const canSendClanRoomMessage = Boolean(resolvedSelectedClanId && myClanId === resolvedSelectedClanId)
  const clanMessages =
    clanMessageState.clanId === resolvedSelectedClanId ? clanMessageState.messages : []
  const showClanLoading =
    activeRoom === 'clan' && clanLoading && clanMessageState.clanId !== resolvedSelectedClanId
  const activeMessages = activeRoom === 'clan' ? clanMessages : publicMessages
  const publicChatMuted = activeRoom === 'public' && Boolean(activePublicChatMute)
  const activeRoomKey = activeRoom === 'clan' ? `clan:${resolvedSelectedClanId}` : 'public'
  const lastActiveMessageId = activeMessages[activeMessages.length - 1]?.id ?? ''
  const activeMessagesLength = activeMessages.length
  const {
    forceStickToBottom,
    handleScroll,
    scrollRef,
    scrollToLatestMessage,
  } = useChatAutoScroll({
    bottomKey: `${activeMessagesLength}:${lastActiveMessageId}`,
    panelHeight: chatPanelHeight,
    resetKey: activeRoomKey,
  })
  const activeMentionToken = useMemo(() => {
    if (activeRoom !== 'public' || publicChatMuted) {
      return null
    }

    return findActiveMentionToken(message)
  }, [activeRoom, message, publicChatMuted])
  const mentionSuggestions = useMemo(() => {
    if (!activeMentionToken) {
      return []
    }

    const query = activeMentionToken.query.toLowerCase()
    return profiles
      .filter((nextProfile) => {
        const handle = mentionHandle(nextProfile).toLowerCase()
        const label = mentionLabel(nextProfile).toLowerCase()
        const activisionIds = (nextProfile.activision_ids ?? []).join(' ').toLowerCase()
        return !query || handle.includes(query) || label.includes(query) || activisionIds.includes(query)
      })
      .slice(0, 6)
  }, [activeMentionToken, profiles])
  const showMentionEveryoneSuggestion = Boolean(
    activeMentionToken &&
    isModerator &&
    'all'.startsWith(activeMentionToken.query.toLowerCase()),
  )
  const { sendTyping, typingUsers } = useRealtimeTyping({
    enabled: activeRoom === 'public' && isAuthenticated && !publicChatMuted,
    profile,
    roomKey: 'public',
    user,
  })
  const typingLabel = useMemo(() => {
    if (activeRoom !== 'public' || !typingUsers.length) {
      return ''
    }

    const names = typingUsers.slice(0, 2).map((typingUser) => typingUser.displayName)
    return typingUsers.length > 2 ? `${names.join(', ')} and ${typingUsers.length - 2} more typing...` : `${names.join(', ')} typing...`
  }, [activeRoom, typingUsers])
  const activeReplyToMessage = useMemo(() => {
    if (!replyToMessage || replyToMessage.roomKey !== activeRoomKey || activeRoom !== 'public') {
      return null
    }

    return activeMessages.some((chatMessage) => chatMessage.id === replyToMessage.message.id) ? replyToMessage.message : null
  }, [activeMessages, activeRoom, activeRoomKey, replyToMessage])

  useEffect(() => {
    if (activeRoom === 'public') {
      markPublicChatRead()
    }
  }, [activeMessagesLength, activeRoom, lastActiveMessageId, markPublicChatRead])

  useEffect(() => {
    let cancelled = false

    if (activeRoom !== 'clan' || !resolvedSelectedClanId) {
      return undefined
    }

    const loadClanMessages = () => {
      setClanLoading(true)
      fetchClanMessages(resolvedSelectedClanId)
        .then((nextMessages) => {
          if (!cancelled) {
            setClanMessageState((currentState) => ({
              clanId: resolvedSelectedClanId,
              messages:
                currentState.clanId === resolvedSelectedClanId
                  ? mergeClanMessages(currentState.messages, nextMessages)
                  : nextMessages,
            }))
          }
        })
        .catch((chatError) => {
          if (!cancelled) {
            setError(chatError.message)
          }
        })
        .finally(() => {
          if (!cancelled) {
            setClanLoading(false)
          }
        })
    }

    loadClanMessages()
    const intervalId = window.setInterval(loadClanMessages, 15000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [activeRoom, fetchClanMessages, resolvedSelectedClanId])

  function handleRoomChange(nextRoom) {
    setActiveRoom(nextRoom)
    setReplyToMessage(null)
    setError('')
  }

  function handleClanChange(event) {
    setSelectedClanId(event.target.value)
    setError('')
  }

  async function handleSend(event) {
    event.preventDefault()

    const nextMessage = message.trim()
    const nextMedia = pendingMedia
    const nextReplyToMessage = activeRoom === 'public' ? activeReplyToMessage : null

    if (sending || (!nextMessage && !nextMedia?.mediaUrl)) {
      return
    }

    setSending(true)
    setError('')
    setMessage('')
    setPendingMedia(null)
    setReplyToMessage(null)
    forceStickToBottom()

    try {
      if (activeRoom === 'clan') {
        if (!resolvedSelectedClanId) {
          throw new Error('Choose a clan room first.')
        }

        if (!canSendClanRoomMessage) {
          throw new Error('Only active clan members can send in this room.')
        }

        const sentMessage = await sendClanMessage(resolvedSelectedClanId, nextMessage, nextMedia)
        setClanMessageState((currentState) => ({
          clanId: resolvedSelectedClanId,
          messages:
            currentState.clanId === resolvedSelectedClanId
              ? mergeClanMessages(currentState.messages, [...currentState.messages, sentMessage])
              : [sentMessage],
        }))
        scrollToLatestMessage()
      } else {
        const mentionEveryone = hasEveryoneMention(nextMessage)
        if (mentionEveryone && !isModerator) {
          throw new Error('Only moderators and admins can tag @all.')
        }

        await sendPublicMessage(nextMessage, nextMedia, mentionedProfileIds(nextMessage, profiles), mentionEveryone, nextReplyToMessage?.id ?? '')
        scrollToLatestMessage()
      }
    } catch (chatError) {
      setMessage(nextMessage)
      setPendingMedia(nextMedia)
      setReplyToMessage(nextReplyToMessage ? { roomKey: activeRoomKey, message: nextReplyToMessage } : null)
      setError(chatError.message)
    } finally {
      setSending(false)
    }
  }

  async function handleReaction(chatMessage, reaction) {
    setError('')

    try {
      const scope = activeRoom === 'clan' ? 'clan' : 'public'
      const nextReactions = await setMessageReaction(scope, chatMessage.id, reaction)

      if (scope === 'clan') {
        setClanMessageState((currentState) => ({
          ...currentState,
          messages: currentState.messages.map((message) =>
            message.id === chatMessage.id ? { ...message, reactions: nextReactions } : message,
          ),
        }))
      }
    } catch (reactionError) {
      setError(reactionError.message)
    }
  }

  function handleMentionSelect(nextProfile) {
    if (!activeMentionToken) {
      return
    }

    setMessage((currentMessage) => insertMentionToken(currentMessage, activeMentionToken, nextProfile))
  }

  function handleMentionEveryoneSelect() {
    if (!activeMentionToken) {
      return
    }

    setMessage((currentMessage) => insertMentionEveryoneToken(currentMessage, activeMentionToken))
  }

  const mentionAccessory = mentionSuggestions.length || showMentionEveryoneSuggestion ? (
    <div className="mb-2 rounded-2xl border border-white/10 bg-zinc-950/95 p-1.5 shadow-xl shadow-black/30">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {showMentionEveryoneSuggestion ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleMentionEveryoneSelect}
            className="flex min-w-[11rem] items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/12 px-2.5 py-2 text-left transition hover:border-red-300/60 hover:bg-red-500/18"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-300/30 bg-red-500/15 text-[0.62rem] font-black uppercase tracking-[0.12em] text-red-100">
              All
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.72rem] font-black uppercase tracking-[0.08em] text-white">
                All operators
              </span>
              <span className="block truncate text-[0.62rem] font-bold text-red-200/80">@all</span>
            </span>
          </button>
        ) : null}
        {mentionSuggestions.map((nextProfile) => (
          <button
            key={nextProfile.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => handleMentionSelect(nextProfile)}
            className="flex min-w-[11rem] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-left transition hover:border-red-400/40 hover:bg-red-500/10"
          >
            <ProfileAvatar profile={nextProfile} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.72rem] font-black uppercase tracking-[0.08em] text-white">
                {mentionLabel(nextProfile)}
              </span>
              <span className="block truncate text-[0.62rem] font-bold text-red-200/80">@{mentionHandle(nextProfile)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  ) : null
  const composerAccessory = (
    <>
      {activeRoom === 'public' && activeReplyToMessage ? (
        <MessageReplyPreview
          currentUserId={user?.id}
          message={activeReplyToMessage}
          onCancel={() => setReplyToMessage(null)}
          tone="composer"
        />
      ) : null}
      {mentionAccessory}
    </>
  )

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader eyebrow="Chat Network" title="Login Required">
          Public chat and clan rooms are available to signed-in users.
        </PageHeader>
        <Link
          to="/auth"
          className="inline-flex min-h-11 items-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100"
        >
          Login to chat
        </Link>
      </div>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="Chat Network" title="Squad Comms">
        Fast public calls, private clan traffic, clean reactions.
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleRoomChange('public')}
          className={[
            'rounded-full border px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] transition',
            activeRoom === 'public'
              ? 'border-red-500/60 bg-red-500/12 text-red-100'
              : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200',
          ].join(' ')}
        >
          Public Room
        </button>
        <button
          type="button"
          onClick={() => handleRoomChange('clan')}
          className={[
            'rounded-full border px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] transition',
            activeRoom === 'clan'
              ? 'border-red-500/60 bg-red-500/12 text-red-100'
              : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200',
          ].join(' ')}
        >
          Clan Room
        </button>
      </div>

      {activeRoom === 'clan' && canUseClanRoom ? (
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="intel-label mb-2">Room Selection</p>
            <select
              value={resolvedSelectedClanId}
              onChange={handleClanChange}
              className="field min-h-12"
            >
              {availableClanRooms.map((clan) => (
                <option key={clan.id} value={clan.id}>
                  [{clan.tag}] {clan.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-gray-400">
            {selectedClan ? (
              <>
                <div className="flex items-center gap-3">
                  <ClanBadge clan={selectedClan} size="sm" />
                  <p className="font-black uppercase tracking-[0.08em] text-white">
                    [{selectedClan.tag}] {selectedClan.name}
                  </p>
                </div>
                <p className="mt-1 leading-6">
                  {selectedClan.id === myClanId
                    ? `Your active clan room. Role: ${myClanRole}.`
                    : 'Admin inspector view. Read-only unless you are also a member.'}
                </p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeRoom === 'clan' && !canUseClanRoom ? (
        <section className="panel mb-4 rounded-[1.8rem] p-5">
          <p className="intel-label mb-3">Clan Room Locked</p>
          <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
            Join or create a clan first
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Clan chat is private to members. Create a clan or request access from Clan HQ.
          </p>
          <Link
            to="/clans"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Open Clan HQ
          </Link>
        </section>
      ) : null}

      <section ref={chatPanelRef} style={chatPanelHeight ? { height: `${chatPanelHeight}px` } : undefined} className="chat-stable-panel flex h-[calc(var(--visual-viewport-height)-17rem)] min-h-0 flex-col rounded-[1.35rem] p-0 sm:h-[72vh] sm:min-h-[34rem] sm:rounded-[1.8rem]">
        <div className="flex min-h-16 flex-wrap items-center gap-2 border-b border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
          <div className="mr-auto min-w-0">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-gray-500">
              {activeRoom === 'clan' ? 'Clan Chat' : 'Public Chat'}
            </p>
            {activeRoom === 'clan' && selectedClan ? (
              <div className="flex items-center gap-2">
                <ClanBadge clan={selectedClan} size="sm" />
                <h2 className="truncate text-base font-black uppercase tracking-[0.04em] text-white">
                  [{selectedClan.tag}] {selectedClan.name}
                </h2>
              </div>
            ) : (
              <h2 className="truncate text-base font-black uppercase tracking-[0.04em] text-white">Live Room</h2>
            )}
          </div>
          {activeRoom === 'clan' && selectedClan ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">
              [{selectedClan.tag}] {selectedClan.name}
            </span>
          ) : null}
          {activeRoom === 'clan' && selectedClan && selectedClan.id !== myClanId ? (
            <span className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-yellow-100">
              <Eye className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              Admin View
            </span>
          ) : null}
          {activeRoom === 'clan' && selectedClan && selectedClan.id === myClanId && myClanRole === 'owner' ? (
            <span className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-yellow-100">
              <Crown className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              Owner
            </span>
          ) : null}
          {activeRoom === 'clan' && selectedClan && selectedClan.id === myClanId && myClanRole === 'officer' ? (
            <span className="rounded-full border border-orange-400/40 bg-orange-400/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-orange-100">
              <Shield className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              Officer
            </span>
          ) : null}
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="chat-scroll-surface min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
          {showClanLoading ? (
            <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-white/10 bg-black/35 p-5 text-center text-sm font-bold text-gray-500">
              Loading clan room…
            </div>
          ) : activeMessages.length ? (
            activeMessages.map((chatMessage, index) => {
              const online = isProfileOnline(chatMessage.profile, onlineUserIds)
              const wasDeleted = Boolean(chatMessage.deleted_at)
              const mine = chatMessage.user_id === user?.id
              const previousMessage = activeMessages[index - 1]
              const showDateDivider = !previousMessage || !isSameDay(previousMessage.created_at, chatMessage.created_at)

              return (
                <div key={chatMessage.id} className="mb-3">
                  {showDateDivider ? (
                    <div className="flex justify-center py-2">
                      <span className="rounded-full border border-white/10 bg-zinc-950/90 px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.18em] text-gray-400 shadow-lg shadow-black/30">
                        {formatDayLabel(chatMessage.created_at)}
                      </span>
                    </div>
                  ) : null}

                  <article className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {!mine ? <ProfileInitial profile={chatMessage.profile} mine={mine} online={online} /> : null}
                    <div className={`max-w-[86%] sm:max-w-[72%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`mb-1 flex max-w-full items-center gap-2 px-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                        <span className={`truncate text-[0.64rem] font-black uppercase tracking-[0.1em] ${mine ? 'text-red-200' : 'text-gray-300'}`}>
                          {mine ? 'You' : `${clanPrefix(chatMessage.profile)} ${displayProfileName(chatMessage.profile)}`}
                          {chatMessage.profile?.role === 'admin' ? (
                            <Crown className="ml-1.5 inline h-3.5 w-3.5 text-yellow-300" aria-hidden="true" />
                          ) : null}
                        </span>
                        {!mine ? <RoleBadge role={chatMessage.profile?.role} compact /> : null}
                        {!mine ? <SupporterBadge profile={chatMessage.profile} compact /> : null}
                      </div>
                      <div className={`relative min-w-20 rounded-2xl border px-3.5 pb-5 pt-2.5 text-[0.94rem] leading-6 shadow-lg shadow-black/20 ${
                        mine
                          ? 'rounded-br-md border-red-400/25 bg-gradient-to-br from-red-500/22 to-red-950/55 text-red-50'
                          : 'rounded-bl-md border-white/[0.08] bg-zinc-950/75 text-gray-100'
                      }`}>
                      {chatMessage.replyToMessage ? (
                        <MessageReplyPreview currentUserId={user?.id} message={chatMessage.replyToMessage} />
                      ) : null}
                      {!wasDeleted ? <MessageMedia mediaUrl={chatMessage.media_url} mediaType={chatMessage.media_type} /> : null}
                      <p className={`whitespace-pre-wrap break-words ${wasDeleted ? 'italic text-gray-400' : ''}`}>
                        {wasDeleted ? 'Message removed.' : chatMessage.body}
                      </p>
                      <span className={`absolute bottom-1.5 right-3 text-[0.58rem] font-bold ${mine ? 'text-red-100/55' : 'text-gray-500'}`}>
                        {formatMessageTime(chatMessage.created_at)}
                      </span>
                      {!wasDeleted ? (
                        <MessageReactions
                          align={mine ? 'right' : 'left'}
                          currentUserId={user?.id}
                          message={chatMessage}
                          onReact={handleReaction}
                        />
                      ) : null}
                      {!wasDeleted && activeRoom === 'public' ? (
                        <button
                          type="button"
                          onClick={() => setReplyToMessage({ roomKey: activeRoomKey, message: chatMessage })}
                          className="absolute -top-3 right-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-gray-400 shadow-lg shadow-black/40 transition hover:border-red-400/45 hover:bg-red-500/10 hover:text-gray-100"
                          aria-label="Reply to message"
                          title="Reply"
                        >
                          <Reply className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      ) : null}
                      </div>
                    </div>
                    {mine ? <ProfileInitial profile={chatMessage.profile} mine={mine} online={online} /> : null}
                  </article>
                </div>
              )
            })
          ) : (
            <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-white/10 bg-black/35 p-5 text-center text-sm font-bold text-gray-500">
              {activeRoom === 'clan' ? 'No clan messages yet.' : 'No chat yet. Ask who is playing.'}
            </div>
          )}
          {typingLabel ? (
            <div className="px-2 pb-1 pt-0 text-xs font-bold text-red-200/75">{typingLabel}</div>
          ) : null}
        </div>

        <MediaComposer
          value={message}
          onChange={setMessage}
          onSubmit={handleSend}
          pendingMedia={pendingMedia}
          onPendingMediaChange={setPendingMedia}
          onError={setError}
          placeholder={
            activeRoom === 'clan'
              ? canSendClanRoomMessage
                ? `Message ${selectedClan?.name || 'your clan'}`
                : 'Read-only room'
              : publicChatMuted
                ? 'Public chat muted'
              : "Yo who's playing?"
          }
          maxLength={activeRoom === 'clan' ? 1000 : 500}
          disabled={(activeRoom === 'clan' && !canSendClanRoomMessage) || publicChatMuted}
          sending={sending}
          accessory={composerAccessory}
          onTyping={activeRoom === 'public' ? sendTyping : undefined}
        />
        {publicChatMuted ? (
          <p className="px-4 pb-3 text-sm font-bold text-orange-200">
            Public chat muted until {new Date(activePublicChatMute.ends_at).toLocaleString()}.
          </p>
        ) : null}
        {activeRoom === 'clan' && !canSendClanRoomMessage && selectedClan ? (
          <p className="px-4 pb-3 text-sm font-bold text-gray-500">
            {selectedClan.id === myClanId
              ? 'You need an active clan membership to send here.'
              : 'Admin inspector mode is read-only for clans you are not a member of.'}
          </p>
        ) : null}
        {error ? <p className="px-4 pb-3 text-sm font-bold text-red-200">{error}</p> : null}
      </section>
    </div>
  )
}

export default Chat
