import {
  CalendarDays,
  ChevronDown,
  Filter,
  GitCommitVertical,
  History,
  Image,
  ListChecks,
  MessageSquare,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wrench,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { updateLogDays, updateLogStats } from '../data/updateLog.js'

const categoryOptions = [
  { key: 'all', label: 'All', icon: ListChecks },
  { key: 'profile', label: 'Profiles', icon: Image },
  { key: 'chat', label: 'Comms', icon: MessageSquare },
  { key: 'clan', label: 'Clans', icon: UsersRound },
  { key: 'daily', label: 'Daily Ops', icon: Zap },
  { key: 'moderation', label: 'Control', icon: ShieldCheck },
  { key: 'system', label: 'System', icon: Wrench },
]

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`))
}

function updateText(update) {
  return `${update[0]} ${update[1]} ${update[2]}`.toLowerCase()
}

function getUpdateCategory(update) {
  const text = updateText(update)

  if (text.match(/profile|avatar|banner|photo|gif|team card|team|identity|activision/)) return 'profile'
  if (text.match(/chat|message|dm|reply|typing|receipt|mention|media|bubble|scroll/)) return 'chat'
  if (text.match(/clan|hq|roster|member|invite|directory/)) return 'clan'
  if (text.match(/daily|check-in|check in|xp|streak|level|reward/)) return 'daily'
  if (text.match(/admin|moderator|moderation|control|push|donation|support|badge grant/)) return 'moderation'
  return 'system'
}

function categoryMeta(categoryKey) {
  return categoryOptions.find((category) => category.key === categoryKey) ?? categoryOptions[0]
}

function StatTile({ icon: Icon, label, value, tone = 'text-gray-100' }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-black/25 p-4">
      <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
      <p className="mt-3 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-black uppercase tracking-[0.04em] text-white">{value}</p>
    </div>
  )
}

function UpdateItem({ update }) {
  const [hash, title, detail, isHighlight = false] = update
  const isPending = hash === 'current'
  const category = categoryMeta(getUpdateCategory(update))
  const CategoryIcon = category.icon

  return (
    <li className="relative pl-7">
      <span className="absolute left-0 top-3 flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-[0_0_18px_rgba(99, 102, 241,0.22)]">
        <GitCommitVertical className="h-2.5 w-2.5 text-gray-100" aria-hidden="true" />
      </span>
      <article className="rounded-[1.1rem] border border-white/10 bg-black/28 p-3 transition hover:border-white/10 hover:bg-white/[0.035]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[0.55rem] font-black uppercase tracking-[0.14em] text-gray-400">
                <CategoryIcon className="h-3 w-3" aria-hidden="true" />
                {category.label}
              </span>
              {isHighlight ? (
                <span className="rounded-full border border-amber-300/35 bg-amber-400/12 px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.16em] text-amber-100">
                  Key Update
                </span>
              ) : null}
              <span className={`rounded-full border px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.16em] ${isPending ? 'border-yellow-400/25 bg-yellow-400/10 text-yellow-100' : 'border-white/10 bg-white/[0.04] text-gray-500'}`}>
                {hash}
              </span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.06em] text-gray-100">{title}</h3>
          </div>
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-400">{detail}</p>
      </article>
    </li>
  )
}

function UpdateDay({ day, defaultOpen, updates }) {
  return (
    <details className="group panel rounded-[1.6rem] p-0" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none flex-col gap-4 p-5 marker:hidden sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="intel-label">{day.label}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-gray-500">
              {formatDate(day.date)}
            </span>
            {day.label === 'Today' ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-gray-100">
                Latest
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-2xl font-black uppercase leading-tight tracking-[0.04em] text-white">{day.title}</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-gray-400">{day.summary}</p>
        </div>
        <span className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-100 transition group-open:border-white/10 group-open:bg-white/[0.04] group-open:text-gray-400">
          {updates.length} shown
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="border-t border-white/10 px-5 pb-5 pt-4">
        <ol className="grid gap-3 border-l border-white/10 pl-1">
          {updates.map((update) => <UpdateItem key={`${day.date}-${update[0]}-${update[1]}`} update={update} />)}
        </ol>
      </div>
    </details>
  )
}

function Updates() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const latestDay = updateLogDays[updateLogDays.length - 1]
  const latestUpdates = latestDay.updates.slice(-4).reverse()

  const normalizedQuery = query.trim().toLowerCase()
  const filteredDays = updateLogDays
    .map((day) => {
      const updates = day.updates.filter((update) => {
        const matchesCategory = category === 'all' || getUpdateCategory(update) === category
        const matchesQuery = !normalizedQuery || updateText(update).includes(normalizedQuery) || day.title.toLowerCase().includes(normalizedQuery)
        return matchesCategory && matchesQuery
      })

      return { ...day, updates }
    })
    .filter((day) => day.updates.length)

  const shownUpdateCount = filteredDays.reduce((total, day) => total + day.updates.length, 0)
  const highlightedUpdates = updateLogDays
    .flatMap((day) => day.updates.map((update) => ({ day, update })))
    .filter(({ update }) => Boolean(update[3]))
    .slice(-8)
    .reverse()

  return (
    <div>
      <PageHeader eyebrow="Build History" title="Update Log">
        Track what changed, what shipped, and which part of the squad system got upgraded.
      </PageHeader>

      <section className="panel mb-5 overflow-hidden rounded-[1.8rem]">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-100">
                <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
                Latest Drop
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-400">
                {formatDate(latestDay.date)}
              </span>
            </div>
            <h2 className="max-w-4xl text-3xl font-black uppercase leading-tight tracking-[0.04em] text-white sm:text-4xl">
              {latestDay.title}
            </h2>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-gray-400">{latestDay.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/profile" className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-100 transition hover:bg-white/5">
                Open Profile
              </Link>
              <Link to="/profiles" className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-300 transition hover:border-white/10 hover:text-gray-100">
                View Team
              </Link>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/24 p-5 xl:border-l xl:border-t-0">
            <p className="intel-label mb-3">Recently Shipped</p>
            <div className="grid gap-3">
              {latestUpdates.map((update) => (
                <div key={`${update[0]}-${update[1]}`} className="rounded-[1.1rem] border border-white/10 bg-black/30 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-gray-500">{getUpdateCategory(update)}</span>
                    <span className="font-mono text-[0.62rem] font-black uppercase tracking-[0.12em] text-gray-100">{update[0]}</span>
                  </div>
                  <p className="text-sm font-black uppercase tracking-[0.04em] text-white">{update[1]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={CalendarDays} label="Tracked Since" value={formatDate(updateLogStats.firstDate)} />
        <StatTile icon={History} label="Build Days" value={updateLogStats.dayCount} tone="text-cyan-100" />
        <StatTile icon={ListChecks} label="Logged Updates" value={updateLogStats.updateCount} tone="text-emerald-100" />
        <StatTile icon={Sparkles} label="Shown Now" value={shownUpdateCount} tone="text-yellow-100" />
      </section>

      <section className="panel mb-5 rounded-[1.6rem] p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-amber-300/35 bg-amber-400/12 px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-amber-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Most Important Updates
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {highlightedUpdates.map(({ day, update }) => (
            <article key={`${day.date}-${update[0]}-highlight`} className="rounded-[1.1rem] border border-amber-300/20 bg-amber-400/[0.06] p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-amber-100">{day.title}</span>
                <span className="font-mono text-[0.62rem] font-black uppercase tracking-[0.12em] text-amber-200">{update[0]}</span>
              </div>
              <p className="text-sm font-black uppercase tracking-[0.04em] text-white">{update[1]}</p>
              <p className="mt-1 text-sm leading-6 text-gray-300">{update[2]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel mb-5 rounded-[1.6rem] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-200" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field min-h-14 pl-12"
              placeholder="Search updates, commits, features, or fixes"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
            {categoryOptions.map((option) => {
              const Icon = option.icon
              const selected = category === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setCategory(option.key)}
                  className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-[0.62rem] font-black uppercase tracking-[0.16em] transition ${
                    selected
                      ? 'border-white/10 bg-white/5 text-gray-100 shadow-[0_0_22px_rgba(99, 102, 241,0.14)]'
                      : 'border-white/10 bg-white/[0.04] text-gray-400 hover:border-white/10 hover:text-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-500">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          {shownUpdateCount} matching update{shownUpdateCount === 1 ? '' : 's'}
        </div>
      </section>

      <section className="grid gap-5">
        {filteredDays.map((day, index) => (
          <UpdateDay key={day.date} day={day} updates={day.updates} defaultOpen={index === filteredDays.length - 1 || Boolean(query.trim()) || category !== 'all'} />
        ))}
      </section>

      {!filteredDays.length ? (
        <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
          No updates match that scan.
        </div>
      ) : null}

      <div className="mt-6 flex justify-center">
        <Link
          to="/help"
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-400 transition hover:border-white/10 hover:text-gray-100"
        >
          Back to help
        </Link>
      </div>
    </div>
  )
}

export default Updates
