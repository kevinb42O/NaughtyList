import {
  BadgeAlert,
  Binoculars,
  Bomb,
  Bug,
  Crosshair,
  Crown,
  Eye,
  Fingerprint,
  Flame,
  Ghost,
  Lock,
  Radar,
  Radio,
  ScanFace,
  Shield,
  Siren,
  Skull,
  Swords,
  Target,
  UserRound,
  Zap,
} from 'lucide-react'

export const avatarIconOptions = [
  { key: 'skull', label: 'Skull', Icon: Skull, accent: 'text-red-100', glow: 'from-red-500/28 to-zinc-950' },
  { key: 'shield', label: 'Shield', Icon: Shield, accent: 'text-cyan-100', glow: 'from-cyan-500/24 to-zinc-950' },
  { key: 'crosshair', label: 'Crosshair', Icon: Crosshair, accent: 'text-red-100', glow: 'from-red-500/24 to-zinc-950' },
  { key: 'radar', label: 'Radar', Icon: Radar, accent: 'text-emerald-100', glow: 'from-emerald-500/22 to-zinc-950' },
  { key: 'radio', label: 'Comms', Icon: Radio, accent: 'text-sky-100', glow: 'from-sky-500/22 to-zinc-950' },
  { key: 'swords', label: 'Swords', Icon: Swords, accent: 'text-orange-100', glow: 'from-orange-500/24 to-zinc-950' },
  { key: 'target', label: 'Target', Icon: Target, accent: 'text-red-100', glow: 'from-red-500/24 to-zinc-950' },
  { key: 'flame', label: 'Flame', Icon: Flame, accent: 'text-orange-100', glow: 'from-orange-500/26 to-zinc-950' },
  { key: 'zap', label: 'Shock', Icon: Zap, accent: 'text-yellow-100', glow: 'from-yellow-500/24 to-zinc-950' },
  { key: 'eye', label: 'Watcher', Icon: Eye, accent: 'text-violet-100', glow: 'from-violet-500/22 to-zinc-950' },
  { key: 'ghost', label: 'Ghost', Icon: Ghost, accent: 'text-gray-100', glow: 'from-white/[0.16] to-zinc-950' },
  { key: 'bomb', label: 'Breach', Icon: Bomb, accent: 'text-orange-100', glow: 'from-orange-500/22 to-zinc-950' },
  { key: 'bug', label: 'Rat Hunter', Icon: Bug, accent: 'text-lime-100', glow: 'from-lime-500/20 to-zinc-950' },
  { key: 'siren', label: 'Alert', Icon: Siren, accent: 'text-red-100', glow: 'from-red-500/24 to-zinc-950' },
  { key: 'crown', label: 'Commander', Icon: Crown, accent: 'text-yellow-100', glow: 'from-yellow-500/22 to-zinc-950' },
  { key: 'lock', label: 'Locked', Icon: Lock, accent: 'text-zinc-100', glow: 'from-white/[0.12] to-zinc-950' },
  { key: 'fingerprint', label: 'Identity', Icon: Fingerprint, accent: 'text-cyan-100', glow: 'from-cyan-500/20 to-zinc-950' },
  { key: 'scan-face', label: 'Scanner', Icon: ScanFace, accent: 'text-emerald-100', glow: 'from-emerald-500/20 to-zinc-950' },
  { key: 'binoculars', label: 'Recon', Icon: Binoculars, accent: 'text-blue-100', glow: 'from-blue-500/20 to-zinc-950' },
  { key: 'badge-alert', label: 'Marked', Icon: BadgeAlert, accent: 'text-red-100', glow: 'from-red-500/22 to-zinc-950' },
]

export const defaultAvatarIconKey = 'skull'

export function getAvatarIconOption(key) {
  return avatarIconOptions.find((option) => option.key === key) ?? avatarIconOptions[0]
}

function ProfileAvatar({ className = '', iconKey, online, profile, showOnline = false, size = 'md' }) {
  const option = getAvatarIconOption(iconKey ?? profile?.avatar_icon)
  const Icon = option?.Icon ?? UserRound
  const sizeClasses = {
    sm: 'h-8 w-8 rounded-full',
    md: 'h-10 w-10 rounded-2xl',
    lg: 'h-14 w-14 rounded-3xl',
    xl: 'h-16 w-16 rounded-3xl',
  }
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
    xl: 'h-8 w-8',
  }

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-gradient-to-br ${option.glow} shadow-lg shadow-black/25 ring-1 ring-white/[0.03] ${sizeClasses[size] ?? sizeClasses.md} ${className}`}
      title={option.label}
      aria-label={`${option.label} avatar`}
    >
      <Icon className={`${iconSizes[size] ?? iconSizes.md} ${option.accent}`} aria-hidden="true" />
      {showOnline ? (
        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 ${online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
      ) : null}
    </span>
  )
}

export default ProfileAvatar