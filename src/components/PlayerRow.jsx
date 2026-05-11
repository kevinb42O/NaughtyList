import { ExternalLink, Users } from 'lucide-react'
import { getThreatStyle } from '../utils/threat.js'

function PlayerRow({ player }) {
  const threat = getThreatStyle(player.threatLevel)

  return (
    <article className={`panel relative overflow-hidden rounded-[1.4rem] p-4 ${threat.glow}`}>
      <div className={`absolute inset-y-0 left-0 w-1.5 ${threat.dot}`} aria-hidden="true" />

      <div className="pl-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-xl font-black uppercase tracking-[0.03em] text-white">
            {player.name}
          </h2>
          <span className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.2em] ${threat.badge}`}>
            {threat.label}
          </span>
          {player.clan ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-gray-200">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {player.clan}
            </span>
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
        </div>

        {player.notes ? (
          <p className="mt-3 text-sm leading-6 text-gray-400">{player.notes}</p>
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
