import { Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useIntel } from '../context/useIntel.js'
import { clanPrefix, displayProfileName, isProfileOnline } from '../utils/profiles.js'

function Messages() {
  const {
    isAuthenticated,
    user,
    profiles,
    directMessages,
    onlineUserIds,
    sendDirectMessage,
  } = useIntel()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('to')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

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
                      <OnlineDot online={online} label={false} />
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

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {thread.length ? (
                  thread.map((directMessage) => {
                    const mine = directMessage.sender_id === user.id

                    return (
                      <article
                        key={directMessage.id}
                        className={`max-w-[85%] rounded-2xl border p-3 ${
                          mine
                            ? 'ml-auto border-red-500/30 bg-red-500/12'
                            : 'border-white/10 bg-black/25'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-200">{directMessage.body}</p>
                        <p className="mt-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-gray-600">
                          {new Date(directMessage.created_at).toLocaleString()}
                        </p>
                      </article>
                    )
                  })
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-4 text-sm text-gray-500">
                    No messages yet.
                  </p>
                )}
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
