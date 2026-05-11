import { Crown } from 'lucide-react'

const roleStyles = {
  admin: 'border-yellow-400/70 bg-yellow-400/15 text-yellow-200 shadow-[0_0_18px_rgba(250,204,21,0.22)]',
  moderator: 'border-orange-300/60 bg-orange-400/15 text-orange-100',
  user: 'border-white/10 bg-white/5 text-gray-400',
}

function RoleBadge({ role, compact = false }) {
  const normalizedRole = role ?? 'user'

  if (normalizedRole === 'user' && compact) {
    return null
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] ${
        roleStyles[normalizedRole] ?? roleStyles.user
      }`}
    >
      {normalizedRole === 'admin' ? (
        <><Crown className="h-3 w-3" aria-hidden="true" />ADMIN</>
      ) : normalizedRole === 'moderator' ? 'MOD' : 'USER'}
    </span>
  )
}

export default RoleBadge
