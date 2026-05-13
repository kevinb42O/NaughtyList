/* eslint-disable react-refresh/only-export-components */
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
  Rat,
  Radio,
  ScanFace,
  Shield,
  ShieldAlert,
  Siren,
  Skull,
  Swords,
  Target,
  UserRound,
  Zap,
} from 'lucide-react'
import { avatarStreakRequirement } from '../utils/streaks.js'

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
  { key: 'crown', label: 'Admin', Icon: Crown, accent: 'text-yellow-100', glow: 'from-yellow-500/22 to-zinc-950', accessRole: 'admin' },
  { key: 'shield-alert', label: 'Moderator', Icon: ShieldAlert, accent: 'text-orange-100', glow: 'from-orange-500/22 to-zinc-950', accessRole: 'moderator' },
  { key: 'lock', label: 'Locked', Icon: Lock, accent: 'text-zinc-100', glow: 'from-white/[0.12] to-zinc-950' },
  { key: 'fingerprint', label: 'Identity', Icon: Fingerprint, accent: 'text-cyan-100', glow: 'from-cyan-500/20 to-zinc-950' },
  { key: 'scan-face', label: 'Scanner', Icon: ScanFace, accent: 'text-emerald-100', glow: 'from-emerald-500/20 to-zinc-950' },
  { key: 'binoculars', label: 'Recon', Icon: Binoculars, accent: 'text-blue-100', glow: 'from-blue-500/20 to-zinc-950' },
  { key: 'badge-alert', label: 'Marked', Icon: BadgeAlert, accent: 'text-red-100', glow: 'from-red-500/22 to-zinc-950' },
]

export const defaultAvatarIconKey = 'skull'
export const defaultClanBadgeIconKey = 'shield'
export const clanBadgeIconOptions = [
  ...avatarIconOptions.filter((option) => !option.accessRole),
  { key: 'rat', label: 'Rat', Icon: Rat, accent: 'text-red-100', glow: 'from-red-500/24 to-zinc-950' },
]

export function getAvatarIconOption(key) {
  return avatarIconOptions.find((option) => option.key === key) ?? avatarIconOptions[0]
}

export function getClanBadgeIconOption(key) {
  return clanBadgeIconOptions.find((option) => option.key === key) ?? getAvatarIconOption(defaultClanBadgeIconKey)
}

export function canUseAvatarIcon(iconOrKey, role, loginStreak = 0) {
  const option = typeof iconOrKey === 'string' ? getAvatarIconOption(iconOrKey) : iconOrKey
  const requiredStreak = avatarStreakRequirement(option?.key)

  if (requiredStreak && loginStreak < requiredStreak) {
    return false
  }

  if (!option?.accessRole) {
    return true
  }

  return role === option.accessRole
}

export function getAvatarIconLockLabel(iconOrKey) {
  const option = typeof iconOrKey === 'string' ? getAvatarIconOption(iconOrKey) : iconOrKey
  const requiredStreak = avatarStreakRequirement(option?.key)

  if (requiredStreak) {
    return `${requiredStreak} day streak`
  }

  if (option?.accessRole === 'admin') {
    return 'Admins only'
  }

  if (option?.accessRole === 'moderator') {
    return 'Mods only'
  }

  return ''
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
  const dotSizes = {
    sm: 'h-3 w-3 -bottom-0.5 -right-0.5',
    md: 'h-3.5 w-3.5 -bottom-0.5 -right-0.5',
    lg: 'h-4 w-4 -bottom-1 -right-1',
    xl: 'h-4 w-4 -bottom-1 -right-1',
  }

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span
        className={`flex items-center justify-center overflow-hidden border border-white/10 bg-gradient-to-br ${option.glow} shadow-lg shadow-black/25 ring-1 ring-white/[0.03] ${sizeClasses[size] ?? sizeClasses.md}`}
        title={option.label}
        aria-label={`${option.label} avatar`}
      >
        <Icon className={`${iconSizes[size] ?? iconSizes.md} ${option.accent}`} aria-hidden="true" />
      </span>
      {showOnline ? (
        <span
          className={`absolute z-10 rounded-full border-2 border-zinc-950 shadow-md ${
            online
              ? 'bg-emerald-400 shadow-emerald-500/60 ring-2 ring-emerald-400/30'
              : 'bg-zinc-500 shadow-black/40'
          } ${dotSizes[size] ?? dotSizes.md}`}
          aria-label={online ? 'Online' : 'Offline'}
        />
      ) : null}
    </span>
  )
}

export default ProfileAvatar