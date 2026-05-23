export const donationTiers = [
  {
    key: 'supporter',
    label: 'Supporter',
    amountCents: 100,
    short: 'Signal',
    tone: 'border-emerald-400/45 bg-emerald-400/10 text-emerald-100',
    frame: 'emerald',
    description: 'Any confirmed support unlocks the supporter signal.',
  },
  {
    key: 'backer',
    label: 'Backer',
    amountCents: 1000,
    short: 'Backer',
    tone: 'border-cyan-400/45 bg-cyan-400/10 text-cyan-100',
    frame: 'cyan',
    description: 'Badge, stronger frame, and chat flair.',
  },
  {
    key: 'founder',
    label: 'Founder',
    amountCents: 2500,
    short: 'Founder',
    tone: 'border-yellow-400/55 bg-yellow-400/12 text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.16)]',
    frame: 'gold',
    description: 'Founder-grade badge, gold frame, and permanent early-support signal.',
  },
  {
    key: 'colonel',
    label: 'Colonel',
    amountCents: 5000,
    short: 'Colonel',
    tone: 'border-red-300/55 bg-red-400/12 text-red-100 shadow-[0_0_18px_rgba(248,113,113,0.16)]',
    frame: 'ruby',
    description: 'Colonel badge, command frame, and highest public support signal.',
  },
]

const tierRank = {
  none: 0,
  supporter: 1,
  backer: 2,
  founder: 3,
  colonel: 4,
}

export function formatDonationAmount(amountCents, currency = 'eur') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: String(currency || 'eur').toUpperCase(),
    maximumFractionDigits: 0,
  }).format(Number(amountCents ?? 0) / 100)
}

export function supporterTierMeta(tier) {
  return donationTiers.find((option) => option.key === tier) ?? null
}

export function hasSupporterReward(profile) {
  if (!profile?.supporter_badge_enabled || profile?.supporter_badge_visible === false) {
    return false
  }

  return (tierRank[profile.supporter_tier] ?? 0) > 0
}

export function supporterFrameClass(profile) {
  if (!hasSupporterReward(profile)) {
    return ''
  }

  const frame = profile.supporter_profile_frame || supporterTierMeta(profile.supporter_tier)?.frame
  const frames = {
    emerald: 'ring-2 ring-emerald-300/25 shadow-[0_0_22px_rgba(52,211,153,0.16)]',
    cyan: 'ring-2 ring-cyan-300/25 shadow-[0_0_22px_rgba(34,211,238,0.16)]',
    gold: 'ring-2 ring-yellow-300/30 shadow-[0_0_24px_rgba(250,204,21,0.2)]',
    ruby: 'ring-2 ring-red-300/30 shadow-[0_0_24px_rgba(248,113,113,0.2)]',
  }

  return frames[frame] ?? frames.emerald
}
