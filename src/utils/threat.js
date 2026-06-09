export const threatStyles = {
  hostile: {
    label: 'Kill on Sight',
    badge: 'border-indigo-500/70 bg-indigo-500/15 text-indigo-200',
    glow: 'shadow-[0_0_28px_rgba(99, 102, 241,0.28)] border-indigo-500/70',
    dot: 'bg-indigo-500',
    text: 'text-indigo-300',
    ring: 'ring-indigo-500/35',
  },
  caution: {
    label: 'Caution',
    badge: 'border-orange-400/70 bg-orange-400/15 text-orange-100',
    glow: 'shadow-[0_0_28px_rgba(251,146,60,0.24)] border-orange-400/70',
    dot: 'bg-orange-400',
    text: 'text-orange-200',
    ring: 'ring-orange-400/35',
  },
  friendly: {
    label: 'Friendly',
    badge: 'border-green-400/70 bg-green-400/15 text-green-100',
    glow: 'shadow-[0_0_28px_rgba(34,197,94,0.25)] border-green-400/70',
    dot: 'bg-green-400',
    text: 'text-green-200',
    ring: 'ring-green-400/35',
  },
}

const threatPriority = {
  hostile: 0,
  caution: 1,
  friendly: 2,
}

export function getThreatStyle(threatLevel) {
  return threatStyles[threatLevel] ?? threatStyles.caution
}

export function comparePlayersByPriority(first, second) {
  return (
    (threatPriority[first.threatLevel] ?? 99) - (threatPriority[second.threatLevel] ?? 99) ||
    first.trustScore - second.trustScore ||
    new Date(second.createdAt) - new Date(first.createdAt)
  )
}

export function rankMostWanted(player) {
  const hostileWeight = player.threatLevel === 'hostile' ? 55 : 0
  const tagWeight = player.tags.filter((tag) => tag !== 'Friendly').length * 7
  return 100 - player.trustScore + hostileWeight + tagWeight
}
