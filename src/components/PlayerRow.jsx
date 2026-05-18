import { Crosshair, Edit3, ExternalLink, History } from 'lucide-react'
import { getThreatStyle } from '../utils/threat.js'

const killFeedbackToneClasses = {
  success: 'text-green-200',
  warning: 'text-yellow-200',
  error: 'text-red-200',
}

function PlayerRow({
  player,
  dragHandle,
  number,
  onEdit,
  onLogKill,
  onOpenKillLog,
  killPending = false,
  killDisabled = false,
  killButtonLabel = 'Log Kill',
  killMessage = '',
  killTone = 'success',
  cooldownActive = false,
  cooldownLabel = '',
  cooldownProgress = 0,
}) {
  const threat = getThreatStyle(player.threatLevel)
  const killFeedbackToneClass = killFeedbackToneClasses[killTone] ?? 'text-gray-300'
  const lastKillName = player.lastKillDisplayName || 'Operator'
  const lastKillClanTag = player.lastKillClanTag || player.lastKillProfileClanTag
  const showLastKillIntel = Boolean(player.lastKillAt || player.lastKillUserId)

  return (
    <article className={`watchlist-row relative rounded-[1.4rem] p-4 ${threat.glow}`}>
      <div className={`absolute inset-y-0 left-0 w-1.5 ${threat.dot}`} aria-hidden="true" />

      <div className="pl-3">
        <div className="flex flex-wrap items-center gap-2">
          {dragHandle}
          {number !== undefined ? (
            <span className="rounded-md border border-gray-700 px-2 py-0.5 text-xs font-black text-gray-400">
              #{number}
            </span>
          ) : null}
          <h2 className="truncate text-xl font-black uppercase tracking-[0.03em] text-white">
            {player.clan ? (
              <span className="text-gray-400">[{player.clan}]&nbsp;</span>
            ) : null}
            {player.name}
          </h2>
          <span className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.2em] ${threat.badge}`}>
            {threat.label}
          </span>
          <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-gray-200">
            {player.killCount ?? 0} kills
          </span>
          {onOpenKillLog ? (
            <button
              type="button"
              onClick={() => onOpenKillLog(player)}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-gray-200 transition hover:border-red-500/35 hover:bg-red-500/10 hover:text-red-100"
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              History
            </button>
          ) : null}
          {player.evidenceUrl ? (
            <a
              href={player.evidenceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-cyan-100"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Clip
            </a>
          ) : null}
          {onLogKill ? (
            <button
              type="button"
              onClick={() => onLogKill(player)}
              disabled={killDisabled}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-red-500/45 bg-red-500/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/18 disabled:border-white/10 disabled:bg-white/5 disabled:text-gray-500 disabled:hover:bg-white/5"
            >
              <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
              {killPending ? 'Logging...' : killButtonLabel}
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(player)}
              className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-400/10 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-orange-100 transition hover:bg-orange-400/20"
            >
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </button>
          ) : null}
        </div>

        {player.notes ? (
          <p className="mt-3 text-sm leading-6 text-gray-400">{player.notes}</p>
        ) : null}

        {showLastKillIntel ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-300">
            <span className="rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-gray-400">Logged by</span>
            <span className="min-w-0 max-w-full truncate text-white">
              {lastKillClanTag ? <span className="text-gray-400">[{lastKillClanTag}] </span> : null}
              {lastKillName}
            </span>
            <span className="rounded-md border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-red-100">
              {player.lastKillUserTotal ?? 0} total
            </span>
          </div>
        ) : null}

        {killMessage ? (
          <p className={`mt-3 text-[0.72rem] font-black uppercase tracking-[0.16em] ${killFeedbackToneClass}`}>
            {killMessage}
          </p>
        ) : null}

        {cooldownActive ? (
          <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/25 p-3">
            <div className="flex items-center justify-between gap-3 text-[0.68rem] font-black uppercase tracking-[0.18em]">
              <span className="text-red-100">Kill cooldown</span>
              <span className="text-gray-300">{cooldownLabel}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full border border-white/10 bg-black/35">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(239,68,68,0.85),rgba(248,113,113,0.95),rgba(254,202,202,0.9))] transition-[width] duration-1000 ease-linear"
                style={{ width: `${cooldownProgress}%` }}
              />
            </div>
          </div>
        ) : null}

        {player.tags.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {player.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[0.68rem] font-bold text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}

export default PlayerRow
