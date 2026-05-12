import { Crown, Eye, MessageSquare, Send, Shield } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import MessageReactions from '../components/MessageReactions.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'
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
    isAdmin,
    isAuthenticated,
    publicMessages,
    clanDirectory,
    myClan,
    myClanRole,
    onlineUserIds,
    sendPublicMessage,
    sendClanMessage,
    fetchClanMessages,
    setMessageReaction,
  } = useIntel()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [activeRoom, setActiveRoom] = useState(searchParams.get('room') === 'clan' ? 'clan' : 'public')
  const [selectedClanId, setSelectedClanId] = useState(searchParams.get('clan') || '')
  const [clanMessageState, setClanMessageState] = useState({ clanId: '', messages: [] })
  const [clanLoading, setClanLoading] = useState(false)
  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
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
  const selectedClan = availableClanRooms.find((clan) => clan.id === resolvedSelectedClanId) ?? null
  const canSendClanRoomMessage = Boolean(resolvedSelectedClanId && myClanId === resolvedSelectedClanId)
  const clanMessages =
    clanMessageState.clanId === resolvedSelectedClanId ? clanMessageState.messages : []
  const showClanLoading =
    activeRoom === 'clan' && clanLoading && clanMessageState.clanId !== resolvedSelectedClanId
  const activeMessages = activeRoom === 'clan' ? clanMessages : publicMessages

  const scrollToLatestMessage = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const scrollElement = scrollRef.current
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }
        bottomRef.current?.scrollIntoView({ block: 'end' })
      })
    })
  }, [])

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
    setError('')
  }

  function handleClanChange(event) {
    setSelectedClanId(event.target.value)
    setError('')
  }

  async function handleSend(event) {
    event.preventDefault()

    const nextMessage = message.trim()

    if (sending || !nextMessage) {
      return
    }

    setSending(true)
    setError('')
    setMessage('')

    try {
      if (activeRoom === 'clan') {
        if (!resolvedSelectedClanId) {
          throw new Error('Choose a clan room first.')
        }

        if (!canSendClanRoomMessage) {
          throw new Error('Only active clan members can send in this room.')
        }

        const sentMessage = await sendClanMessage(resolvedSelectedClanId, nextMessage)
        setClanMessageState((currentState) => ({
          clanId: resolvedSelectedClanId,
          messages:
            currentState.clanId === resolvedSelectedClanId
              ? mergeClanMessages(currentState.messages, [...currentState.messages, sentMessage])
              : [sentMessage],
        }))
        scrollToLatestMessage()
      } else {
        await sendPublicMessage(nextMessage)
        scrollToLatestMessage()
      }
    } catch (chatError) {
      setMessage(nextMessage)
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
                <p className="font-black uppercase tracking-[0.08em] text-white">
                  [{selectedClan.tag}] {selectedClan.name}
                </p>
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

      <section className="chat-stable-panel flex h-[72vh] min-h-[34rem] flex-col rounded-[1.35rem] p-0 sm:rounded-[1.8rem]">
        <div className="flex min-h-16 flex-wrap items-center gap-2 border-b border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
          <div className="mr-auto min-w-0">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-gray-500">
              {activeRoom === 'clan' ? 'Clan Chat' : 'Public Chat'}
            </p>
            <h2 className="truncate text-base font-black uppercase tracking-[0.04em] text-white">
              {activeRoom === 'clan' && selectedClan ? `[${selectedClan.tag}] ${selectedClan.name}` : 'Live Room'}
            </h2>
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

        <div ref={scrollRef} className="chat-scroll-surface min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
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
                      </div>
                      <div className={`relative min-w-20 rounded-2xl border px-3.5 pb-5 pt-2.5 text-[0.94rem] leading-6 shadow-lg shadow-black/20 ${
                        mine
                          ? 'rounded-br-md border-red-400/25 bg-gradient-to-br from-red-500/22 to-red-950/55 text-red-50'
                          : 'rounded-bl-md border-white/[0.08] bg-zinc-950/75 text-gray-100'
                      }`}>
                      <p className={`whitespace-pre-wrap ${wasDeleted ? 'italic text-gray-400' : ''}`}>
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
          <div ref={bottomRef} aria-hidden="true" />
        </div>

        <form onSubmit={handleSend} className="border-t border-white/10 bg-black/40 p-3 sm:p-4">
          <div className="grid gap-2 rounded-[1.25rem] border border-white/10 bg-zinc-950/80 p-1.5 shadow-inner shadow-black/40 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-11 rounded-2xl border-0 bg-transparent px-3 text-[0.95rem] text-gray-100 outline-none placeholder:text-gray-600"
            placeholder={
              activeRoom === 'clan'
                ? canSendClanRoomMessage
                  ? `Message ${selectedClan?.name || 'your clan'}`
                  : 'Read-only room'
                : "Yo who's playing?"
            }
            maxLength="500"
            disabled={activeRoom === 'clan' && !canSendClanRoomMessage}
          />
          <button
            type="submit"
            disabled={sending || !message.trim() || (activeRoom === 'clan' && !canSendClanRoomMessage)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-400/40 bg-red-500/18 px-4 text-sm font-black uppercase tracking-[0.12em] text-red-50 transition hover:bg-red-500/28 disabled:opacity-45"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send
          </button>
          </div>
        </form>
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
