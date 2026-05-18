import { Plus, Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { DailyOpsModal, DailyOpsSummary } from '../components/DailyCheckInPanel.jsx'
import KillLogModal from '../components/KillLogModal.jsx'
import PlayerRow from '../components/PlayerRow.jsx'
import { useIntel } from '../context/useIntel.js'
import { comparePlayersByPriority } from '../utils/threat.js'

const threatFilters = [
  ['all', 'All'],
  ['hostile', 'KOS'],
  ['caution', 'Caution'],
  ['friendly', 'Friendly'],
]

const killCooldownMs = 10 * 60 * 1000

function formatCooldownLabel(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getKillCooldownState(player, nowMs) {
  if (!player?.myKillCooldownEndsAt) {
    return {
      active: false,
      label: '',
      progressPercent: 0,
    }
  }

  const cooldownEndMs = new Date(player.myKillCooldownEndsAt).getTime()

  if (Number.isNaN(cooldownEndMs)) {
    return {
      active: false,
      label: '',
      progressPercent: 0,
    }
  }

  const remainingMs = cooldownEndMs - nowMs

  if (remainingMs <= 0) {
    return {
      active: false,
      label: '',
      progressPercent: 100,
    }
  }

  const lastKillMs = player.myLastKillAt ? new Date(player.myLastKillAt).getTime() : NaN
  const cooldownStartMs = Number.isNaN(lastKillMs) ? cooldownEndMs - killCooldownMs : lastKillMs
  const elapsedMs = Math.min(Math.max(nowMs - cooldownStartMs, 0), killCooldownMs)

  return {
    active: true,
    label: formatCooldownLabel(remainingMs),
    progressPercent: (elapsedMs / killCooldownMs) * 100,
  }
}

function SortablePlayerRow({
  player,
  isDragging,
  number,
  onLogKill,
  onOpenKillLog,
  killPending,
  killDisabled,
  killButtonLabel,
  killMessage,
  killTone,
  cooldownActive,
  cooldownLabel,
  cooldownProgress,
}) {
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
      <PlayerRow
        player={player}
        dragHandle={handle}
        number={number}
        onLogKill={onLogKill}
        onOpenKillLog={onOpenKillLog}
        killPending={killPending}
        killDisabled={killDisabled}
        killButtonLabel={killButtonLabel}
        killMessage={killMessage}
        killTone={killTone}
        cooldownActive={cooldownActive}
        cooldownLabel={cooldownLabel}
        cooldownProgress={cooldownProgress}
      />
    </div>
  )
}

function Home() {
  const { players, isAdmin, isAuthenticated, registerPlayerKill, reorderPlayers } = useIntel()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(searchQuery)
  const [threatFilter, setThreatFilter] = useState('all')
  const [localPlayers, setLocalPlayers] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [pendingKillId, setPendingKillId] = useState('')
  const [killFeedbackByPlayer, setKillFeedbackByPlayer] = useState({})
  const [killLogPlayer, setKillLogPlayer] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [dailyOpsOpen, setDailyOpsOpen] = useState(false)
  const isAddRouteOpen = searchParams.get('add') === '1'
  const isAddModalOpen = addModalOpen || isAddRouteOpen

  const isFiltering = query.trim() !== '' || threatFilter !== 'all'

  useEffect(() => {
    setQuery(searchQuery)
  }, [searchQuery])

  const openAddModal = useCallback(() => {
    setAddModalOpen(true)
  }, [])

  const closeAddModal = useCallback(() => {
    setAddModalOpen(false)
    if (isAddRouteOpen) {
      navigate('/', { replace: true })
    }
  }, [isAddRouteOpen, navigate])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

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

  const applyKillResultToLocalPlayers = useCallback((playerId, result) => {
    setLocalPlayers((currentPlayers) =>
      currentPlayers
        ? currentPlayers.map((currentPlayer) =>
            currentPlayer.id === playerId
              ? {
                  ...currentPlayer,
                  killCount: result.kill_count ?? currentPlayer.killCount,
                  myLastKillAt: result.recorded_at ?? currentPlayer.myLastKillAt,
                  myKillCooldownEndsAt: result.cooldown_ends_at ?? currentPlayer.myKillCooldownEndsAt,
                  lastKillUserId: result.last_kill_user_id ?? currentPlayer.lastKillUserId,
                  lastKillDisplayName: result.last_kill_display_name ?? currentPlayer.lastKillDisplayName,
                  lastKillProfileClanTag: result.last_kill_profile_clan_tag ?? currentPlayer.lastKillProfileClanTag,
                  lastKillUserTotal: result.last_kill_user_total ?? currentPlayer.lastKillUserTotal,
                  lastKillClanId: result.last_kill_clan_id ?? currentPlayer.lastKillClanId,
                  lastKillClanTag: result.last_kill_clan_tag ?? currentPlayer.lastKillClanTag,
                  lastKillClanTotal: result.last_kill_clan_total ?? currentPlayer.lastKillClanTotal,
                  lastKillAt: result.last_kill_at ?? currentPlayer.lastKillAt,
                }
              : currentPlayer,
          )
        : currentPlayers,
    )
  }, [])

  const handleRegisterKill = useCallback(
    async (player) => {
      if (!isAuthenticated || pendingKillId === player.id) {
        return
      }

      setPendingKillId(player.id)
      setKillFeedbackByPlayer((currentFeedback) => ({
        ...currentFeedback,
        [player.id]: {
          tone: 'success',
          message: '',
        },
      }))

      try {
        const result = await registerPlayerKill(player.id)
        const cooldownState = getKillCooldownState(
          {
            myLastKillAt: result.recorded_at,
            myKillCooldownEndsAt: result.cooldown_ends_at,
          },
          Date.now(),
        )

        applyKillResultToLocalPlayers(player.id, result)

        setKillFeedbackByPlayer((currentFeedback) => ({
          ...currentFeedback,
          [player.id]: result.accepted
            ? {
                tone: 'success',
                message: cooldownState.active ? `Kill logged. Ready again in ${cooldownState.label}.` : 'Kill logged.',
              }
            : {
                tone: 'warning',
                message: cooldownState.active ? `Cooldown active. ${cooldownState.label} left.` : result.reason,
              },
        }))
      } catch (killError) {
        setKillFeedbackByPlayer((currentFeedback) => ({
          ...currentFeedback,
          [player.id]: {
            tone: 'error',
            message: killError.message,
          },
        }))
      } finally {
        setPendingKillId('')
      }
    },
    [applyKillResultToLocalPlayers, isAuthenticated, pendingKillId, registerPlayerKill],
  )

  return (
    <div className="flex flex-1 flex-col gap-0">
      <section
        className="relative z-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.42)] sm:rounded-[2rem]"
        aria-labelledby="home-hero-title"
      >
        <h1 id="home-hero-title" className="sr-only">
          21 RATS
        </h1>
        <img
          src="/final_header.png"
          alt="21 RATS squad lineup"
          className="aspect-[1672/941] w-full object-cover"
          width="1672"
          height="941"
          decoding="async"
          fetchPriority="high"
        />
      </section>

      <section className="watchlist-shell relative z-10 -mt-[clamp(3.5rem,17vw,12.25rem)] rounded-[1.8rem] p-4 sm:p-5">
        <DailyOpsSummary className="mb-4" onOpen={() => setDailyOpsOpen(true)} />

        <div className="flex flex-col gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[1.95rem] font-black uppercase italic leading-none tracking-[0.18em] text-transparent bg-gradient-to-r from-white via-red-100 to-red-400 bg-clip-text sm:text-[2.3rem]">
                MOST WANTED
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300">
                {filteredPlayers.length} visible
              </span>
              {!isAuthenticated ? (
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-400">
                  Login to log kills
                </span>
              ) : null}
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New Intel
              </button>
            </div>
            {isAdmin && !isFiltering ? (
              <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-yellow-300">
                Admin order mode
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
                placeholder="Search operator, clan, or note"
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
                  {filteredPlayers.map((player, index) => {
                    const cooldown = getKillCooldownState(player, now)
                    const feedback = killFeedbackByPlayer[player.id]

                    return (
                      <SortablePlayerRow
                        key={player.id}
                        player={player}
                        number={index + 1}
                        onLogKill={isAuthenticated ? handleRegisterKill : undefined}
                        onOpenKillLog={setKillLogPlayer}
                        killPending={pendingKillId === player.id}
                        killDisabled={pendingKillId === player.id || cooldown.active}
                        killButtonLabel={cooldown.active ? 'Cooldown' : 'Log Kill'}
                        killMessage={feedback?.message ?? ''}
                        killTone={feedback?.tone ?? 'success'}
                        cooldownActive={cooldown.active}
                        cooldownLabel={cooldown.label}
                        cooldownProgress={cooldown.progressPercent}
                      />
                    )
                  })}
                </SortableContext>
              </DndContext>
            ) : (
              filteredPlayers.map((player, index) => {
                const cooldown = getKillCooldownState(player, now)
                const feedback = killFeedbackByPlayer[player.id]

                return (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    number={index + 1}
                    onLogKill={isAuthenticated ? handleRegisterKill : undefined}
                    onOpenKillLog={setKillLogPlayer}
                    killPending={pendingKillId === player.id}
                    killDisabled={pendingKillId === player.id || cooldown.active}
                    killButtonLabel={cooldown.active ? 'Cooldown' : 'Log Kill'}
                    killMessage={feedback?.message ?? ''}
                    killTone={feedback?.tone ?? 'success'}
                    cooldownActive={cooldown.active}
                    cooldownLabel={cooldown.label}
                    cooldownProgress={cooldown.progressPercent}
                  />
                )
              })
            )
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/25 p-6 text-center">
              <p className="intel-label mb-3">Board Empty</p>
              <h3 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
                Build the board
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400">
                No filler data. Add your first operator record and 21rats updates instantly for the squad.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
              >
                Add first intel
              </button>
            </div>
          )}
        </div>
      </section>

      <AddPlayerModal open={isAddModalOpen} onClose={closeAddModal} />
      <KillLogModal
        key={killLogPlayer?.id ?? 'closed'}
        open={Boolean(killLogPlayer)}
        onClose={() => setKillLogPlayer(null)}
        player={killLogPlayer}
      />
      <DailyOpsModal open={dailyOpsOpen} onClose={() => setDailyOpsOpen(false)} />
    </div>
  )
}

export default Home
