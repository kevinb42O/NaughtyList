import { Clock3, Crosshair, Loader2, Shield, Skull, Users, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useIntel } from '../context/useIntel.js'

function formatKillDate(value) {
  if (!value) return 'Unknown time'

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function KillLogModal({ open, onClose, player }) {
  const { fetchPlayerKillLog } = useIntel()
  const titleId = useId()
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const clanKillTotals = useMemo(() => {
    const totalsByClan = entries.reduce((totals, entry) => {
      const clanTag = entry.clanTag || entry.profileClanTag

      if (!clanTag) {
        return totals
      }

      totals.set(clanTag, (totals.get(clanTag) ?? 0) + 1)
      return totals
    }, new Map())

    return [...totalsByClan.entries()]
      .map(([clanTag, killCount]) => ({ clanTag, killCount }))
      .sort((first, second) => second.killCount - first.killCount || first.clanTag.localeCompare(second.clanTag))
  }, [entries])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open || !player?.id) return undefined

    let active = true

    fetchPlayerKillLog(player.id)
      .then((nextEntries) => {
        if (active) setEntries(nextEntries)
      })
      .catch((logError) => {
        if (active) setError(logError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fetchPlayerKillLog, open, player?.id])

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => dialogRef.current?.focus(), 0)

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.()
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (!open || !player) return null

  const latestEntry = entries[0]
  const latestLogger = latestEntry?.displayName || player.lastKillDisplayName || 'Operator'

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/80 px-3 py-4 backdrop-blur-md sm:px-5 sm:py-8">
      <button
        type="button"
        className="fixed inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label="Close kill log"
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-3xl items-center">
        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="panel relative my-auto max-h-[calc(100vh-2rem)] w-full overflow-hidden rounded-[1.5rem] border-indigo-500/20 shadow-2xl shadow-black sm:max-h-[calc(100vh-4rem)] sm:rounded-[2rem]"
        >
          <div className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/95 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="intel-label mb-2 text-indigo-100">Kill Log</p>
                <h2 id={titleId} className="truncate text-2xl font-black uppercase tracking-[0.04em] text-white sm:text-3xl">
                  {player.clan ? <span className="text-gray-400">[{player.clan}] </span> : null}
                  {player.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition hover:border-indigo-500/40 hover:text-indigo-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-4 sm:max-h-[calc(100vh-12rem)] sm:p-6">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="mb-2 flex items-center gap-2 text-gray-500">
                  <Skull className="h-4 w-4" aria-hidden="true" />
                  <span className="text-[0.62rem] font-black uppercase tracking-[0.18em]">Target</span>
                </div>
                <p className="text-2xl font-black text-white">{player.killCount ?? entries.length}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Total kills</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="mb-2 flex items-center gap-2 text-gray-500">
                  <Crosshair className="h-4 w-4" aria-hidden="true" />
                  <span className="text-[0.62rem] font-black uppercase tracking-[0.18em]">Latest</span>
                </div>
                <p className="truncate text-base font-black uppercase text-white">{latestLogger}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Last logger</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="mb-2 flex items-center gap-2 text-gray-500">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span className="text-[0.62rem] font-black uppercase tracking-[0.18em]">Entries</span>
                </div>
                <p className="text-2xl font-black text-white">{entries.length}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Log rows</p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-400">
                  <Clock3 className="h-4 w-4 text-indigo-100" aria-hidden="true" />
                  Latest first
                </div>
                <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-500">
                  {entries.length} entries
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-3 px-4 py-10 text-sm font-black uppercase tracking-[0.18em] text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-100" aria-hidden="true" />
                  Loading log
                </div>
              ) : error ? (
                <div className="px-4 py-8 text-sm font-bold leading-6 text-red-200">{error}</div>
              ) : entries.length ? (
                <ol className="divide-y divide-white/10">
                  {entries.map((entry, index) => {
                    const clanTag = entry.clanTag || entry.profileClanTag

                    return (
                      <li key={entry.killId} className="grid gap-3 px-4 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-xs font-black text-gray-400">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black uppercase tracking-[0.08em] text-white">
                            {clanTag ? <span className="text-gray-400">[{clanTag}] </span> : null}
                            {entry.displayName || 'Operator'}
                          </p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                            {formatKillDate(entry.loggedAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <span className="rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-indigo-100">
                            {entry.userKillTotal} total
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <div className="grid place-items-center px-4 py-10 text-center">
                  <Shield className="mb-3 h-8 w-8 text-gray-600" aria-hidden="true" />
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-gray-400">No kills logged yet</p>
                </div>
              )}
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-400">
                  <Users className="h-4 w-4 text-indigo-100" aria-hidden="true" />
                  Clan scoreboard
                </div>
                <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-500">
                  {clanKillTotals.length} clans
                </span>
              </div>

              {loading ? (
                <div className="px-4 py-6 text-sm font-bold text-gray-500">Loading clan totals...</div>
              ) : clanKillTotals.length ? (
                <ol className="divide-y divide-white/10">
                  {clanKillTotals.map((clanTotal, index) => (
                    <li key={clanTotal.clanTag} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-xs font-black text-gray-400">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm font-black uppercase tracking-[0.12em] text-white">
                        {clanTotal.clanTag}
                      </span>
                      <span className="rounded-md border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-indigo-100">
                        {clanTotal.killCount} kills
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="px-4 py-6 text-sm font-bold text-gray-500">No clan kills on this target yet.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default KillLogModal