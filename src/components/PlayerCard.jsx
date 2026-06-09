import { ExternalLink } from 'lucide-react'
import { getThreatStyle } from '../utils/threat.js'

function PlayerCard({ player, compact = false, rank }) {
  const threat = getThreatStyle(player.threatLevel)

  return (
    <article className={`panel rounded-[1.5rem] p-5 ${threat.glow}`}>
      <div className="flex flex-wrap items-center gap-2">
        {rank ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-indigo-500/70 bg-indigo-500/15 text-sm font-black text-indigo-200">
            {rank}
          </span>
        ) : null}
        <h2 className="truncate text-xl font-black uppercase tracking-[0.04em] text-white">
          {player.name}
        </h2>
        {player.clan ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-gray-200">
            {player.clan}
          </span>
        ) : null}
        <span className={`rounded-full border px-2.5 py-1 text-xs font-black uppercase ${threat.badge}`}>
          {threat.label}
        </span>
        {player.evidenceUrl ? (
          <a
            href={player.evidenceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-cyan-400/50 bg-cyan-400/10 px-2.5 py-1 text-xs font-black uppercase text-cyan-100"
            aria-label={`Open evidence for ${player.name}`}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Clip
          </a>
        ) : null}
      </div>

      {player.tags.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {player.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-bold text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {!compact && player.notes ? (
        <p className="mt-4 border-l-2 border-gray-700 pl-3 text-sm leading-6 text-gray-400">
          {player.notes}
        </p>
      ) : null}
    </article>
  )
}

export default PlayerCard
