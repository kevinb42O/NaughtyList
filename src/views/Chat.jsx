import { Crown, Eye, MessageSquare, Send, Shield } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
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
  } = useIntel()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [activeRoom, setActiveRoom] = useState(searchParams.get('room') === 'clan' ? 'clan' : 'public')
  const [selectedClanId, setSelectedClanId] = useState(searchParams.get('clan') || '')
  const [clanMessageState, setClanMessageState] = useState({ clanId: '', messages: [] })
  const [clanLoading, setClanLoading] = useState(false)
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeRoom, clanMessages.length, publicMessages.length])

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
            setClanMessageState({ clanId: resolvedSelectedClanId, messages: nextMessages })
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
    const intervalId = window.setInterval(loadClanMessages, 3000)

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

    if (!message.trim()) {
      return
    }

    setSending(true)
    setError('')

    try {
      if (activeRoom === 'clan') {
        if (!resolvedSelectedClanId) {
          throw new Error('Choose a clan room first.')
        }

        if (!canSendClanRoomMessage) {
          throw new Error('Only active clan members can send in this room.')
        }

        await sendClanMessage(resolvedSelectedClanId, message)
        setClanMessageState({
          clanId: resolvedSelectedClanId,
          messages: await fetchClanMessages(resolvedSelectedClanId),
        })
      } else {
        await sendPublicMessage(message)
      }

      setMessage('')
    } catch (chatError) {
      setError(chatError.message)
    } finally {
      setSending(false)
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
      <PageHeader eyebrow="Chat Network" title="Who's Playing?">
        Use the public room for pickup runs and the clan room for private squad traffic.
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

      <section className="panel flex h-[62vh] flex-col rounded-[1.8rem] p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          <p className="intel-label">{activeRoom === 'clan' ? 'Clan Chat' : 'Public Chat'}</p>
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

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {showClanLoading ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
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
                <div key={chatMessage.id} className="py-0.5">
                  {showDateDivider ? (
                    <div className="sticky top-0 z-[1] flex justify-center py-2">
                      <span className="rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.2em] text-gray-400 backdrop-blur">
                        {formatDayLabel(chatMessage.created_at)}
                      </span>
                    </div>
                  ) : null}

                  <article className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[82%]">
                      <div className={`mb-1 flex flex-wrap items-center gap-2 ${mine ? 'justify-end' : ''}`}>
                        {!mine ? <OnlineDot online={online} label={false} /> : null}
                        <span className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-gray-300">
                          {clanPrefix(chatMessage.profile)} {displayProfileName(chatMessage.profile)}
                          {chatMessage.profile?.role === 'admin' ? (
                            <Crown className="ml-1.5 inline h-3.5 w-3.5 text-yellow-300" aria-hidden="true" />
                          ) : null}
                        </span>
                        {!mine ? <RoleBadge role={chatMessage.profile?.role} compact /> : null}
                        <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-gray-600">
                          {new Date(chatMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`rounded-2xl border px-3.5 py-2.5 text-sm leading-6 ${
                          mine
                            ? 'border-red-500/35 bg-red-500/12 text-red-50'
                            : 'border-white/10 bg-black/25 text-gray-200'
                        }`}
                      >
                        <p className={`whitespace-pre-wrap ${wasDeleted ? 'italic text-gray-400' : ''}`}>
                          {wasDeleted ? 'Message removed.' : chatMessage.body}
                        </p>
                      </div>
                    </div>
                  </article>
                </div>
              )
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
              {activeRoom === 'clan' ? 'No clan messages yet.' : 'No chat yet. Ask who is playing.'}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="field min-h-12"
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
            disabled={sending || (activeRoom === 'clan' && !canSendClanRoomMessage)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send
          </button>
        </form>
        {activeRoom === 'clan' && !canSendClanRoomMessage && selectedClan ? (
          <p className="mt-2 text-sm font-bold text-gray-500">
            {selectedClan.id === myClanId
              ? 'You need an active clan membership to send here.'
              : 'Admin inspector mode is read-only for clans you are not a member of.'}
          </p>
        ) : null}
        {error ? <p className="mt-2 text-sm font-bold text-red-200">{error}</p> : null}
      </section>
    </div>
  )
}

export default Chat
