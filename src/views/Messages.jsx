import { Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Link, useSearchParams } from 'react-router-dom'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
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

function isGroupedWithNeighbor(message, neighborMessage) {
  if (!neighborMessage) {
    return false
  }

  if (message.sender_id !== neighborMessage.sender_id) {
    return false
  }

  if (!isSameDay(message.created_at, neighborMessage.created_at)) {
    return false
  }

  const current = new Date(message.created_at).getTime()
  const neighbor = new Date(neighborMessage.created_at).getTime()
  const diffMs = Math.abs(current - neighbor)

  return diffMs <= 5 * 60 * 1000
}

function Messages() {
  const {
    isAuthenticated,
    user,
    profiles,
    directMessages,
    onlineUserIds,
    sendDirectMessage,
    markDirectMessageRead,
  } = useIntel()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('to')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const contacts = useMemo(() => {
    return profiles
      .filter((profile) => profile.id !== user?.id)
      .sort((first, second) => {
        return (
          Number(isProfileOnline(second, onlineUserIds)) - Number(isProfileOnline(first, onlineUserIds)) ||
          displayProfileName(first).localeCompare(displayProfileName(second))
        )
      })
  }, [onlineUserIds, profiles, user?.id])

  const selectedProfile = profiles.find((profile) => profile.id === selectedId) ?? contacts[0]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length, selectedProfile?.id])

  const unreadCountsBySender = useMemo(() => {
    return directMessages.reduce((counts, directMessage) => {
      if (directMessage.recipient_id !== user?.id || directMessage.read_at) {
        return counts
      }

      counts[directMessage.sender_id] = (counts[directMessage.sender_id] ?? 0) + 1
      return counts
    }, {})
  }, [directMessages, user?.id])

  const thread = useMemo(() => {
    if (!selectedProfile || !user) {
      return []
    }

    return directMessages.filter((directMessage) => {
      return (
        (directMessage.sender_id === user.id && directMessage.recipient_id === selectedProfile.id) ||
        (directMessage.sender_id === selectedProfile.id && directMessage.recipient_id === user.id)
      )
    })
  }, [directMessages, selectedProfile, user])

  useEffect(() => {
    if (!selectedProfile || !user) {
      return
    }

    const unreadThreadMessages = thread.filter(
      (directMessage) => directMessage.recipient_id === user.id && !directMessage.read_at,
    )

    if (!unreadThreadMessages.length) {
      return
    }

    Promise.allSettled(
      unreadThreadMessages.map((directMessage) => markDirectMessageRead(directMessage.id)),
    ).catch(() => {})
  }, [markDirectMessageRead, selectedProfile, thread, user])

  async function handleSend(event) {
    event.preventDefault()

    if (!selectedProfile || !message.trim()) {
      return
    }

    setSending(true)
    setError('')

    try {
      await sendDirectMessage(selectedProfile.id, message)
      setMessage('')
    } catch (messageError) {
      setError(messageError.message)
    } finally {
      setSending(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader eyebrow="Direct Messages" title="Login Required">
          Personal messaging is available to signed-in users.
        </PageHeader>
        <Link
          to="/auth"
          className="inline-flex min-h-11 items-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100"
        >
          Login to message
        </Link>
      </div>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="Direct Messages" title="Personal Messaging">
        Message specific people without cluttering the public chat.
      </PageHeader>

      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="panel rounded-[1.8rem] p-4">
          <p className="intel-label mb-3">People</p>
          <div className="space-y-2">
            {contacts.length ? (
              contacts.map((contact) => {
                const online = isProfileOnline(contact, onlineUserIds)
                const active = selectedProfile?.id === contact.id

                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSearchParams({ to: contact.id })}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      active
                        ? 'border-red-500/50 bg-red-500/12'
                        : 'border-white/10 bg-black/25 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-black uppercase tracking-[0.08em] text-white">
                        {clanPrefix(contact)} {displayProfileName(contact)}
                      </p>
                      <div className="flex items-center gap-2">
                        {unreadCountsBySender[contact.id] ? (
                          <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.16em] text-red-100">
                            {unreadCountsBySender[contact.id]}
                          </span>
                        ) : null}
                        <OnlineDot online={online} label={false} />
                      </div>
                    </div>
                    <p className="mt-1 truncate text-xs font-bold text-gray-500">
                      {contact.activision_ids?.[0] || 'No Activision ID'}
                    </p>
                  </button>
                )
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-4 text-sm text-gray-500">
                No contacts yet.
              </p>
            )}
          </div>
        </aside>

        <div className="panel flex h-[62vh] flex-col rounded-[1.8rem] p-4">
          {selectedProfile ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="intel-label mb-1">Thread</p>
                  <h2 className="text-xl font-black uppercase tracking-[0.04em] text-white">
                    {clanPrefix(selectedProfile)} {displayProfileName(selectedProfile)}
                  </h2>
                </div>
                <OnlineDot online={isProfileOnline(selectedProfile, onlineUserIds)} />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {thread.length ? (
                  thread.map((directMessage, index) => {
                    const mine = directMessage.sender_id === user.id
                    const previousMessage = thread[index - 1]
                    const nextMessage = thread[index + 1]
                    const startsGroup = !isGroupedWithNeighbor(directMessage, previousMessage)
                    const endsGroup = !isGroupedWithNeighbor(directMessage, nextMessage)
                    const showDateDivider = !previousMessage || !isSameDay(previousMessage.created_at, directMessage.created_at)

                    return (
                      <div key={directMessage.id} className="space-y-2 py-0.5">
                        {showDateDivider ? (
                          <div className="sticky top-0 z-[1] flex justify-center py-1">
                            <span className="rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.2em] text-gray-400 backdrop-blur">
                              {formatDayLabel(directMessage.created_at)}
                            </span>
                          </div>
                        ) : null}

                        <article className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[89%] ${startsGroup ? '' : mine ? 'mr-10' : 'ml-10'}`}>
                            {startsGroup ? (
                              <div className={`mb-1.5 flex flex-wrap items-center gap-2 ${mine ? 'justify-end' : ''}`}>
                                <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-gray-600">
                                  {new Date(directMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ) : null}

                            <div
                              className={[
                                'rounded-2xl border px-3.5 py-2.5 text-sm leading-6',
                                mine
                                  ? 'border-red-500/35 bg-red-500/12 text-red-50'
                                  : 'border-white/10 bg-black/25 text-gray-200',
                                startsGroup
                                  ? mine
                                    ? 'rounded-tr-md'
                                    : 'rounded-tl-md'
                                  : mine
                                    ? 'rounded-tr-2xl'
                                    : 'rounded-tl-2xl',
                                !endsGroup
                                  ? mine
                                    ? 'rounded-br-md'
                                    : 'rounded-bl-md'
                                  : '',
                              ].join(' ')}
                            >
                              <p className="whitespace-pre-wrap">{directMessage.body}</p>
                            </div>

                            {endsGroup && !startsGroup ? (
                              <p className={`mt-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-gray-600 ${mine ? 'text-right' : ''}`}>
                                {new Date(directMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            ) : null}
                          </div>
                        </article>
                      </div>
                    )
                  })
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-4 text-sm text-gray-500">
                    No messages yet.
                  </p>
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="field min-h-12"
                  placeholder={`Message ${displayProfileName(selectedProfile)}`}
                  maxLength="1000"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send
                </button>
              </form>
              {error ? <p className="mt-2 text-sm font-bold text-red-200">{error}</p> : null}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm font-bold text-gray-500">
              Pick a person to message.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Messages
