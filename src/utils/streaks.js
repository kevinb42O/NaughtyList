export const streakRewards = [
  {
    days: 1,
    key: 'spark',
    label: 'Spark',
    shortLabel: 'Spark',
    tone: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100 shadow-emerald-500/10',
    iconTone: 'text-emerald-100',
  },
  {
    days: 3,
    key: 'signal',
    label: 'Signal Locked',
    shortLabel: 'Signal',
    tone: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100 shadow-cyan-500/10',
    iconTone: 'text-cyan-100',
  },
  {
    days: 7,
    key: 'redline',
    label: 'Redline Week',
    shortLabel: 'Redline',
    tone: 'border-red-400/50 bg-red-500/12 text-red-100 shadow-red-500/15',
    iconTone: 'text-red-100',
  },
  {
    days: 14,
    key: 'blackout',
    label: 'Blackout Run',
    shortLabel: 'Blackout',
    tone: 'border-violet-300/45 bg-violet-400/10 text-violet-100 shadow-violet-500/15',
    iconTone: 'text-violet-100',
  },
  {
    days: 21,
    key: 'wraith',
    label: 'Wraith Protocol',
    shortLabel: 'Wraith',
    tone: 'border-sky-300/45 bg-sky-400/10 text-sky-100 shadow-sky-500/15',
    iconTone: 'text-sky-100',
  },
  {
    days: 30,
    key: 'legend',
    label: '30-Day Legend',
    shortLabel: 'Legend',
    tone: 'border-yellow-300/50 bg-yellow-400/12 text-yellow-100 shadow-yellow-500/20',
    iconTone: 'text-yellow-100',
  },
  {
    days: 60,
    key: 'mythic',
    label: 'Mythic Operator',
    shortLabel: 'Mythic',
    tone: 'border-orange-300/50 bg-orange-400/12 text-orange-100 shadow-orange-500/20',
    iconTone: 'text-orange-100',
  },
  {
    days: 100,
    key: 'immortal',
    label: 'Immortal Signal',
    shortLabel: 'Immortal',
    tone: 'border-fuchsia-300/50 bg-fuchsia-400/12 text-fuchsia-100 shadow-fuchsia-500/20',
    iconTone: 'text-fuchsia-100',
  },
]

export function profileLoginStreak(profile) {
  return Number(profile?.login_streak_count ?? 0)
}

export function profileLongestLoginStreak(profile) {
  return Number(profile?.longest_login_streak_count ?? 0)
}

export function unlockedStreakRewards(streakCount) {
  return streakRewards.filter((reward) => streakCount >= reward.days)
}

export function currentStreakReward(streakCount) {
  const unlocked = unlockedStreakRewards(streakCount)
  return unlocked[unlocked.length - 1] ?? null
}

export function nextStreakReward(streakCount) {
  return streakRewards.find((reward) => streakCount < reward.days) ?? null
}
