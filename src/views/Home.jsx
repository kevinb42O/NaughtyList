import { Plus, Search, ShieldX } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import AddPlayerModal from '../components/AddPlayerModal.jsx'
import PlayerRow from '../components/PlayerRow.jsx'
import { useIntel } from '../context/useIntel.js'
import { comparePlayersByPriority } from '../utils/threat.js'

const threatFilters = [
  ['all', 'All'],
  ['hostile', 'KOS'],
  ['caution', 'Caution'],
  ['friendly', 'Friendly'],
]

function SortablePlayerRow({ player, isDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: player.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handle = (
    <span
      {...listeners}
      {...attributes}
      className="mr-1 cursor-grab touch-none text-gray-600 hover:text-gray-400 active:cursor-grabbing"
      aria-label="Drag to reorder"
    >
      <GripVertical className="h-5 w-5" />
    </span>
  )

  return (
    <div ref={setNodeRef} style={style}>
      <PlayerRow player={player} dragHandle={handle} />
    </div>
  )
}

function Home() {
  const { players, isAdmin, reorderPlayers } = useIntel()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [threatFilter, setThreatFilter] = useState('all')
  const [localPlayers, setLocalPlayers] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const isAddRouteOpen = searchParams.get('add') === '1'
  const isAddModalOpen = addModalOpen || isAddRouteOpen

  const isFiltering = query.trim() !== '' || threatFilter !== 'all'

  function openAddModal() {
    setAddModalOpen(true)
  }

  function closeAddModal() {
    setAddModalOpen(false)
    if (isAddRouteOpen) {
      navigate('/', { replace: true })
    }
  }

  const filteredPlayers = useMemo(() => {
    const source = localPlayers ?? players
    const normalizedQuery = query.trim().toLowerCase()
    return [...source]
      .filter((player) => {
        const matchesName =
          !normalizedQuery ||
          player.name.toLowerCase().includes(normalizedQuery) ||
          player.clan.toLowerCase().includes(normalizedQuery)
        const matchesThreat = threatFilter === 'all' || player.threatLevel === threatFilter
        return matchesName && matchesThreat
      })
      .sort(isFiltering ? comparePlayersByPriority : (a, b) => a.sortOrder - b.sortOrder)
  }, [localPlayers, players, query, threatFilter, isFiltering])

  // Keep localPlayers in sync when remote players change (but not during an active drag session)
  const orderedPlayers = useMemo(() => {
    if (!isAdmin || isFiltering) return null
    return localPlayers ?? [...players].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [isAdmin, isFiltering, localPlayers, players])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const current = orderedPlayers ?? filteredPlayers
    const oldIndex = current.findIndex((p) => p.id === active.id)
    const newIndex = current.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(current, oldIndex, newIndex).map((p, i) => ({ ...p, sortOrder: i + 1 }))

    setLocalPlayers(reordered)
    reorderPlayers(reordered.map((p) => p.id)).catch(() => setLocalPlayers(null))
  }

  const stats = useMemo(
    () => [
      { label: 'Operators', value: players.length, tone: 'text-white' },
      { label: 'KOS', value: players.filter((p) => p.threatLevel === 'hostile').length, tone: 'text-red-300' },
      { label: 'Caution', value: players.filter((p) => p.threatLevel === 'caution').length, tone: 'text-orange-200' },
      { label: 'Clips', value: players.filter((p) => p.evidenceUrl).length, tone: 'text-cyan-200' },
    ],
    [players],
  )

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="panel overflow-hidden rounded-[2rem] px-5 py-6 sm:px-7 sm:py-7">
        <p className="intel-label mb-3 text-red-100">Local Building 21 Watchboard</p>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-black uppercase leading-none tracking-[0.04em] text-white sm:text-6xl">
              21rats
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
              Track repeat problems, document hostile operators, and tie them back to squads
              that keep showing up in Building 21.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-red-500/60 bg-red-500/15 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 shadow-[0_0_28px_rgba(239,68,68,0.16)] transition hover:bg-red-500/25"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                Log Operator
              </button>
              <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-400">
                <ShieldX className="h-4 w-4 text-red-200" aria-hidden="true" />
                Fast intel entry
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))] p-4 shadow-[0_0_36px_rgba(0,0,0,0.3)]">
              <div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-red-500/10 blur-3xl" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.4rem] border border-red-500/20 bg-black/30 p-2 shadow-[0_0_24px_rgba(239,68,68,0.14)] sm:h-28 sm:w-28">
                  <img
                    src="/ratslogo.png?v=20260511-ratslogo"
                    alt="21rats logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="intel-label text-red-100">Identity</p>
                  <p className="mt-2 text-2xl font-black uppercase tracking-[0.04em] text-white">21rats</p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    One clear mark across the board, install icon, and push notifications.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
              {stats.map((stat) => (
                <div key={stat.label} className="metric-card min-w-24">
                  <p className={`text-2xl font-black ${stat.tone}`}>{stat.value}</p>
                  <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-gray-500">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel rounded-[1.8rem] p-4 sm:p-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="intel-label">The List</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.04em] text-white">
                Naughty Operators
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300">
                {filteredPlayers.length} shown
              </span>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </button>
            </div>
            {isAdmin && !isFiltering ? (
              <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-yellow-300">
                Drag to reorder
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-red-200"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search operator or clan tag"
                className="field min-h-14 pl-12 text-lg font-black uppercase tracking-[0.04em] placeholder:text-gray-600"
                autoComplete="off"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {threatFilters.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setThreatFilter(value)}
                  className={`rounded-full border px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] transition ${
                    threatFilter === value
                      ? 'border-red-500/50 bg-red-500/12 text-red-100'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {filteredPlayers.length ? (
            isAdmin && !isFiltering ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredPlayers.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  {filteredPlayers.map((player) => (
                    <SortablePlayerRow key={player.id} player={player} />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              filteredPlayers.map((player) => <PlayerRow key={player.id} player={player} />)
            )
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/25 p-6 text-center">
              <p className="intel-label mb-3">No entries yet</p>
              <h3 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
                Start the list properly
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400">
                There is no fake sample data. Add real operators and they will show up here immediately.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
              >
                Add the first entry
              </button>
            </div>
          )}
        </div>
      </section>

      <AddPlayerModal open={isAddModalOpen} onClose={closeAddModal} />
    </div>
  )
}

export default Home
