import { Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import MessageReactions from '../components/MessageReactions.jsx'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
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

function ProfileInitial({ profile, online }) {
  return <ProfileAvatar profile={profile} online={online} showOnline size="md" />
}

function Messages() {
  const {
    isAuthenticated,
    user,
    profile,
    profiles,
    directMessages,
    onlineUserIds,
    sendDirectMessage,
    markDirectMessageRead,
    setMessageReaction,
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length, selectedProfile?.id])

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

    const nextMessage = message.trim()

    if (sending || !selectedProfile || !nextMessage) {
      return
    }

    setSending(true)
    setError('')
    setMessage('')

    try {
      await sendDirectMessage(selectedProfile.id, nextMessage)
    } catch (messageError) {
      setMessage(nextMessage)
      setError(messageError.message)
    } finally {
      setSending(false)
    }
  }

  async function handleReaction(directMessage, reaction) {
    setError('')

    try {
      await setMessageReaction('direct', directMessage.id, reaction)
    } catch (reactionError) {
      setError(reactionError.message)
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
      <PageHeader eyebrow="Direct Messages" title="Private Comms">
        Clean one-on-one threads with fast reactions and quiet unread tracking.
      </PageHeader>

      <section className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="panel max-h-[72vh] rounded-[1.35rem] p-0 sm:rounded-[1.8rem]">
          <div className="border-b border-white/10 bg-black/20 px-4 py-3">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-gray-500">People</p>
            <h2 className="text-base font-black uppercase tracking-[0.04em] text-white">Direct Lines</h2>
          </div>
          <div className="max-h-[calc(72vh-4rem)] space-y-1 overflow-y-auto p-2">
            {contacts.length ? (
              contacts.map((contact) => {
                const online = isProfileOnline(contact, onlineUserIds)
                const active = selectedProfile?.id === contact.id

                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSearchParams({ to: contact.id })}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      active
                        ? 'border-red-400/45 bg-red-500/14 shadow-lg shadow-red-950/20'
                        : 'border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                  >
                    <ProfileInitial profile={contact} online={online} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black uppercase tracking-[0.04em] text-white">
                        {clanPrefix(contact)} {displayProfileName(contact)}
                        </p>
                        {unreadCountsBySender[contact.id] ? (
                          <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.16em] text-red-100">
                            {unreadCountsBySender[contact.id]}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs font-bold text-gray-500">
                        {online ? 'Online now' : contact.activision_ids?.[0] || 'No Activision ID'}
                      </p>
                    </div>
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

        <div className="panel flex h-[72vh] min-h-[34rem] flex-col rounded-[1.35rem] p-0 sm:rounded-[1.8rem]">
          {selectedProfile ? (
            <>
              <div className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
                <div className="flex min-w-0 items-center gap-3">
                  <ProfileInitial profile={selectedProfile} online={isProfileOnline(selectedProfile, onlineUserIds)} />
                  <div className="min-w-0">
                    <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-gray-500">Thread</p>
                    <h2 className="truncate text-base font-black uppercase tracking-[0.04em] text-white">
                    {clanPrefix(selectedProfile)} {displayProfileName(selectedProfile)}
                    </h2>
                  </div>
                </div>
                <OnlineDot online={isProfileOnline(selectedProfile, onlineUserIds)} />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.08),transparent_18rem),linear-gradient(180deg,rgba(255,255,255,0.025),transparent)] px-3 py-4 sm:px-4">
                {thread.length ? (
                  thread.map((directMessage, index) => {
                    const mine = directMessage.sender_id === user.id
                    const previousMessage = thread[index - 1]
                    const showDateDivider = !previousMessage || !isSameDay(previousMessage.created_at, directMessage.created_at)

                    return (
                      <div key={directMessage.id} className="mb-3">
                        {showDateDivider ? (
                          <div className="sticky top-0 z-[1] flex justify-center py-2">
                            <span className="rounded-full border border-white/10 bg-zinc-950/80 px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.18em] text-gray-400 shadow-lg shadow-black/30 backdrop-blur">
                              {formatDayLabel(directMessage.created_at)}
                            </span>
                          </div>
                        ) : null}

                        <article className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                          {!mine ? <ProfileInitial profile={selectedProfile} online={isProfileOnline(selectedProfile, onlineUserIds)} /> : null}
                          <div className="max-w-[86%] sm:max-w-[72%]">
                            <div
                              className={`relative min-w-20 rounded-2xl border px-3.5 pb-5 pt-2.5 text-[0.94rem] leading-6 shadow-lg shadow-black/20 ${
                                mine
                                  ? 'rounded-br-md border-red-400/25 bg-gradient-to-br from-red-500/22 to-red-950/55 text-red-50'
                                  : 'rounded-bl-md border-white/[0.08] bg-zinc-950/75 text-gray-100'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{directMessage.body}</p>
                              <span className={`absolute bottom-1.5 right-3 text-[0.58rem] font-bold ${mine ? 'text-red-100/55' : 'text-gray-500'}`}>
                                {formatMessageTime(directMessage.created_at)}
                              </span>
                              <MessageReactions
                                align={mine ? 'right' : 'left'}
                                currentUserId={user?.id}
                                message={directMessage}
                                onReact={handleReaction}
                              />
                            </div>
                          </div>
                          {mine ? <ProfileInitial profile={profile} online /> : null}
                        </article>
                      </div>
                    )
                  })
                ) : (
                  <p className="mx-auto max-w-sm rounded-2xl border border-dashed border-white/10 bg-black/35 p-5 text-center text-sm text-gray-500">
                    No messages yet.
                  </p>
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="border-t border-white/10 bg-black/30 p-3 backdrop-blur sm:p-4">
                <div className="grid gap-2 rounded-[1.25rem] border border-white/10 bg-zinc-950/80 p-1.5 shadow-inner shadow-black/40 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="min-h-11 rounded-2xl border-0 bg-transparent px-3 text-[0.95rem] text-gray-100 outline-none placeholder:text-gray-600"
                  placeholder={`Message ${displayProfileName(selectedProfile)}`}
                  maxLength="1000"
                />
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-400/40 bg-red-500/18 px-4 text-sm font-black uppercase tracking-[0.12em] text-red-50 transition hover:bg-red-500/28 disabled:opacity-45"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send
                </button>
                </div>
              </form>
              {error ? <p className="px-4 pb-3 text-sm font-bold text-red-200">{error}</p> : null}
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
