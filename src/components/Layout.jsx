import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  Crown,
  House,
  LogIn,
  MessageSquare,
  Settings,
  ShieldAlert,
  UsersRound,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useIntel } from '../context/useIntel.js'
import RoleBadge from './RoleBadge.jsx'

const navItems = [
  { to: '/', label: 'Home', icon: House },
  { to: '/profiles', label: 'Team', icon: UsersRound },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/messages', label: 'DMs', icon: MessageSquare },
  { to: '/profile', label: 'Profile', icon: Settings },
]

function Layout() {
  const {
    isAuthenticated,
    isAdmin,
    isModerator,
    profileDisplayName,
    role,
    signOut,
    broadcastOnline,
    unreadDirectMessageCount,
  } = useIntel()
  const [dropping, setDropping] = useState(false)
  const [dropStatus, setDropStatus] = useState('') // 'sent' | 'error' | ''

  async function handleDropIn() {
    if (dropping) return
    setDropping(true)
    setDropStatus('')
    try {
      await broadcastOnline()
      setDropStatus('sent')
      setTimeout(() => setDropStatus(''), 4000)
    } catch {
      setDropStatus('error')
      setTimeout(() => setDropStatus(''), 4000)
    } finally {
      setDropping(false)
    }
  }

  const roleNavItem = isAdmin
    ? { to: '/admin', label: 'Admin', icon: Crown, tone: 'admin' }
    : isModerator
      ? { to: '/moderator', label: 'Mod', icon: ShieldAlert, tone: 'moderator' }
      : null
  const bottomNavItems = roleNavItem
    ? [...navItems.slice(0, -1), roleNavItem, navItems[navItems.length - 1]]
    : navItems

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-100">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-28 pt-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between rounded-full border border-white/10 bg-black/30 px-4 py-2.5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-red-500/20 bg-white/5 shadow-[0_0_24px_rgba(239,68,68,0.14)]">
              <img
                src="/ratslogo.png?v=20260511-ratslogo"
                alt="21rats logo"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.28em] text-red-100">
                21rats
              </p>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-gray-500">
                Building 21 Squad Hub
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleDropIn}
                disabled={dropping || dropStatus === 'sent'}
                title="Ping everyone — you just dropped in"
                className={[
                  'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] transition',
                  dropStatus === 'sent'
                    ? 'border-green-500/50 bg-green-500/12 text-green-200'
                    : dropStatus === 'error'
                      ? 'border-red-500/50 bg-red-500/12 text-red-100'
                    : dropping
                      ? 'border-white/10 bg-white/5 text-gray-500 opacity-60'
                      : 'border-yellow-400/40 bg-yellow-400/10 text-yellow-100 hover:bg-yellow-400/20',
                ].join(' ')}
              >
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                {dropStatus === 'sent' ? 'Pinged!' : dropStatus === 'error' ? 'Failed' : dropping ? 'Sending…' : 'Drop In'}
              </button>
            ) : null}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="hidden text-right sm:block hover:opacity-80"
                >
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300">
                    {profileDisplayName}
                  </p>
                  <RoleBadge role={role} compact />
                </Link>
                <Link
                  to="/profile"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 hover:border-red-500/40 hover:text-red-100"
                  aria-label="My Profile"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-400 hover:text-gray-100"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-300 hover:border-red-500/40 hover:text-red-100"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                Login
              </Link>
            )}
          </div>
        </div>

        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/85 px-3 py-2 shadow-2xl shadow-black backdrop-blur-xl">
        <div
          className="mx-auto grid max-w-6xl gap-1.5 sm:gap-2"
          style={{ gridTemplateColumns: `repeat(${bottomNavItems.length}, minmax(0, 1fr))` }}
        >
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isRoleItem = item.tone === 'admin' || item.tone === 'moderator'

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'relative flex min-h-14 flex-col items-center justify-center rounded-2xl border px-2 text-[0.65rem] font-black uppercase tracking-[0.16em] transition',
                    isActive
                      ? item.tone === 'admin'
                        ? 'border-yellow-400/60 bg-yellow-400/15 text-yellow-100 shadow-[0_0_22px_rgba(250,204,21,0.18)]'
                        : item.tone === 'moderator'
                          ? 'border-orange-400/60 bg-orange-400/15 text-orange-100 shadow-[0_0_22px_rgba(251,146,60,0.16)]'
                          : 'border-red-500/60 bg-red-500/12 text-red-100 shadow-[0_0_22px_rgba(239,68,68,0.18)]'
                      : isRoleItem
                        ? item.tone === 'admin'
                          ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200 hover:border-yellow-400/50 hover:bg-yellow-400/15'
                          : 'border-orange-400/30 bg-orange-400/10 text-orange-100 hover:border-orange-400/50 hover:bg-orange-400/15'
                        : 'border-transparent text-gray-500 hover:border-white/10 hover:bg-white/5 hover:text-gray-200',
                  ].join(' ')
                }
              >
                <Icon className="mb-1 h-5 w-5" aria-hidden="true" />
                {item.label}
                {item.to === '/messages' && unreadDirectMessageCount ? (
                  <span className="absolute right-2 top-2 min-w-5 rounded-full border border-red-500/50 bg-red-500/15 px-1.5 py-0.5 text-[0.55rem] font-black leading-none text-red-100">
                    {unreadDirectMessageCount > 9 ? '9+' : unreadDirectMessageCount}
                  </span>
                ) : null}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default Layout
