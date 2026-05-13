export const streakRewards = [
  {
    days: 3,
    key: 'recon',
    label: 'Recon Badge',
    shortLabel: 'Recon',
    unlocks: ['radar', 'radio'],
    unlockLabel: 'Radar + Comms avatars',
    tone: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100 shadow-emerald-500/10',
    iconTone: 'text-emerald-100',
  },
  {
    days: 7,
    key: 'hunter',
    label: 'Hunter Badge',
    shortLabel: 'Hunter',
    unlocks: ['target', 'swords'],
    unlockLabel: 'Target + Swords avatars',
    tone: 'border-red-400/50 bg-red-500/12 text-red-100 shadow-red-500/15',
    iconTone: 'text-red-100',
  },
  {
    days: 14,
    key: 'breacher',
    label: 'Breacher Badge',
    shortLabel: 'Breach',
    unlocks: ['flame', 'bomb', 'siren'],
    unlockLabel: 'Flame + Breach + Alert avatars',
    tone: 'border-orange-300/45 bg-orange-400/10 text-orange-100 shadow-orange-500/15',
    iconTone: 'text-orange-100',
  },
  {
    days: 21,
    key: 'shadow',
    label: 'Shadow Badge',
    shortLabel: 'Shadow',
    unlocks: ['ghost', 'eye'],
    unlockLabel: 'Ghost + Watcher avatars',
    tone: 'border-violet-300/45 bg-violet-400/10 text-violet-100 shadow-violet-500/15',
    iconTone: 'text-violet-100',
  },
  {
    days: 30,
    key: 'veteran',
    label: 'Veteran Badge',
    shortLabel: 'Legend',
    unlocks: ['fingerprint', 'scan-face', 'binoculars'],
    unlockLabel: 'Identity + Scanner + Recon avatars',
    tone: 'border-yellow-300/50 bg-yellow-400/12 text-yellow-100 shadow-yellow-500/20',
    iconTone: 'text-yellow-100',
  },
  {
    days: 60,
    key: 'elite',
    label: 'Elite Badge',
    shortLabel: 'Mythic',
    unlocks: ['zap', 'bug'],
    unlockLabel: 'Shock + Rat Hunter avatars',
    tone: 'border-orange-300/50 bg-orange-400/12 text-orange-100 shadow-orange-500/20',
    iconTone: 'text-orange-100',
  },
  {
    days: 100,
    key: 'marked',
    label: 'Marked Legend',
    shortLabel: 'Immortal',
    unlocks: ['badge-alert', 'lock'],
    unlockLabel: 'Marked + Locked avatars',
    tone: 'border-fuchsia-300/50 bg-fuchsia-400/12 text-fuchsia-100 shadow-fuchsia-500/20',
    iconTone: 'text-fuchsia-100',
  },
]

export function avatarStreakRequirement(iconKey) {
  return streakRewards.find((reward) => reward.unlocks.includes(iconKey))?.days ?? 0
}

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

export function daysUntilStreakReward(streakCount, reward) {
  if (!reward) return 0
  return Math.max(0, reward.days - streakCount)
}

export function formatDaysUntilReward(streakCount, reward) {
  const remainingDays = daysUntilStreakReward(streakCount, reward)

  if (!remainingDays) {
    return 'Unlocked'
  }

  return `${remainingDays} more daily check-in${remainingDays === 1 ? '' : 's'}`
}
