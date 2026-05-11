import { Bell, Clock3, Link as LinkIcon, RefreshCcw, Send, Smartphone, Sparkles, Trash2, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useIntel } from '../context/useIntel.js'

const maxTitleLength = 120
const maxBodyLength = 400

const templates = [
  {
    name: 'Drop Intel',
    title: 'B21 SQUAD CHECK',
    body: 'Operators are online. Drop in if you are ready.',
    url: '/',
  },
  {
    name: 'Shadowban Alert',
    title: 'SHADOWBAN CHECK',
    body: 'Check your account status before the next run. Update your profile if anything changed.',
    url: '/profile',
  },
  {
    name: 'Target Update',
    title: 'NAUGHTY LIST UPDATED',
    body: 'New operator intel is live. Check the board before you queue.',
    url: '/',
  },
  {
    name: 'Team Chat',
    title: 'TEAM CHAT ACTIVE',
    body: 'New callouts are in chat. Open the app and catch up.',
    url: '/chat',
  },
]

const emojiGroups = [
  { label: 'Status', values: ['✅', '⚠️', '🚨', '🛡️', '🔔'] },
  { label: 'Action', values: ['👉', '👇', '📲', '🎯', '🙏'] },
  { label: 'B21', values: ['☢️', '💀', '🔥', '🤝', '💙'] },
]

const urlPresets = [
  { label: 'Home', value: '/' },
  { label: 'Team', value: '/profiles' },
  { label: 'Chat', value: '/chat' },
  { label: 'DMs', value: '/messages' },
  { label: 'Profile', value: '/profile' },
]

function AdminPushConsole() {
  const { pushSummary, pushEvents, fetchPushConsole, sendCustomPush } = useIntel()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('/')
  const [emojiTarget, setEmojiTarget] = useState('body')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  const subscribedUsers = Number(pushSummary?.subscribed_users ?? 0)
  const activeDevices = Number(pushSummary?.active_subscriptions ?? 0)
  const sentNotifications = Number(pushSummary?.sent_notifications ?? 0)

  const canSend = title.trim() && body.trim() && !working && activeDevices > 0

  const preview = useMemo(
    () => ({
      title: title.trim() || 'CUSTOM TEAM ALERT',
      body: body.trim() || 'Your notification text will show here.',
    }),
    [body, title],
  )

  useEffect(() => {
    fetchPushConsole().catch((pushError) => setError(pushError.message))
  }, [fetchPushConsole])

  function applyTemplate(template) {
    setTitle(template.title)
    setBody(template.body)
    setUrl(template.url)
    setStatus('')
    setError('')
  }

  function insertEmoji(emoji) {
    if (emojiTarget === 'title') {
      setTitle((currentTitle) => `${currentTitle}${emoji}`.slice(0, maxTitleLength))
      return
    }

    setBody((currentBody) => `${currentBody}${emoji}`.slice(0, maxBodyLength))
  }

  function resetDraft() {
    setTitle('')
    setBody('')
    setUrl('/')
    setStatus('')
    setError('')
  }

  async function handleRefresh() {
    setStatus('')
    setError('')
    setWorking(true)

    try {
      await fetchPushConsole()
      setStatus('Push stats refreshed.')
    } catch (pushError) {
      setError(pushError.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('')
    setError('')
    setWorking(true)

    try {
      const result = await sendCustomPush({ title, body, url })
      setStatus(`Sent to ${result?.sent ?? 0} device${result?.sent === 1 ? '' : 's'}.`)
    } catch (pushError) {
      setError(pushError.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className="panel mb-5 rounded-[1.8rem] p-5">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="intel-label mb-2">Push Console</p>
          <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">Custom Notifications</h2>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={working}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-200 transition hover:border-cyan-400/40 hover:text-cyan-100 disabled:opacity-60"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <Users className="mb-3 h-5 w-5 text-cyan-100" aria-hidden="true" />
          <p className="text-3xl font-black text-white">{subscribedUsers}</p>
          <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-cyan-100/70">Abonnees</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <Smartphone className="mb-3 h-5 w-5 text-gray-300" aria-hidden="true" />
          <p className="text-3xl font-black text-white">{activeDevices}</p>
          <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">Devices</p>
        </div>
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4">
          <Bell className="mb-3 h-5 w-5 text-red-100" aria-hidden="true" />
          <p className="text-3xl font-black text-white">{sentNotifications}</p>
          <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-red-100/70">Verzonden</p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="intel-label">Templates</p>
            <p className="mt-1 text-sm font-bold text-gray-400">Begin sneller</p>
          </div>
          <button
            type="button"
            onClick={resetDraft}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-red-500/40 hover:text-red-100"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Wis
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {templates.map((template) => (
            <button
              key={template.name}
              type="button"
              onClick={() => applyTemplate(template)}
              className="min-h-16 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
            >
              <span className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.04em] text-white">
                <Sparkles className="h-4 w-4 text-cyan-100" aria-hidden="true" />
                {template.name}
              </span>
              <span className="mt-1 block truncate text-xs font-bold text-gray-500">{template.title}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="flex items-center justify-between gap-3 text-sm font-black text-gray-300">
              Titel
              <span className="text-xs text-gray-500">{title.length}/{maxTitleLength}</span>
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, maxTitleLength))}
              className="field min-h-12"
              placeholder="Bv. B21 squad check"
            />
          </label>

          <label className="grid gap-2">
            <span className="flex items-center justify-between gap-3 text-sm font-black text-gray-300">
              Bericht
              <span className="text-xs text-gray-500">{body.length}/{maxBodyLength}</span>
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, maxBodyLength))}
              className="field min-h-32 resize-y py-3"
              placeholder="Kort, concreet, geen roman."
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-black text-gray-300">Emoji invoegen</p>
              <select
                value={emojiTarget}
                onChange={(event) => setEmojiTarget(event.target.value)}
                className="field min-h-10 max-w-44 text-sm"
              >
                <option value="body">Berichttekst</option>
                <option value="title">Titel</option>
              </select>
            </div>
            <div className="grid gap-3">
              {emojiGroups.map((group) => (
                <div key={group.label} className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-black text-gray-300">Doel URL</span>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="field min-h-12"
                placeholder="/"
              />
              <div className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-gray-300">
                <LinkIcon className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
          </label>

          <div className="flex flex-wrap gap-2">
            {urlPresets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setUrl(preset.value)}
                className={`rounded-full border px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] transition ${
                  url === preset.value
                    ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/15 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {working ? 'Sending' : `Verstuur naar ${activeDevices}`}
            </button>
            <button
              type="button"
              onClick={resetDraft}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </button>
          </div>

          {status ? <p className="text-sm font-bold text-green-200">{status}</p> : null}
          {error ? <p className="text-sm font-bold text-red-200">{error}</p> : null}
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="intel-label mb-3">Preview</p>
            <div className="rounded-2xl border border-white/10 bg-gray-950 p-4 shadow-2xl shadow-black/40">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-100">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black uppercase tracking-[0.04em] text-white">{preview.title}</p>
                  <p className="text-xs font-bold text-gray-500">The Naughty List</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-gray-300">{preview.body}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <p className="intel-label">Recent</p>
            </div>
            <div className="grid gap-2">
              {pushEvents.length ? (
                pushEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="truncate text-xs font-black uppercase tracking-[0.08em] text-white">{event.title}</p>
                      <p className="shrink-0 text-xs font-black text-cyan-100">{event.sent_count}</p>
                    </div>
                    <p className="line-clamp-2 text-xs leading-5 text-gray-500">{event.body}</p>
                    <p className="mt-2 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-600">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-white/10 bg-white/5 p-3 text-sm font-bold text-gray-500">
                  Nog geen custom pushes.
                </p>
              )}
            </div>
          </div>
        </aside>
      </form>
    </section>
  )
}

export default AdminPushConsole
