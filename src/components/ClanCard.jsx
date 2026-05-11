import { AlertTriangle, ShieldCheck, Users, Video } from 'lucide-react'

function ClanCard({ clan, compact = false }) {
  const isHostile = clan.hostileCount > clan.friendlyCount
  const toneClasses = isHostile
    ? 'border-red-500/40 bg-red-500/10 text-red-100'
    : clan.friendlyCount === clan.memberCount
      ? 'border-green-400/40 bg-green-400/10 text-green-100'
      : 'border-orange-400/40 bg-orange-400/10 text-orange-100'

  const visibleMembers = compact ? clan.members.slice(0, 3) : clan.members.slice(0, 6)

  return (
    <article className="panel rounded-[1.4rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="intel-label mb-2">Clan Section</p>
          <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
            {clan.name}
          </h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.2em] ${toneClasses}`}>
          {clan.hostileCount ? `${clan.hostileCount} hostile` : 'watching'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-white/8 bg-black/25 px-2 py-3">
          <p className="text-xl font-black text-white">{clan.memberCount}</p>
          <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-gray-500">
            Members
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/25 px-2 py-3">
          <p className="text-xl font-black text-white">{clan.averageTrust}</p>
          <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-gray-500">
            Avg Trust
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/25 px-2 py-3">
          <p className="text-xl font-black text-white">{clan.evidenceCount}</p>
          <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-gray-500">
            Clips
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {clan.topTags.length ? (
          clan.topTags.map(({ tag, count }) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.68rem] font-bold text-gray-300"
            >
              {tag} x{count}
            </span>
          ))
        ) : (
          <span className="rounded-full border border-dashed border-white/10 px-2.5 py-1 text-[0.68rem] font-bold text-gray-500">
            No repeated tags yet
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.2em] text-gray-500">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Known Members</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {visibleMembers.map((member) => (
          <span
            key={member.id}
            className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs font-bold text-gray-200"
          >
            {member.name}
          </span>
        ))}
        {clan.members.length > visibleMembers.length ? (
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-bold text-gray-400">
            +{clan.members.length - visibleMembers.length} more
          </span>
        ) : null}
      </div>

      {!compact ? (
        <div className="mt-4 flex items-center gap-3 text-[0.68rem] font-black uppercase tracking-[0.2em] text-gray-500">
          {isHostile ? (
            <AlertTriangle className="h-3.5 w-3.5 text-red-300" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5 text-green-300" aria-hidden="true" />
          )}
          <span>Last seen {new Date(clan.lastSeen).toLocaleDateString()}</span>
          <Video className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
        </div>
      ) : null}
    </article>
  )
}

export default ClanCard
