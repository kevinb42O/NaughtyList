export const levelXpBase = 250

export function profileXpTotal(profile) {
  return Number(profile?.xp_total ?? 0)
}

export function profileLevel(profile) {
  const resolvedLevel = Math.max(1, Number(profile?.level ?? levelForXp(profileXpTotal(profile))))

  if (hasCompletedProgressionProfile(profile)) {
    return resolvedLevel
  }

  return Math.min(2, resolvedLevel)
}

export function hasCompletedProgressionProfile(profile) {
  const hasBio = Boolean(profile?.bio?.trim())
  const accountCount = Array.isArray(profile?.game_accounts)
    ? profile.game_accounts.length
    : Array.isArray(profile?.activision_ids)
      ? profile.activision_ids.length
      : 0

  return hasBio && accountCount > 0
}

export function profileStreakFreezes(profile) {
  return Number(profile?.streak_freezes ?? 0)
}

export function levelForXp(xpTotal) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, Number(xpTotal ?? 0)) / levelXpBase)) + 1)
}

export function xpForLevelStart(level) {
  const normalizedLevel = Math.max(1, Number(level ?? 1))
  return (normalizedLevel - 1) * (normalizedLevel - 1) * levelXpBase
}

export function xpForNextLevel(level) {
  const normalizedLevel = Math.max(1, Number(level ?? 1))
  return normalizedLevel * normalizedLevel * levelXpBase
}

export function levelProgress(profile) {
  const xpTotal = profileXpTotal(profile)
  const level = profileLevel(profile)
  const currentFloor = xpForLevelStart(level)
  const nextFloor = xpForNextLevel(level)
  const span = Math.max(1, nextFloor - currentFloor)
  const earnedInLevel = Math.max(0, xpTotal - currentFloor)

  return {
    level,
    xpTotal,
    currentFloor,
    nextFloor,
    earnedInLevel,
    neededForNext: Math.max(0, nextFloor - xpTotal),
    progressPercent: Math.min(100, (earnedInLevel / span) * 100),
  }
}

export function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function isCheckInClaimedToday(profile, today = utcDateString()) {
  return profile?.last_streak_login_date === today
}

export function dailyResetLabel(now = new Date()) {
  const nextReset = new Date(now)
  nextReset.setUTCHours(24, 0, 0, 0)

  const remainingMs = Math.max(0, nextReset.getTime() - now.getTime())
  const hours = Math.floor(remainingMs / 3600000)
  const minutes = Math.floor((remainingMs % 3600000) / 60000)

  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

export function checkInRiskState(profile, today = utcDateString()) {
  if (!profile?.last_streak_login_date) {
    return 'ready'
  }

  if (profile.last_streak_login_date === today) {
    return 'claimed'
  }

  const lastClaimDate = new Date(`${profile.last_streak_login_date}T00:00:00.000Z`)
  const todayDate = new Date(`${today}T00:00:00.000Z`)
  const dayGap = Math.round((todayDate.getTime() - lastClaimDate.getTime()) / 86400000)

  if (dayGap === 1) {
    return 'ready'
  }

  if (dayGap === 2 && profileStreakFreezes(profile) > 0) {
    return 'protected'
  }

  return 'recover'
}

export function weeklyCircuitCells(streakCount, claimedToday) {
  const normalizedStreak = Math.max(0, Number(streakCount ?? 0))
  const completed = normalizedStreak === 0 ? 0 : ((normalizedStreak - 1) % 7) + 1

  return Array.from({ length: 7 }, (_, index) => {
    const day = index + 1
    return {
      day,
      complete: completed >= day,
      today: claimedToday ? completed === day : completed + 1 === day,
    }
  })
}

export function profileMissionStates(profile, myClan) {
  const bioComplete = Boolean(profile?.bio?.trim())
  const accountsComplete = Array.isArray(profile?.game_accounts)
    ? profile.game_accounts.length > 0
    : Array.isArray(profile?.activision_ids) && profile.activision_ids.length > 0

  return [
    {
      key: 'bio',
      label: 'Bio',
      xp: 120,
      complete: bioComplete,
      status: bioComplete ? 'Secured' : '+120 XP',
      to: '/profile',
    },
    {
      key: 'accounts',
      label: 'Accounts',
      xp: 80,
      complete: accountsComplete,
      status: accountsComplete ? 'Linked' : '+80 XP',
      to: '/profile',
    },
    {
      key: 'clan',
      label: 'Clan',
      xp: 140,
      complete: Boolean(myClan),
      status: myClan ? 'Joined' : '+140 XP',
      to: '/clans',
    },
  ]
}