import { BadgeCheck, CalendarCheck, CheckCircle2, ChevronRight, Clock3, Gift, Lock, ShieldCheck, Snowflake, Target, Trophy, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIntel } from '../context/useIntel.js'
import { checkInRiskState, dailyResetLabel, isCheckInClaimedToday, levelProgress, profileMissionStates, profileStreakFreezes, weeklyCircuitCells } from '../utils/gamification.js'
import { formatDaysUntilReward, profileLoginStreak, profileLongestLoginStreak, streakRewardProgress, streakRewards } from '../utils/streaks.js'

const statusMeta = {
  claimed: {
    label: 'Secured Today',
    tone: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
    Icon: CheckCircle2,
  },
  ready: {
    label: 'Claim Ready',
    tone: 'border-indigo-400/45 bg-indigo-500/12 text-indigo-100',
    Icon: CalendarCheck,
  },
  protected: {
    label: 'Freeze Armed',
    tone: 'border-cyan-300/40 bg-cyan-400/10 text-cyan-100',
    Icon: Snowflake,
  },
  recover: {
    label: 'Rebuild Streak',
    tone: 'border-yellow-300/40 bg-yellow-400/10 text-yellow-100',
    Icon: ShieldCheck,
  },
}

function ProgressBar({ value, tone = 'bg-indigo-300/90', label }) {
  return (
    <div className="space-y-2">
      {label ? <div className="flex justify-between gap-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-500">{label}</div> : null}
      <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/45">
        <div className={`h-full rounded-full transition-[width] duration-700 ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  )
}

function StatTile({ icon: Icon, label, value, tone = 'text-white' }) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex items-center gap-2 text-gray-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-[0.58rem] font-black uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className={`text-2xl font-black leading-none ${tone}`}>{value}</p>
    </div>
  )
}

function DailyOpsSummary({ onOpen, className = '' }) {
  const { isAuthenticated, profile, lastXpAward } = useIntel()
  const loginStreak = profileLoginStreak(profile)
  const claimedToday = isCheckInClaimedToday(profile)
  const riskState = checkInRiskState(profile)
  const resolvedStatus = statusMeta[riskState] ?? statusMeta.ready
  const StatusIcon = resolvedStatus.Icon
  const rewardProgress = streakRewardProgress(loginStreak)
  const level = levelProgress(profile)

  if (!isAuthenticated) {
    return (
      <div className={`rounded-[1.15rem] border border-white/10 bg-black/30 p-3 ${className}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="intel-label mb-1">Daily Ops</p>
            <p className="truncate text-sm font-black uppercase tracking-[0.08em] text-white">Check-in locked</p>
          </div>
          <Link
            to="/auth"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-indigo-500/45 bg-indigo-500/12 px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-indigo-100 hover:bg-indigo-500/20"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-[1.15rem] border border-white/10 bg-black/30 p-3 ${className}`}>
      <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <button
          type="button"
          onClick={onOpen}
          className="group flex min-w-0 items-center gap-3 text-left"
          aria-label="Open Daily Ops"
        >
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${claimedToday ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-100' : 'border-indigo-400/45 bg-indigo-500/12 text-indigo-100'}`}>
            <StatusIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="intel-label mb-1 block">Daily Ops</span>
            <span className="block truncate text-sm font-black uppercase tracking-[0.08em] text-white">
              {loginStreak}D streak · LV {level.level}
            </span>
          </span>
        </button>

        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[0.58rem] font-black uppercase tracking-[0.14em] text-gray-500">
            <span className="truncate">{rewardProgress.nextReward ? rewardProgress.nextReward.shortLabel : 'Maxed'}</span>
            <span>{Math.round(rewardProgress.progressPercent)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-indigo-300/90" style={{ width: `${rewardProgress.progressPercent}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastXpAward?.xp_earned ? (
            <span className="hidden rounded-full border border-yellow-300/35 bg-yellow-400/10 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-yellow-100 sm:inline-flex">
              +{lastXpAward.xp_earned} XP
            </span>
          ) : null}
          <button
            type="button"
            onClick={onOpen}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] transition ${claimedToday ? 'border-white/10 bg-white/5 text-gray-300 hover:border-indigo-400/35 hover:text-indigo-100' : 'daily-ops-claim-ready border-indigo-500/50 bg-indigo-500/12 text-indigo-100 hover:bg-indigo-500/20'}`}
          >
            <span>{claimedToday ? 'View' : 'Claim'}</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

function DailyOpsModal({ open, onClose }) {
  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/72 px-3 pb-[calc(0.8rem+env(safe-area-inset-bottom))] pt-6 backdrop-blur-md sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="daily-ops-modal-title">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close Daily Ops" />
      <div className="panel relative max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-[1.35rem] p-4 shadow-2xl shadow-black/60 sm:rounded-[1.8rem] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <p className="intel-label mb-1">Daily Ops</p>
            <h2 id="daily-ops-modal-title" className="text-xl font-black uppercase tracking-[0.04em] text-white sm:text-2xl">
              Check-In Command
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:border-indigo-400/40 hover:text-indigo-100"
            aria-label="Close Daily Ops"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <DailyCheckInPanel embedded />
      </div>
    </div>
  )
}

function DailyCheckInPanel({ compact = false, embedded = false, className = '' }) {
  const { isAuthenticated, profile, myClan, claimDailyCheckIn, dailyCheckInResult, lastXpAward } = useIntel()
  const [claiming, setClaiming] = useState(false)
  const [localResult, setLocalResult] = useState(null)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => new Date())

  const claimedToday = isCheckInClaimedToday(profile)
  const riskState = checkInRiskState(profile)
  const resolvedStatus = statusMeta[riskState] ?? statusMeta.ready
  const StatusIcon = resolvedStatus.Icon
  const loginStreak = profileLoginStreak(profile)
  const longestStreak = profileLongestLoginStreak(profile)
  const freezes = profileStreakFreezes(profile)
  const rewardProgress = streakRewardProgress(loginStreak)
  const level = levelProgress(profile)
  const weeklyCells = weeklyCircuitCells(loginStreak, claimedToday)
  const missions = useMemo(() => profileMissionStates(profile, myClan), [myClan, profile])
  const result = localResult ?? dailyCheckInResult
  const xpFlash = result?.xp_earned || lastXpAward?.xp_earned || 0
  const resetLabel = dailyResetLabel(now)

  useEffect(() => {
    if (!claimedToday) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 60000)

    return () => window.clearInterval(intervalId)
  }, [claimedToday])

  async function handleClaim() {
    if (!isAuthenticated || claiming || claimedToday) {
      return
    }

    setClaiming(true)
    setError('')
    setNow(new Date())

    try {
      const nextResult = await claimDailyCheckIn()
      setLocalResult(nextResult)
    } catch (claimError) {
      setError(claimError.message)
    } finally {
      setClaiming(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <section className={`panel rounded-[1.6rem] p-4 sm:p-5 ${className}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="intel-label mb-2">Daily Ops</p>
            <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">Check-In Locked</h2>
          </div>
          <Link
            to="/auth"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-indigo-500/50 bg-indigo-500/12 px-5 text-sm font-black uppercase tracking-[0.16em] text-indigo-100 transition hover:bg-indigo-500/20"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Login
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={`${embedded ? '' : 'panel rounded-[1.6rem] p-4 sm:p-5'} ${className}`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className={`rounded-[1.35rem] border border-indigo-400/25 bg-indigo-500/10 p-4 shadow-[0_0_34px_rgba(99, 102, 241,0.1)] ${claiming ? 'daily-ops-scanning' : ''} ${result?.claimed ? 'daily-ops-celebrate' : ''}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="intel-label mb-2">Daily Ops</p>
              <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white sm:text-3xl">{loginStreak} Day Streak</h2>
            </div>
            <span className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] ${resolvedStatus.tone}`}>
              <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {resolvedStatus.label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatTile icon={Trophy} label="Best" value={`${longestStreak}D`} tone="text-yellow-100" />
            <StatTile icon={Zap} label="Level" value={level.level} tone="text-cyan-100" />
            <StatTile icon={Snowflake} label="Freeze" value={freezes} tone={freezes ? 'text-cyan-100' : 'text-gray-500'} />
          </div>

          <div className="mt-4 rounded-[1.15rem] border border-white/10 bg-black/25 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-500">Weekly Circuit</p>
              <span className="inline-flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-500">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                {claimedToday ? resetLabel : 'Open'}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {weeklyCells.map((cell) => (
                <span
                  key={cell.day}
                  className={`flex aspect-square items-center justify-center rounded-lg border text-[0.62rem] font-black transition ${cell.complete ? 'border-indigo-300/55 bg-indigo-500/18 text-indigo-50' : cell.today ? 'border-yellow-300/55 bg-yellow-400/10 text-yellow-100' : 'border-white/10 bg-black/30 text-gray-600'}`}
                >
                  {cell.complete ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : cell.day}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming || claimedToday}
              className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border px-5 text-sm font-black uppercase tracking-[0.16em] transition active:scale-[0.98] disabled:scale-100 ${claimedToday ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100' : claiming ? 'border-indigo-400/55 bg-indigo-500/16 text-indigo-50 hover:bg-indigo-500/24' : 'daily-ops-claim-ready border-indigo-400/55 bg-indigo-500/16 text-indigo-50 hover:bg-indigo-500/24'} disabled:opacity-70`}
            >
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              <span>{claiming ? 'Securing' : claimedToday ? 'Claimed' : 'Claim Daily'}</span>
            </button>
            {xpFlash ? (
              <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-yellow-300/45 bg-yellow-400/10 px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-yellow-100">
                <Gift className="h-4 w-4" aria-hidden="true" />
                +{xpFlash} XP
              </span>
            ) : null}
          </div>
          {result?.compensation_message ? (
            <div className="mt-3 rounded-[1rem] border border-yellow-300/40 bg-yellow-400/10 p-3 text-sm font-bold text-yellow-100">
              {result.compensation_message}
            </div>
          ) : null}
          {result?.used_streak_freeze ? <p className="mt-3 text-sm font-bold text-cyan-100">Freeze consumed. Streak protected.</p> : null}
          {result?.freeze_awarded ? <p className="mt-3 text-sm font-bold text-cyan-100">Freeze earned. Backup charge armed.</p> : null}
          {error ? <p className="mt-3 text-sm font-bold text-red-200">{error}</p> : null}
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-500">Next Unlock</p>
                <p className="mt-1 text-lg font-black uppercase tracking-[0.04em] text-white">
                  {rewardProgress.nextReward ? rewardProgress.nextReward.unlockLabel : 'Reward Track Maxed'}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-300">
                {rewardProgress.label}
              </span>
            </div>
            <ProgressBar value={rewardProgress.progressPercent} tone="bg-indigo-300/90" />
          </div>

          <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-500">Level Progress</p>
              <span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan-100">{level.xpTotal} XP</span>
            </div>
            <ProgressBar value={level.progressPercent} tone="bg-cyan-300/90" />
            <p className="mt-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-500">
              {level.neededForNext} XP to level {level.level + 1}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {missions.map((mission) => (
              <Link
                key={mission.key}
                to={mission.to}
                className={`group rounded-[1.15rem] border p-3 transition ${mission.complete ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-white/10 bg-black/25 text-gray-300 hover:border-indigo-400/35 hover:text-indigo-100'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.62rem] font-black uppercase tracking-[0.16em]">{mission.label}</span>
                  {mission.complete ? <BadgeCheck className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />}
                </div>
                <p className="mt-2 text-lg font-black uppercase tracking-[0.04em]">{mission.status}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {!compact ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {streakRewards.map((reward) => {
            const unlocked = loginStreak >= reward.days
            const active = rewardProgress.nextReward?.key === reward.key

            return (
              <div
                key={reward.key}
                className={`rounded-[1.1rem] border p-3 ${unlocked ? reward.tone : active ? 'border-indigo-400/45 bg-indigo-500/10 text-indigo-100' : 'border-white/10 bg-black/20 text-gray-600'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-lg font-black ${unlocked || active ? 'text-white' : 'text-gray-500'}`}>{reward.days}D</p>
                  {unlocked ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : active ? <Target className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
                </div>
                <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.14em] text-white/90">{reward.shortLabel}</p>
                <p className="mt-2 text-[0.55rem] font-black uppercase tracking-[0.14em] text-gray-500">
                  {formatDaysUntilReward(loginStreak, reward)}
                </p>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 opacity-0" aria-hidden="true" />
    </section>
  )
}

export default DailyCheckInPanel
export { DailyOpsModal, DailyOpsSummary }