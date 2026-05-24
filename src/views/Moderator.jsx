import { ArchiveRestore, ArchiveX, CheckCircle2, Clock, Crosshair, Search, ShieldAlert, ShieldCheck, Siren, Trash2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import CollapsiblePanel from '../components/CollapsiblePanel.jsx'
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
  const removedCount = Number(event.details?.removedCount ?? 0)

  switch (event.event_type) {
    case 'player_verdict':
      return `Set verdict ${status}`
    case 'player_quarantined':
      return 'Quarantined operator'
    case 'player_restored':
      return 'Restored operator'
    case 'player_kills_adjusted':
      return removedCount > 0 ? `Removed ${removedCount} ${removedCount === 1 ? 'kill' : 'kills'}` : 'Adjusted kill count'
    case 'public_chat_muted':
      return `Muted ${target}`
    case 'public_chat_mute_cleared':
      return `Cleared mute for ${target}`
    case 'public_chat_deleted':
      return `Deleted public chat from ${target}`
    case 'public_chat_pruned':
      return 'Pruned old public chat'
    case 'public_chat_cleared':
      return 'Cleared public chat'
    default:
      return event.event_type.replaceAll('_', ' ')
  }
}

function eventDetailsSummary(event) {
  const details = []
  const removedCount = Number(event.details?.removedCount ?? NaN)
  const remainingKillCount = Number(event.details?.remainingKillCount ?? NaN)

  if (Number.isFinite(removedCount) && removedCount > 0) {
    details.push(`removed ${removedCount}`)
  }

  if (Number.isFinite(remainingKillCount)) {
    details.push(`${remainingKillCount} remaining`)
  }

  if (event.details?.reason) {
    details.push(event.details.reason)
  }

  if (Number.isFinite(Number(event.details?.deletedCount))) {
    details.push(`${Number(event.details.deletedCount)} deleted`)
  }

  if (Number.isFinite(Number(event.details?.olderThanDays))) {
    details.push(`older than ${Number(event.details.olderThanDays)} days`)
  }

  if (event.details?.note) {
    details.push(event.details.note)
  }

  return details.join(' · ')
}

function Moderator({ embedded = false }) {
  const {
    user,
    isAuthenticated,
    isModerator,
    isAdmin,
    role,
    profileDisplayName,
    players,
    publicMessages,
    publicChatMutes,
    moderationEvents,
    setPlayerVerdict,
    quarantinePlayer,
    restorePlayer,
    adjustPlayerKills,
    mutePublicChatUser,
    clearPublicChatMute,
    deletePublicMessage,
    prunePublicChat,
  } = useIntel()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState('')
  const [query, setQuery] = useState('')
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [killAdjustmentDrafts, setKillAdjustmentDrafts] = useState({})

  const normalizedQuery = query.trim().toLowerCase()
  const quarantinedPlayers = players.filter((player) => Boolean(player.quarantinedAt))
  const reviewPlayers = players.filter((player) => !player.quarantinedAt && player.moderationStatus !== 'verified' && player.moderationStatus !== 'cleared')
  const killPlayers = players.filter((player) => (player.killCount ?? 0) > 0)

  function filterPlayers(source) {
    return source.filter((player) => {
      if (!normalizedQuery) {
        return true
      }

      return [player.name, player.clan, player.notes, player.moderationNote, player.quarantineReason, ...(player.tags ?? [])]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }

  const filteredMessages = [...publicMessages]
    .reverse()
    .filter((message) => {
      if (!normalizedQuery) {
        return true
      }

      return [message.body, message.profile?.display_name, message.profile?.clan_tag]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })

  const stats = {
    review: reviewPlayers.length,
    quarantine: quarantinedPlayers.length,
    kills: players.reduce((totalKills, player) => totalKills + (player.killCount ?? 0), 0),
    mutes: publicChatMutes.length,
    chat: publicMessages.length,
  }

  function closeEditModal() {
    setEditingPlayer(null)
    setEditModalOpen(false)
  }

  async function runAction(id, successMessage, action) {
    setStatus('')
    setError('')
    setWorkingId(id)

    try {
      const nextStatus = await action()
      setStatus(nextStatus || successMessage)
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

  function updateKillDraft(playerId, value) {
    if (value === '') {
      setKillAdjustmentDrafts((currentDrafts) => ({
        ...currentDrafts,
        [playerId]: '',
      }))
      return
    }

    const numericValue = Number.parseInt(value, 10)

    if (Number.isNaN(numericValue)) {
      return
    }

    setKillAdjustmentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [playerId]: String(Math.max(0, numericValue)),
    }))
  }

  async function handleAdjustKills(player, requestedCount) {
    const currentKillCount = player.killCount ?? 0
    const safeRequestedCount = Math.min(Math.max(Number(requestedCount) || 0, 0), currentKillCount)

    if (currentKillCount < 1) {
      setStatus('')
      setError(`${player.name} has no kills to remove.`)
      return
    }

    if (safeRequestedCount < 1) {
      setStatus('')
      setError('Enter a kill count to deduct.')
      return
    }

    await runAction(`kills-${player.id}`, 'Kill count adjusted.', async () => {
      const result = await adjustPlayerKills(player.id, safeRequestedCount)
      const removedCount = result.removed_count ?? safeRequestedCount
      const remainingKillCount = result.remaining_kill_count ?? Math.max(currentKillCount - removedCount, 0)

      setKillAdjustmentDrafts((currentDrafts) => ({
        ...currentDrafts,
        [player.id]: remainingKillCount > 0 ? String(Math.min(safeRequestedCount, remainingKillCount)) : '',
      }))

      return remainingKillCount === 0
        ? `Cleared all kills for ${player.name}.`
        : `Removed ${removedCount} ${removedCount === 1 ? 'kill' : 'kills'} from ${player.name}. ${remainingKillCount} remain.`
    })
  }

  async function handleClearKills(player) {
    await handleAdjustKills(player, player.killCount ?? 0)
  }

  async function handleDeleteMessage(messageId) {
    await runAction(`message-${messageId}`, 'Public chat message deleted.', () => deletePublicMessage(messageId))
  }

  async function handlePrunePublicChat({ olderThanDays = 3, clearAll = false }) {
    const normalizedDays = Math.max(1, Math.floor(Number(olderThanDays) || 3))
    const confirmation = clearAll
      ? window.prompt('This clears all public chat history. Type CLEAR PUBLIC CHAT to continue.')
      : window.confirm(`Delete public chat messages older than ${normalizedDays} days?`)

    if (clearAll ? confirmation !== 'CLEAR PUBLIC CHAT' : !confirmation) {
      return
    }

    await runAction(
      clearAll ? 'prune-public-chat-all' : `prune-public-chat-${normalizedDays}`,
      clearAll ? 'Public chat cleared.' : 'Old public chat pruned.',
      async () => {
        const result = await prunePublicChat({ olderThanDays: normalizedDays, clearAll })
        const count = result.deletedCount ?? 0

        return clearAll
          ? `Cleared ${count} public chat ${count === 1 ? 'message' : 'messages'}.`
          : `Deleted ${count} public chat ${count === 1 ? 'message' : 'messages'} older than ${normalizedDays} days.`
      },
    )
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
    <div className={embedded ? 'grid gap-5' : ''}>
      {!embedded ? (
        <PageHeader eyebrow="Moderator Screen" title="Control Queue">
          Review intel, quarantine bad records, cool down public chat, and keep every action visible.
        </PageHeader>
      ) : null}

      <CollapsiblePanel
        eyebrow="Moderator"
        title="Queue Overview"
        description="Search across moderation tools and check the live workload before opening a queue."
        icon={ShieldAlert}
        meta={profileDisplayName}
      >
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <p className="font-black uppercase tracking-[0.04em] text-white">{profileDisplayName}</p>
          <RoleBadge role={role} />
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(5,minmax(0,120px))]">
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
          <StatBlock label="Kills" value={stats.kills} />
          <StatBlock label="Mutes" value={stats.mutes} />
          <StatBlock label="Chat" value={stats.chat} />
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel className="mt-5" eyebrow="Review" title="Intel Review" description="Set verdicts on new or questionable operator records." icon={ShieldCheck} meta={`${stats.review} entries`}>
        <PlayerQueue
          activeTab="review"
          players={filterPlayers(reviewPlayers)}
          workingId={workingId}
          onEdit={(player) => {
            setEditingPlayer(player)
            setEditModalOpen(true)
          }}
          onVerdict={handleVerdict}
          onQuarantine={handleQuarantine}
          onRestore={handleRestore}
        />
      </CollapsiblePanel>

      <CollapsiblePanel className="mt-5" defaultOpen={false} eyebrow="Quarantine" title="Hidden Operators" description="Restore records that were hidden from public lists." icon={ArchiveX} meta={`${quarantinedPlayers.length} hidden`}>
        <PlayerQueue
          activeTab="quarantine"
          players={filterPlayers(quarantinedPlayers)}
          workingId={workingId}
          onEdit={(player) => {
            setEditingPlayer(player)
            setEditModalOpen(true)
          }}
          onVerdict={handleVerdict}
          onQuarantine={handleQuarantine}
          onRestore={handleRestore}
        />
      </CollapsiblePanel>

      <CollapsiblePanel className="mt-5" defaultOpen={false} eyebrow="Kills" title="Kill Adjustments" description="Deduct accidental or abusive kill logs without deleting the operator." icon={Crosshair} meta={`${stats.kills} logged`}>
        <KillQueue
          players={filterPlayers(killPlayers)}
          workingId={workingId}
          killAdjustmentDrafts={killAdjustmentDrafts}
          onDraftChange={updateKillDraft}
          onDeduct={handleAdjustKills}
          onClearAll={handleClearKills}
        />
      </CollapsiblePanel>

      <CollapsiblePanel className="mt-5" defaultOpen={false} eyebrow="Chat" title="Public Chat Cleanup" description="Delete public messages or apply short cooldown mutes." icon={Trash2} meta={`${stats.chat} messages`}>
        <PublicChatRetentionControls
          isAdmin={isAdmin}
          workingId={workingId}
          onPrune={handlePrunePublicChat}
        />
        <ChatQueue
          messages={filteredMessages}
          workingId={workingId}
          currentUserId={user?.id}
          onDelete={handleDeleteMessage}
          onMute={handleMute}
        />
      </CollapsiblePanel>

      <CollapsiblePanel className="mt-5" defaultOpen={false} eyebrow="Mutes" title="Active Chat Mutes" description="Clear public chat cooldowns when they are no longer needed." icon={Undo2} meta={`${publicChatMutes.length} active`}>
        <MuteQueue mutes={publicChatMutes} workingId={workingId} onClear={handleClearMute} />
      </CollapsiblePanel>

      <CollapsiblePanel className="mt-5" defaultOpen={false} eyebrow="Log" title="Moderation Audit" description="Review the recent action trail for accountability." icon={CheckCircle2} meta={`${moderationEvents.length} events`}>
        <ActionLog events={moderationEvents} />
      </CollapsiblePanel>

      {status || error ? (
        <section className="panel mt-5 rounded-[1.4rem] p-4">
          {status ? <p className="text-sm font-bold text-green-200">{status}</p> : null}
          {error ? <p className="text-sm font-bold text-red-200">{error}</p> : null}
        </section>
      ) : null}

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

function PublicChatRetentionControls({ isAdmin, workingId, onPrune }) {
  const pruneWorking = workingId === 'prune-public-chat-3'
  const clearWorking = workingId === 'prune-public-chat-all'

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-lg font-black uppercase tracking-[0.04em] text-white">Retention</p>
          <p className="mt-1 text-sm font-bold leading-6 text-gray-500">
            Keep recent context, remove old public history, and log every cleanup action.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPrune({ olderThanDays: 3 })}
            disabled={pruneWorking}
            className="mod-button border-green-500/50 bg-green-500/12 text-green-100 hover:bg-green-500/20"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Older Than 3d
          </button>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => onPrune({ clearAll: true })}
              disabled={clearWorking}
              className="mod-button border-red-500/50 bg-red-500/12 text-red-100 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear All
            </button>
          ) : null}
        </div>
      </div>
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

function KillQueue({ players, workingId, killAdjustmentDrafts, onDraftChange, onDeduct, onClearAll }) {
  if (!players.length) {
    return <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">No logged kills to adjust right now.</div>
  }

  const sortedPlayers = [...players].sort((firstPlayer, secondPlayer) => {
    const killDifference = (secondPlayer.killCount ?? 0) - (firstPlayer.killCount ?? 0)

    if (killDifference !== 0) {
      return killDifference
    }

    return firstPlayer.name.localeCompare(secondPlayer.name)
  })

  return (
    <div className="mt-4 grid gap-3">
      {sortedPlayers.map((player) => {
        const currentKillCount = player.killCount ?? 0
        const draftValue = killAdjustmentDrafts[player.id] ?? ''
        const requestedCount = Number.parseInt(draftValue, 10)
        const safeRequestedCount = Number.isNaN(requestedCount)
          ? 0
          : Math.min(Math.max(requestedCount, 0), currentKillCount)
        const lastKillClanTag = player.lastKillClanTag || player.lastKillProfileClanTag
        const clearWorking = workingId === `kills-${player.id}`

        return (
          <article key={player.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-black uppercase tracking-[0.04em] text-white">{player.name}</h2>
                  <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-red-100">
                    {currentKillCount} {currentKillCount === 1 ? 'kill' : 'kills'}
                  </span>
                </div>

                {player.lastKillAt ? (
                  <p className="mt-2 text-sm font-bold text-gray-400">
                    Latest logger: {lastKillClanTag ? `[${lastKillClanTag}] ` : ''}{player.lastKillDisplayName || 'Operator'} · {formatDateTime(player.lastKillAt)}
                  </p>
                ) : null}

                <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                  Result after deduction: {Math.max(currentKillCount - safeRequestedCount, 0)} kills
                </p>
              </div>

              <div className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 lg:max-w-md">
                <div className="mb-2 flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-400">
                  <Crosshair className="h-4 w-4 text-red-100" aria-hidden="true" />
                  Kill control
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="number"
                    min="1"
                    max={currentKillCount}
                    inputMode="numeric"
                    value={draftValue}
                    onChange={(event) => onDraftChange(player.id, event.target.value)}
                    className="field min-h-11 w-full text-center sm:w-24"
                    placeholder="0"
                    aria-label={`Kills to deduct for ${player.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => onDeduct(player, safeRequestedCount)}
                    disabled={clearWorking || safeRequestedCount < 1}
                    className="mod-button border-yellow-500/50 bg-yellow-500/12 text-yellow-100 hover:bg-yellow-500/20"
                  >
                    Deduct
                  </button>
                  <button
                    type="button"
                    onClick={() => onClearAll(player)}
                    disabled={clearWorking || currentKillCount < 1}
                    className="mod-button border-red-500/50 bg-red-500/12 text-red-100 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Clear All
                  </button>
                </div>

                <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                  Deduction clamps at zero automatically.
                </p>
              </div>
            </div>
          </article>
        )
      })}
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
            By {displayProfileName(event.actorProfile)}{eventDetailsSummary(event) ? ` · ${eventDetailsSummary(event)}` : ''}
          </p>
        </article>
      ))}
    </div>
  )
}

export default Moderator
