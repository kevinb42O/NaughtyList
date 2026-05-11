import { ArrowDownUp, Filter, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import PlayerRow from '../components/PlayerRow.jsx'
import { useIntel } from '../context/useIntel.js'
import { b21Tags } from '../data/mockPlayers.js'
import { comparePlayersByPriority } from '../utils/threat.js'

const sortOptions = [
  ['priority', 'Priority'],
  ['recent', 'Recent'],
  ['trust-low', 'Lowest Trust'],
  ['trust-high', 'Highest Trust'],
  ['name', 'Name'],
]

function Database() {
  const { players } = useIntel()
  const [threatFilter, setThreatFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [sortMode, setSortMode] = useState('priority')

  const filteredPlayers = useMemo(() => {
    const visiblePlayers = players.filter((player) => {
      const matchesThreat = threatFilter === 'all' || player.threatLevel === threatFilter
      const matchesTag = tagFilter === 'all' || player.tags.includes(tagFilter)

      return matchesThreat && matchesTag
    })

    if (sortMode === 'recent') {
      return [...visiblePlayers].sort(
        (first, second) => new Date(second.createdAt) - new Date(first.createdAt),
      )
    }

    if (sortMode === 'trust-low') {
      return [...visiblePlayers].sort((first, second) => first.trustScore - second.trustScore)
    }

    if (sortMode === 'trust-high') {
      return [...visiblePlayers].sort((first, second) => second.trustScore - first.trustScore)
    }

    if (sortMode === 'name') {
      return [...visiblePlayers].sort((first, second) => first.name.localeCompare(second.name))
    }

    return [...visiblePlayers].sort(comparePlayersByPriority)
  }, [players, sortMode, tagFilter, threatFilter])

  function resetFilters() {
    setThreatFilter('all')
    setTagFilter('all')
  }

  return (
    <div>
      <PageHeader eyebrow="Master View" title="Full Naughty List">
        Sort and filter the entire roster by threat, trust score, and repeat behavior tags.
      </PageHeader>

      <section className="panel mb-5 rounded-[1.8rem] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-gray-300">
          <Filter className="h-4 w-4 text-green-300" aria-hidden="true" />
          Filters
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'All'],
            ['hostile', 'KOS'],
            ['caution', 'Caution'],
            ['friendly', 'Friendly'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setThreatFilter(value)}
              className={`rounded-full border px-3 py-2 text-sm font-black uppercase transition ${
                threatFilter === value
                  ? 'border-red-500/60 bg-red-500/12 text-red-100'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              {label}
            </button>
          ))}

          <select
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-sm font-black uppercase text-gray-200 outline-none focus:border-red-400"
            aria-label="Filter by specific tag"
          >
            <option value="all">Any Tag</option>
            {b21Tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2">
            <ArrowDownUp className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="bg-transparent text-sm font-black uppercase text-gray-200 outline-none"
              aria-label="Sort roster"
            >
              {sortOptions.map(([value, label]) => (
                <option key={value} value={value} className="bg-neutral-950">
                  {label}
                </option>
              ))}
            </select>
          </div>

          {(threatFilter !== 'all' || tagFilter !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-black uppercase text-gray-300 hover:border-white/20"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-3">
        {players.length === 0 ? (
          <div className="panel rounded-[1.5rem] p-6 text-center text-sm font-bold text-gray-400">
            <p className="intel-label mb-3">No entries yet</p>
            <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
              The list is empty
            </h2>
            <p className="mx-auto mt-3 max-w-xl leading-6 text-gray-400">
              Add your first real operator record and this roster view becomes your main reference board.
            </p>
            <Link
              to="/add"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
            >
              Add the first record
            </Link>
          </div>
        ) : filteredPlayers.length ? (
          filteredPlayers.map((player) => <PlayerRow key={player.id} player={player} />)
        ) : (
          <div className="panel rounded-[1.5rem] p-5 text-sm font-bold text-gray-500">
            No players match the active filters.
          </div>
        )}
      </section>
    </div>
  )
}

export default Database
