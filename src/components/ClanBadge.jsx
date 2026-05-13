import { getClanBadgeIconOption } from './ProfileAvatar.jsx'

function ClanBadge({ className = '', clan, iconKey, size = 'md' }) {
  const option = getClanBadgeIconOption(iconKey ?? clan?.badge_icon)
  const Icon = option.Icon
  const sizeClasses = {
    sm: 'h-8 w-8 rounded-2xl',
    md: 'h-10 w-10 rounded-2xl',
    lg: 'h-12 w-12 rounded-[1.35rem]',
    xl: 'h-14 w-14 rounded-[1.55rem]',
  }
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-7 w-7',
  }

  return (
    <span className={`inline-flex shrink-0 ${className}`.trim()}>
      <span
        className={`flex items-center justify-center overflow-hidden border border-white/10 bg-gradient-to-br ${option.glow} shadow-lg shadow-black/25 ring-1 ring-white/[0.03] ${sizeClasses[size] ?? sizeClasses.md}`}
        title={option.label}
        aria-label={`${option.label} clan badge`}
      >
        <Icon className={`${iconSizes[size] ?? iconSizes.md} ${option.accent}`} aria-hidden="true" />
      </span>
    </span>
  )
}

export default ClanBadge