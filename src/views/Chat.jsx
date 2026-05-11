import { Crown, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { clanPrefix, displayProfileName, isProfileOnline } from '../utils/profiles.js'

function Chat() {
  const { isAuthenticated, publicMessages, onlineUserIds, sendPublicMessage } = useIntel()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [publicMessages.length])

  async function handleSend(event) {
    event.preventDefault()

    if (!message.trim()) {
      return
    }

    setSending(true)
    setError('')

    try {
      await sendPublicMessage(message)
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
        <PageHeader eyebrow="Public Chat" title="Login Required">
          The public chat is available to everyone with an account.
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
      <PageHeader eyebrow="Public Chat" title="Who's Playing?">
        Ask who is online, squad up, or call out Building 21 runs in realtime.
      </PageHeader>

      <section className="panel flex h-[62vh] flex-col rounded-[1.8rem] p-4">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {publicMessages.length ? (
            publicMessages.map((chatMessage) => {
              const online = isProfileOnline(chatMessage.profile, onlineUserIds)

              return (
                <article key={chatMessage.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <OnlineDot online={online} label={false} />
                    <span className="text-sm font-black uppercase tracking-[0.08em] text-white">
                      {clanPrefix(chatMessage.profile)} {displayProfileName(chatMessage.profile)}
                      {chatMessage.profile?.role === 'admin' ? (
                        <Crown className="ml-1.5 inline h-3.5 w-3.5 text-yellow-300" aria-hidden="true" />
                      ) : null}
                    </span>
                    <RoleBadge role={chatMessage.profile?.role} compact />
                    <span className="ml-auto text-[0.62rem] font-bold uppercase tracking-[0.16em] text-gray-600">
                      {new Date(chatMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">{chatMessage.body}</p>
                </article>
              )
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
              No chat yet. Ask who is playing.
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="field min-h-12"
            placeholder="Yo who's playing?"
            maxLength="500"
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
      </section>
    </div>
  )
}

export default Chat
