import { ArchiveRestore, ArchiveX, CheckCircle2, Clock, Search, ShieldAlert, ShieldCheck, Siren, Trash2, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EditPlayerModal from '../components/EditPlayerModal.jsx'
import PageHeader from '../components/PageHeader.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { clanPrefix, displayProfileName } from '../utils/profiles.js'
import { getThreatStyle } from '../utils/threat.js'

const verdictOptions = [
  { value: 'verified', label: 'Verified', tone: 'border-green-400/40 bg-green-400/10 text-green-100' },
  { value: 'needs_evidence', label: 'Needs Evidence', tone: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-100' },
  { value: 'duplicate', label: 'Duplicate', tone: 'border-orange-400/40 bg-orange-400/10 text-orange-100' },
  { value: 'low_quality', label: 'Low Quality', tone: 'border-red-400/40 bg-red-400/10 text-red-100' },
  { value: 'cleared', label: 'Cleared', tone: 'border-sky-400/40 bg-sky-400/10 text-sky-100' },
]

const tabOptions = [
  { value: 'review', label: 'Review' },
  { value: 'quarantine', label: 'Quarantine' },
  { value: 'chat', label: 'Chat' },
  { value: 'mutes', label: 'Mutes' },
  { value: 'log', label: 'Log' },
]

function formatDateTime(value) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleString()
}

function verdictMeta(value) {
  return verdictOptions.find((option) => option.value === value) ?? {
    value: 'unreviewed',
    label: 'Unreviewed',
    tone: 'border-white/10 bg-white/5 text-gray-300',
  }
}

function eventLabel(event) {
  const target = event.targetProfile ? displayProfileName(event.targetProfile) : 'target'
  const status = event.details?.status ? verdictMeta(event.details.status).label : ''

  switch (event.event_type) {
    case 'player_verdict':
      return `Set verdict ${status}`
    case 'player_quarantined':
      return 'Quarantined operator'
    case 'player_restored':
      return 'Restored operator'
    case 'public_chat_muted':
      return `Muted ${target}`
    case 'public_chat_mute_cleared':
      return `Cleared mute for ${target}`
    case 'public_chat_deleted':
      return `Deleted public chat from ${target}`
    default:
      return event.event_type.replaceAll('_', ' ')
  }
}

function Moderator() {
  const {
    user,
    isAuthenticated,
    isModerator,
    role,
    profileDisplayName,
    players,
    publicMessages,
    publicChatMutes,
    moderationEvents,
    setPlayerVerdict,
    quarantinePlayer,
    restorePlayer,
    mutePublicChatUser,
    clearPublicChatMute,
    deletePublicMessage,
  } = useIntel()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState('')
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('review')
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const normalizedQuery = query.trim().toLowerCase()
  const quarantinedPlayers = players.filter((player) => Boolean(player.quarantinedAt))
  const reviewPlayers = players.filter((player) => !player.quarantinedAt && player.moderationStatus !== 'verified' && player.moderationStatus !== 'cleared')

  const filteredPlayers = useMemo(() => {
    const source = activeTab === 'quarantine' ? quarantinedPlayers : activeTab === 'review' ? reviewPlayers : players

    return source.filter((player) => {
      if (!normalizedQuery) {
        return true
      }

      return [player.name, player.clan, player.notes, player.moderationNote, player.quarantineReason, ...(player.tags ?? [])]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [activeTab, normalizedQuery, players, quarantinedPlayers, reviewPlayers])

  const filteredMessages = useMemo(() => {
    return [...publicMessages]
      .reverse()
      .filter((message) => {
        if (!normalizedQuery) {
          return true
        }

        return [message.body, message.profile?.display_name, message.profile?.clan_tag]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery))
      })
  }, [normalizedQuery, publicMessages])

  const stats = useMemo(() => ({
    review: reviewPlayers.length,
    quarantine: quarantinedPlayers.length,
    mutes: publicChatMutes.length,
    chat: publicMessages.length,
  }), [publicChatMutes.length, publicMessages.length, quarantinedPlayers.length, reviewPlayers.length])

  function closeEditModal() {
    setEditingPlayer(null)
    setEditModalOpen(false)
  }

  async function runAction(id, successMessage, action) {
    setStatus('')
    setError('')
    setWorkingId(id)

    try {
      await action()
      setStatus(successMessage)
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setWorkingId('')
    }
  }

  async function handleVerdict(player, nextStatus) {
    const note = window.prompt(`Optional note for ${verdictMeta(nextStatus).label}`, player.moderationNote || '')
    if (note === null) return

    await runAction(`verdict-${player.id}-${nextStatus}`, 'Verdict updated.', () => setPlayerVerdict(player.id, nextStatus, note))
  }

  async function handleQuarantine(player) {
    const reason = window.prompt(`Why hide ${player.name} from public lists?`, player.quarantineReason || player.moderationNote || '')
    if (reason === null) return

    await runAction(`quarantine-${player.id}`, 'Operator quarantined.', () => quarantinePlayer(player.id, reason))
  }

  async function handleRestore(player) {
    await runAction(`restore-${player.id}`, 'Operator restored.', () => restorePlayer(player.id))
  }

  async function handleDeleteMessage(messageId) {
    await runAction(`message-${messageId}`, 'Public chat message deleted.', () => deletePublicMessage(messageId))
  }

  async function handleMute(message, minutes) {
    if (!message.user_id || message.user_id === user?.id) return
    const reason = window.prompt(`Mute ${displayProfileName(message.profile)} for ${minutes} minutes?`, 'Public chat cleanup')
    if (reason === null) return

    await runAction(`mute-${message.user_id}-${minutes}`, 'Public chat mute applied.', () => mutePublicChatUser(message.user_id, minutes, reason))
  }

  async function handleClearMute(muteId) {
    await runAction(`clear-mute-${muteId}`, 'Public chat mute cleared.', () => clearPublicChatMute(muteId))
  }

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader eyebrow="Moderator Login" title="Login Required">
          Moderator tools are only available to signed-in moderators and the admin.
        </PageHeader>
        <Link
          to="/auth"
          className="inline-flex min-h-11 items-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100"
        >
          Login
        </Link>
      </div>
    )
  }

  if (!isModerator) {
    return (
      <div>
        <PageHeader eyebrow="Moderator Screen" title="No Moderator Role">
          Ask the admin to promote your account before you can moderate entries.
        </PageHeader>
        <section className="panel rounded-[1.8rem] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xl font-black uppercase tracking-[0.04em] text-white">
              {profileDisplayName}
            </p>
            <RoleBadge role={role} />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="Moderator Screen" title="Control Queue">
        Review intel, quarantine bad records, cool down public chat, and keep every action visible.
      </PageHeader>

      <section className="panel rounded-[1.8rem] p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-orange-200" aria-hidden="true" />
          <p className="font-black uppercase tracking-[0.04em] text-white">{profileDisplayName}</p>
          <RoleBadge role={role} />
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,130px))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-red-200" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field min-h-12 pl-11"
              placeholder="Search players, public chat, or notes"
            />
          </div>
          <StatBlock label="Review" value={stats.review} />
          <StatBlock label="Hidden" value={stats.quarantine} />
          <StatBlock label="Mutes" value={stats.mutes} />
          <StatBlock label="Chat" value={stats.chat} />
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {tabOptions.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={[
                'rounded-full border px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] transition',
                activeTab === tab.value
                  ? 'border-red-500/60 bg-red-500/12 text-red-100'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'review' || activeTab === 'quarantine' ? (
          <PlayerQueue
            activeTab={activeTab}
            players={filteredPlayers}
            workingId={workingId}
            onEdit={(player) => {
              setEditingPlayer(player)
              setEditModalOpen(true)
            }}
            onVerdict={handleVerdict}
            onQuarantine={handleQuarantine}
            onRestore={handleRestore}
          />
        ) : null}

        {activeTab === 'chat' ? (
          <ChatQueue
            messages={filteredMessages}
            workingId={workingId}
            currentUserId={user?.id}
            onDelete={handleDeleteMessage}
            onMute={handleMute}
          />
        ) : null}

        {activeTab === 'mutes' ? (
          <MuteQueue mutes={publicChatMutes} workingId={workingId} onClear={handleClearMute} />
        ) : null}

        {activeTab === 'log' ? <ActionLog events={moderationEvents} /> : null}

        {status ? <p className="mt-4 text-sm font-bold text-green-200">{status}</p> : null}
        {error ? <p className="mt-4 text-sm font-bold text-red-200">{error}</p> : null}
      </section>

      <EditPlayerModal open={editModalOpen} onClose={closeEditModal} player={editingPlayer} />
    </div>
  )
}

function StatBlock({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">{label}</p>
    </div>
  )
}

function PlayerQueue({ activeTab, players, workingId, onEdit, onVerdict, onQuarantine, onRestore }) {
  if (!players.length) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
        {activeTab === 'quarantine' ? 'No quarantined operators.' : 'No entries need moderator review.'}
      </div>
    )
  }

  return (
    <div className="mt-4 grid gap-3">
      {players.map((player, index) => {
        const threat = getThreatStyle(player.threatLevel)
        const verdict = verdictMeta(player.moderationStatus)
        const hidden = Boolean(player.quarantinedAt)

        return (
          <article key={player.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-gray-700 px-2 py-0.5 text-xs font-black text-gray-400">#{index + 1}</span>
                  <h2 className="truncate text-lg font-black uppercase tracking-[0.04em] text-white">{player.name}</h2>
                  <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] ${threat.badge}`}>{threat.label}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] ${verdict.tone}`}>{verdict.label}</span>
                  {hidden ? (
                    <span className="rounded-full border border-orange-400/40 bg-orange-400/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-orange-100">Hidden</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-gray-500">{player.notes || 'No notes.'}</p>
                {player.moderationNote ? <p className="mt-2 text-sm font-bold text-gray-300">Verdict note: {player.moderationNote}</p> : null}
                {hidden ? <p className="mt-2 text-sm font-bold text-orange-200">Hidden: {player.quarantineReason || 'No reason logged.'}</p> : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onEdit(player)} className="mod-button border-orange-500/50 bg-orange-500/12 text-orange-100 hover:bg-orange-500/20">Edit</button>
                {hidden ? (
                  <button type="button" onClick={() => onRestore(player)} disabled={workingId === `restore-${player.id}`} className="mod-button border-green-500/50 bg-green-500/12 text-green-100 hover:bg-green-500/20">
                    <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                    Restore
                  </button>
                ) : (
                  <button type="button" onClick={() => onQuarantine(player)} disabled={workingId === `quarantine-${player.id}`} className="mod-button border-red-500/50 bg-red-500/12 text-red-100 hover:bg-red-500/20">
                    <ArchiveX className="h-4 w-4" aria-hidden="true" />
                    Hide
                  </button>
                )}
              </div>
            </div>

            {!hidden ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                {verdictOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onVerdict(player, option.value)}
                    disabled={workingId === `verdict-${player.id}-${option.value}`}
                    className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-full border px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] transition disabled:opacity-60 ${option.tone}`}
                  >
                    {option.value === 'verified' || option.value === 'cleared' ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <Siren className="h-3.5 w-3.5" aria-hidden="true" />}
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

function ChatQueue({ messages, workingId, currentUserId, onDelete, onMute }) {
  if (!messages.length) {
    return <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">No public chat messages match the current search.</div>
  }

  return (
    <div className="mt-4 grid gap-3">
      {messages.map((message) => (
        <article key={message.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-lg font-black uppercase tracking-[0.04em] text-white">{clanPrefix(message.profile)} {displayProfileName(message.profile)}</p>
              <RoleBadge role={message.profile?.role} compact />
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">{formatDateTime(message.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-400">{message.body || '[media]'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[15, 60].map((minutes) => (
              <button key={minutes} type="button" onClick={() => onMute(message, minutes)} disabled={message.user_id === currentUserId || workingId === `mute-${message.user_id}-${minutes}`} className="mod-button border-yellow-500/50 bg-yellow-500/12 text-yellow-100 hover:bg-yellow-500/20">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {minutes}m
              </button>
            ))}
            <button type="button" onClick={() => onDelete(message.id)} disabled={workingId === `message-${message.id}`} className="mod-button border-red-500/50 bg-red-500/12 text-red-100 hover:bg-red-500/20">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

function MuteQueue({ mutes, workingId, onClear }) {
  if (!mutes.length) {
    return <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">No active public chat mutes.</div>
  }

  return (
    <div className="mt-4 grid gap-3">
      {mutes.map((mute) => (
        <article key={mute.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-black uppercase tracking-[0.04em] text-white">{displayProfileName(mute.targetProfile)}</p>
              <span className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-yellow-100">Until {formatDateTime(mute.ends_at)}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{mute.reason || 'No reason logged.'}</p>
          </div>
          <button type="button" onClick={() => onClear(mute.id)} disabled={workingId === `clear-mute-${mute.id}`} className="mod-button border-green-500/50 bg-green-500/12 text-green-100 hover:bg-green-500/20">
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            Clear
          </button>
        </article>
      ))}
    </div>
  )
}

function ActionLog({ events }) {
  if (!events.length) {
    return <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">No moderation actions logged yet.</div>
  }

  return (
    <div className="mt-4 grid gap-3">
      {events.map((event) => (
        <article key={event.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-200" aria-hidden="true" />
            <p className="font-black uppercase tracking-[0.04em] text-white">{eventLabel(event)}</p>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">{formatDateTime(event.created_at)}</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            By {displayProfileName(event.actorProfile)}{event.details?.reason ? ` · ${event.details.reason}` : ''}{event.details?.note ? ` · ${event.details.note}` : ''}
          </p>
        </article>
      ))}
    </div>
  )
}

export default Moderator