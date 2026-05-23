import { BadgeCheck, HeartHandshake, ShieldCheck } from 'lucide-react'
import { hasSupporterReward, supporterTierMeta } from '../utils/supporters.js'

function SupporterBadge({ compact = false, profile }) {
  if (!hasSupporterReward(profile)) {
    return null
  }

  const tier = supporterTierMeta(profile.supporter_tier)
  const Icon = profile.supporter_tier === 'colonel' ? ShieldCheck : profile.supporter_tier === 'founder' ? BadgeCheck : HeartHandshake

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] ${tier?.tone ?? 'border-emerald-400/45 bg-emerald-400/10 text-emerald-100'}`}
      title={`${tier?.label ?? 'Supporter'}: cosmetic project supporter reward`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {compact ? tier?.short ?? 'Supporter' : tier?.label ?? 'Supporter'}
    </span>
  )
}

export default SupporterBadge
