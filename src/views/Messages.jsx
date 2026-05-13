import { ArrowLeft, Send } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  return <ProfileAvatar profile={profile} online={online} showOnline size="sm" />
}

const DirectMessageBubble = memo(function DirectMessageBubble({ directMessage, mine, online, onReact, ownProfile, selectedProfile, userId }) {
  return (
    <article className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
      {!mine ? <ProfileInitial profile={selectedProfile} online={online} /> : null}
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
            currentUserId={userId}
            message={directMessage}
            onReact={onReact}
          />
        </div>
      </div>
      {mine ? <ProfileInitial profile={ownProfile} online /> : null}
    </article>
  )
})

function Messages() {
  const {
    isAuthenticated,
    user,
    profile,
    profiles,
    directMessages,
    onlineUserIds,
    sendDirectMessage,
    markDirectMessagesRead,
    setMessageReaction,
  } = useIntel()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('to')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const sendingRef = useRef(false)
  const scrollRef = useRef(null)
  const stickToBottomRef = useRef(true)
  const markedReadIdsRef = useRef(new Set())
  const markDirectMessagesReadRef = useRef(markDirectMessagesRead)
  const setMessageReactionRef = useRef(setMessageReaction)
  const userId = user?.id ?? ''

  useEffect(() => {
    markDirectMessagesReadRef.current = markDirectMessagesRead
  }, [markDirectMessagesRead])

  useEffect(() => {
    setMessageReactionRef.current = setMessageReaction
  }, [setMessageReaction])

  const scrollToLatestMessage = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const scrollElement = scrollRef.current
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }
      })
    })
  }, [])

  const handleScroll = useCallback(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return
    const distanceFromBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight
    stickToBottomRef.current = distanceFromBottom < 80
  }, [])

  const unreadCountsBySender = useMemo(() => {
    return directMessages.reduce((counts, directMessage) => {
      if (directMessage.recipient_id !== userId || directMessage.read_at) {
        return counts
      }

      counts[directMessage.sender_id] = (counts[directMessage.sender_id] ?? 0) + 1
      return counts
    }, {})
  }, [directMessages, userId])

  const lastMessageByContact = useMemo(() => {
    if (!userId) {
      return new Map()
    }

    return directMessages.reduce((messagesByContact, directMessage) => {
      const contactId = directMessage.sender_id === userId ? directMessage.recipient_id : directMessage.sender_id
      const currentMessage = messagesByContact.get(contactId)
      if (!currentMessage || new Date(directMessage.created_at) > new Date(currentMessage.created_at)) {
        messagesByContact.set(contactId, directMessage)
      }
      return messagesByContact
    }, new Map())
  }, [directMessages, userId])

  const contacts = useMemo(() => {
    return profiles
      .filter((profile) => profile.id !== user?.id)
      .sort((first, second) => {
        const firstUnread = unreadCountsBySender[first.id] ?? 0
        const secondUnread = unreadCountsBySender[second.id] ?? 0
        if (firstUnread !== secondUnread) {
          return secondUnread - firstUnread
        }

        const firstLastMessageTime = lastMessageByContact.get(first.id)?.created_at ?? ''
        const secondLastMessageTime = lastMessageByContact.get(second.id)?.created_at ?? ''
        if (firstLastMessageTime || secondLastMessageTime) {
          return new Date(secondLastMessageTime || 0) - new Date(firstLastMessageTime || 0)
        }

        return (
          Number(isProfileOnline(second, onlineUserIds)) - Number(isProfileOnline(first, onlineUserIds)) ||
          displayProfileName(first).localeCompare(displayProfileName(second))
        )
      })
  }, [lastMessageByContact, onlineUserIds, profiles, unreadCountsBySender, user?.id])

  const fallbackContactId = useMemo(() => {
    return profiles.find((nextProfile) => nextProfile.id !== user?.id)?.id ?? ''
  }, [profiles, user?.id])

  const selectedProfile = useMemo(() => {
    const targetId = selectedId || fallbackContactId
    if (!targetId) return null
    return profiles.find((nextProfile) => nextProfile.id === targetId) ?? null
  }, [fallbackContactId, profiles, selectedId])
  const selectedProfileId = selectedProfile?.id ?? ''
  const hasSelectedThread = Boolean(selectedId && selectedProfileId)

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

  const unreadThreadMessageIds = useMemo(() => {
    if (!user) {
      return []
    }

    return thread
      .filter((directMessage) => directMessage.recipient_id === user.id && !directMessage.read_at)
      .map((directMessage) => directMessage.id)
  }, [thread, user])
  const unreadThreadMessageIdsKey = unreadThreadMessageIds.join('|')
  const threadLength = thread.length
  const lastMessageId = thread[thread.length - 1]?.id ?? ''

  // Reset stickiness and snap to bottom when entering a thread
  useEffect(() => {
    if (!selectedProfileId) return
    stickToBottomRef.current = true
    scrollToLatestMessage()
  }, [scrollToLatestMessage, selectedProfileId])

  useEffect(() => {
    if (!hasSelectedThread || !window.matchMedia('(max-width: 1023px)').matches) return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [hasSelectedThread, selectedProfileId])

  // Auto-scroll on new messages only if user was already near the bottom
  useEffect(() => {
    if (!lastMessageId) return
    if (stickToBottomRef.current) {
      scrollToLatestMessage()
    }
  }, [lastMessageId, scrollToLatestMessage, threadLength])

  useEffect(() => {
    if (!selectedProfileId || !userId || !unreadThreadMessageIds.length) {
      return
    }

    const idsToMark = unreadThreadMessageIdsKey
      .split('|')
      .filter((id) => id && !markedReadIdsRef.current.has(id))

    if (!idsToMark.length) {
      return
    }

    idsToMark.forEach((id) => markedReadIdsRef.current.add(id))
    markDirectMessagesReadRef.current(idsToMark).catch(() => {
      idsToMark.forEach((id) => markedReadIdsRef.current.delete(id))
    })
  }, [selectedProfileId, unreadThreadMessageIds.length, unreadThreadMessageIdsKey, userId])

  const handleReaction = useCallback(async (directMessage, reaction) => {
    setError('')

    try {
      await setMessageReactionRef.current('direct', directMessage.id, reaction)
    } catch (reactionError) {
      setError(reactionError.message)
    }
  }, [])

  async function handleSend(event) {
    event.preventDefault()

    const nextMessage = message.trim()

    if (sendingRef.current || !selectedProfile || !nextMessage) {
      return
    }

    sendingRef.current = true
    setError('')
    setMessage('')
    stickToBottomRef.current = true

    try {
      await sendDirectMessage(selectedProfile.id, nextMessage)
      scrollToLatestMessage()
    } catch (messageError) {
      setMessage(nextMessage)
      setError(messageError.message)
    } finally {
      sendingRef.current = false
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
        <aside className={`chat-stable-panel rounded-[1.35rem] p-0 sm:rounded-[1.8rem] lg:block lg:max-h-[72vh] ${hasSelectedThread ? 'hidden' : 'block'}`}>
          <div className="border-b border-white/10 bg-black/20 px-4 py-3">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-gray-500">People</p>
            <h2 className="text-base font-black uppercase tracking-[0.04em] text-white">Direct Lines</h2>
          </div>
          <div className="max-h-[calc(72vh-4rem)] space-y-1 overflow-y-auto p-2">
            {contacts.length ? (
              contacts.map((contact) => {
                const online = isProfileOnline(contact, onlineUserIds)
                const active = selectedProfile?.id === contact.id
                const lastMessage = lastMessageByContact.get(contact.id)
                const lastMessagePreview = lastMessage
                  ? `${lastMessage.sender_id === user?.id ? 'You: ' : ''}${lastMessage.body}`
                  : online
                    ? 'Online now'
                    : contact.activision_ids?.[0] || 'No Activision ID'

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
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-xs font-bold text-gray-500">{lastMessagePreview}</p>
                        {lastMessage ? (
                          <span className="shrink-0 text-[0.62rem] font-black uppercase tracking-[0.12em] text-gray-600">
                            {formatMessageTime(lastMessage.created_at)}
                          </span>
                        ) : null}
                      </div>
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

        <div className={`chat-stable-panel h-[calc(100svh-9.5rem)] min-h-[32rem] flex-col rounded-[1.35rem] p-0 sm:rounded-[1.8rem] lg:flex lg:h-[72vh] lg:min-h-[34rem] ${hasSelectedThread ? 'flex' : 'hidden'}`}>
          {selectedProfile ? (
            <div key={selectedProfileId} className="flex h-full min-h-0 flex-col">
              <div className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSearchParams({})}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-200 transition hover:border-red-400/40 hover:text-red-100 lg:hidden"
                    aria-label="Back to direct message contacts"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
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

              <div ref={scrollRef} onScroll={handleScroll} className="chat-scroll-surface min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
                {thread.length ? (
                  thread.map((directMessage, index) => {
                    const mine = directMessage.sender_id === user.id
                    const previousMessage = thread[index - 1]
                    const showDateDivider = !previousMessage || !isSameDay(previousMessage.created_at, directMessage.created_at)

                    return (
                      <div key={directMessage.id} className="mb-3">
                        {showDateDivider ? (
                          <div className="flex justify-center py-2">
                            <span className="rounded-full border border-white/10 bg-zinc-950/90 px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.18em] text-gray-400 shadow-lg shadow-black/30">
                              {formatDayLabel(directMessage.created_at)}
                            </span>
                          </div>
                        ) : null}

                        <DirectMessageBubble
                          directMessage={directMessage}
                          mine={mine}
                          online={isProfileOnline(selectedProfile, onlineUserIds)}
                          onReact={handleReaction}
                          ownProfile={profile}
                          selectedProfile={selectedProfile}
                          userId={user?.id}
                        />
                      </div>
                    )
                  })
                ) : (
                  <p className="mx-auto max-w-sm rounded-2xl border border-dashed border-white/10 bg-black/35 p-5 text-center text-sm text-gray-500">
                    No messages yet.
                  </p>
                )}
              </div>

              <form onSubmit={handleSend} className="border-t border-white/10 bg-black/40 p-3 sm:p-4">
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
                  disabled={!message.trim()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-400/40 bg-red-500/18 px-4 text-sm font-black uppercase tracking-[0.12em] text-red-50 transition hover:bg-red-500/28 disabled:opacity-45"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send
                </button>
                </div>
              </form>
              {error ? <p className="px-4 pb-3 text-sm font-bold text-red-200">{error}</p> : null}
            </div>
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
