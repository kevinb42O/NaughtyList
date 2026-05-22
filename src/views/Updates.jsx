import { CalendarDays, GitCommitVertical, History, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { updateLogDays, updateLogStats } from '../data/updateLog.js'

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`))
}

function UpdateItem({ update }) {
  const [hash, title, detail] = update
  const isPending = hash === 'current'

  return (
    <li className="relative pl-8">
      <span className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-red-100">
        <GitCommitVertical className="h-3 w-3" aria-hidden="true" />
      </span>
      <div className="rounded-[1.1rem] border border-white/10 bg-black/24 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 text-sm font-black uppercase tracking-[0.06em] text-gray-100">{title}</h3>
          <span className={`rounded-full border px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.16em] ${isPending ? 'border-yellow-400/25 bg-yellow-400/10 text-yellow-100' : 'border-white/10 bg-white/[0.04] text-gray-500'}`}>
            {hash}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-400">{detail}</p>
      </div>
    </li>
  )
}

function UpdateDay({ day, defaultOpen }) {
  return (
    <details className="group panel rounded-[1.8rem] p-0" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none flex-col gap-4 p-5 marker:hidden sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="intel-label">{day.label}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-gray-500">
              {formatDate(day.date)}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-black uppercase leading-tight tracking-[0.04em] text-white">{day.title}</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-gray-400">{day.summary}</p>
        </div>
        <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-red-400/25 bg-red-500/10 px-4 text-[0.62rem] font-black uppercase tracking-[0.16em] text-red-100 transition group-open:border-white/10 group-open:bg-white/[0.04] group-open:text-gray-400">
          {day.updates.length} updates
        </span>
      </summary>
      <div className="border-t border-white/10 px-5 pb-5 pt-4">
        <ol className="grid gap-3">
          {day.updates.map((update) => <UpdateItem key={`${day.date}-${update[0]}-${update[1]}`} update={update} />)}
        </ol>
      </div>
    </details>
  )
}

function Updates() {
  return (
    <div>
      <PageHeader eyebrow="Build History" title="Update Log">
        A quiet record of the app from day one until now, compiled from the GitHub commit history.
      </PageHeader>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
          <CalendarDays className="h-5 w-5 text-red-100" aria-hidden="true" />
          <p className="mt-3 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">Tracked Since</p>
          <p className="mt-1 text-lg font-black uppercase tracking-[0.04em] text-white">{formatDate(updateLogStats.firstDate)}</p>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
          <History className="h-5 w-5 text-red-100" aria-hidden="true" />
          <p className="mt-3 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">Build Days</p>
          <p className="mt-1 text-lg font-black uppercase tracking-[0.04em] text-white">{updateLogStats.dayCount}</p>
        </div>
        <div className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
          <ListChecks className="h-5 w-5 text-red-100" aria-hidden="true" />
          <p className="mt-3 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">Logged Updates</p>
          <p className="mt-1 text-lg font-black uppercase tracking-[0.04em] text-white">{updateLogStats.updateCount}</p>
        </div>
      </section>

      <div className="mb-5 rounded-[1.4rem] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-gray-400">
        This page is intentionally out of the main navigation. It is here for people who want the full build trail without adding noise to the daily comms, clans, and watchlist screens.
      </div>

      <section className="grid gap-5">
        {updateLogDays.map((day, index) => (
          <UpdateDay key={day.date} day={day} defaultOpen={index === updateLogDays.length - 1} />
        ))}
      </section>

      <div className="mt-6 flex justify-center">
        <Link
          to="/help"
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-400 transition hover:border-red-400/40 hover:text-red-100"
        >
          Back to help
        </Link>
      </div>
    </div>
  )
}

export default Updates
