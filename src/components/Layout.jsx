import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  Crown,
  House,
  LogIn,
  MessageSquare,
  Settings,
  Shield,
  ShieldAlert,
  UsersRound,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useIntel } from '../context/useIntel.js'
import ProfileAvatar from './ProfileAvatar.jsx'
import RoleBadge from './RoleBadge.jsx'
import StreakBadge from './StreakBadge.jsx'

const navItems = [
  { to: '/', label: 'Home', icon: House },
  { to: '/profiles', label: 'Team', icon: UsersRound },
  { to: '/clans', label: 'Clans', icon: Shield },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/messages', label: 'DMs', icon: MessageSquare },
  { to: '/profile', label: 'Profile', icon: Settings },
]

function Layout() {
  const {
    isAuthenticated,
    isAdmin,
    isModerator,
    profile,
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

  function navClass({ isActive }, item) {
    const isRoleItem = item.tone === 'admin' || item.tone === 'moderator'
    const activeTone = item.tone === 'admin'
      ? 'border-yellow-300/70 bg-yellow-400/18 text-yellow-100 shadow-[0_0_28px_rgba(250,204,21,0.24)]'
      : item.tone === 'moderator'
        ? 'border-orange-300/70 bg-orange-400/18 text-orange-100 shadow-[0_0_28px_rgba(251,146,60,0.22)]'
        : 'border-red-300/70 bg-red-500/18 text-red-50 shadow-[0_0_30px_rgba(239,68,68,0.28)]'
    const idleTone = isRoleItem
      ? item.tone === 'admin'
        ? 'border-yellow-400/25 bg-yellow-400/8 text-yellow-200'
        : 'border-orange-400/25 bg-orange-400/8 text-orange-100'
      : 'border-white/8 bg-white/[0.03] text-gray-500'

    return [
      'group relative isolate flex min-h-[4.25rem] flex-col items-center justify-center overflow-hidden rounded-[1.1rem] border px-1.5 text-[0.56rem] font-black uppercase tracking-[0.1em] transition duration-200 active:scale-95 sm:text-[0.62rem] sm:tracking-[0.14em]',
      isActive ? activeTone : idleTone,
    ].join(' ')
  }

  function NavItem({ item }) {
    const Icon = item.icon

    return (
      <NavLink key={item.to} to={item.to} className={(state) => navClass(state, item)}>
        {({ isActive }) => (
          <>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-2 top-1 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent transition ${isActive ? 'opacity-100' : 'opacity-0'}`}
            />
            <span className={`mb-1 flex h-8 w-8 items-center justify-center rounded-2xl border transition ${isActive ? 'border-white/20 bg-white/12 text-white' : 'border-transparent bg-transparent text-current'}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>{item.label}</span>
            {item.to === '/messages' && unreadDirectMessageCount ? (
              <span className="absolute right-1.5 top-1.5 min-w-5 rounded-full border border-red-300/70 bg-red-500/25 px-1.5 py-0.5 text-[0.55rem] leading-none text-red-50 shadow-lg shadow-red-500/20">
                {unreadDirectMessageCount > 9 ? '9+' : unreadDirectMessageCount}
              </span>
            ) : null}
            {isActive ? (
              <span className="absolute bottom-1.5 h-1 w-7 rounded-full bg-current opacity-70 shadow-[0_0_16px_currentColor]" aria-hidden="true" />
            ) : null}
          </>
        )}
      </NavLink>
    )
  }

  return (
    <div className="min-h-screen text-gray-100">
      <div
        aria-hidden="true"
        className="app-watermark pointer-events-none fixed inset-0 z-0"
      />
      <main className="relative z-[1] mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-32 pt-4 sm:px-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between gap-3 rounded-[1.35rem] border border-white/10 bg-black/35 px-3 py-2.5 shadow-xl shadow-black/25 backdrop-blur-xl sm:px-4">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-red-500/25 bg-white/5 shadow-[0_0_24px_rgba(239,68,68,0.16)]">
              <span className="absolute inset-0 bg-gradient-to-br from-red-500/16 to-emerald-400/8" aria-hidden="true" />
              <img
                src="/ratslogo.png?v=20260511-ratslogo"
                alt="21rats logo"
                className="relative h-10 w-10 object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[0.68rem] font-black uppercase tracking-[0.24em] text-red-100 sm:text-xs">
                21rats
              </p>
              <p className="truncate text-[0.62rem] font-bold uppercase tracking-[0.14em] text-gray-500 sm:text-[0.68rem]">
                Building 21 Intel Network
              </p>
            </div>
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-2">
            {isAuthenticated ? (
              <Link to="/profile" className="hidden min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 hover:border-red-400/30 sm:flex">
                <ProfileAvatar profile={profile} size="sm" />
                <div className="min-w-0 text-right">
                  <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.14em] text-gray-300">
                    {profileDisplayName}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    <RoleBadge role={role} compact />
                    <StreakBadge compact profile={profile} />
                  </div>
                </div>
              </Link>
            ) : null}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleDropIn}
                disabled={dropping || dropStatus === 'sent'}
                title="Ping everyone — you just dropped in"
                className={[
                  'inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] transition active:scale-95 disabled:scale-100',
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
                <span className="hidden sm:inline">{dropStatus === 'sent' ? 'Pinged!' : dropStatus === 'error' ? 'Failed' : dropping ? 'Sending...' : 'Drop In'}</span>
              </button>
            ) : null}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={signOut}
                className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-400 hover:text-gray-100 md:inline-flex"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/auth"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-300 hover:border-red-500/40 hover:text-red-100"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                Login
              </Link>
            )}
          </div>
        </header>

        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/88 px-2 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 shadow-2xl shadow-black backdrop-blur-2xl" aria-label="Primary navigation">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-300/70 to-transparent" aria-hidden="true" />
        <div className="mx-auto grid max-w-6xl gap-1.5 rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.45)] sm:gap-2" style={{ gridTemplateColumns: `repeat(${bottomNavItems.length}, minmax(0, 1fr))` }}>
          {bottomNavItems.map((item) => <NavItem key={item.to} item={item} />)}
        </div>
      </nav>
    </div>
  )
}

export default Layout
