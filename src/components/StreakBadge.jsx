import { Flame, Lock, ShieldCheck, Sparkles, Trophy, Zap } from 'lucide-react'
import { currentStreakReward, profileLoginStreak } from '../utils/streaks.js'

const rewardIcons = {
  spark: Sparkles,
  signal: ShieldCheck,
  redline: Flame,
  blackout: Zap,
  wraith: ShieldCheck,
  legend: Trophy,
  mythic: Flame,
  immortal: Trophy,
}

function StreakBadge({ compact = false, profile, reward, streakCount }) {
  const resolvedStreak = typeof streakCount === 'number' ? streakCount : profileLoginStreak(profile)
  const resolvedReward = reward ?? currentStreakReward(resolvedStreak)

  if (!resolvedReward) {
    if (compact) return null

    return (
      <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-500">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        No Streak
      </span>
    )
  }

  const Icon = rewardIcons[resolvedReward.key] ?? Flame

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] shadow-lg ${resolvedReward.tone}`}
      title={`${resolvedReward.label}: ${resolvedStreak} day login streak`}
    >
      <Icon className={`h-3.5 w-3.5 ${resolvedReward.iconTone}`} aria-hidden="true" />
      {compact ? resolvedReward.shortLabel : `${resolvedStreak}D ${resolvedReward.shortLabel}`}
    </span>
  )
}

export default StreakBadge
