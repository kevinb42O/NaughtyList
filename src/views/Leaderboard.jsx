import { Flame, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import PlayerCard from '../components/PlayerCard.jsx'
import { useIntel } from '../context/useIntel.js'
import { rankMostWanted } from '../utils/threat.js'

function Leaderboard() {
  const { players } = useIntel()

  const mostWanted = useMemo(() => {
    return [...players]
      .sort((first, second) => rankMostWanted(second) - rankMostWanted(first))
      .slice(0, 5)
  }, [players])

  return (
    <div>
      <PageHeader eyebrow="Heat Check" title="Most Wanted">
        Top five operators ranked by low trust, hostile status, and repeat problem tags.
      </PageHeader>

      <section className="panel mb-5 rounded-[1.8rem] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-200">
            <Trophy className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="intel-label">Priority Watchlist</p>
            <p className="text-sm text-gray-400">
              Ranking rewards documented hostile patterns over single bad vibes.
            </p>
          </div>
          <Flame className="ml-auto h-6 w-6 text-orange-300" aria-hidden="true" />
        </div>
      </section>

      <section className="grid gap-4">
        {mostWanted.length ? (
          mostWanted.map((player, index) => (
            <PlayerCard key={player.id} player={player} rank={index + 1} />
          ))
        ) : (
          <div className="panel rounded-[1.5rem] p-6 text-center text-sm font-bold text-gray-400">
            <p className="intel-label mb-3">No rankings yet</p>
            <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
              Nothing to rank
            </h2>
            <p className="mx-auto mt-3 max-w-xl leading-6 text-gray-400">
              Add a few real entries and the worst repeat offenders will rise to the top here.
            </p>
            <Link
              to="/?add=1"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-100 transition hover:bg-white/5"
            >
              Log an operator
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

export default Leaderboard
