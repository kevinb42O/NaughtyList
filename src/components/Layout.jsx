import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Crown,
  CircleHelp,
  Crosshair,
  HeartHandshake,
  House,
  LogIn,
  MessageCircle,
  MessageSquare,
  Settings,
  Shield,
  ShieldAlert,
  UsersRound,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useIntel } from '../context/useIntel.js'
import OnboardingPrompt from './OnboardingPrompt.jsx'
import ProfileAvatar from './ProfileAvatar.jsx'
import VoiceChatWidget from './VoiceChatWidget.jsx'
import { clanPrefix, displayProfileName } from '../utils/profiles.js'

const navItems = [
  { to: '/', label: 'Home', icon: House },
  { to: '/profiles', label: 'Team', icon: UsersRound },
  { to: '/clans', label: 'Clans', icon: Shield },
  { to: '/shadowlist', label: 'Banlist', icon: Crosshair },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/messages', label: 'DMs', icon: MessageCircle },
  { to: '/profile', label: 'Profile', icon: Settings },
]

function Layout() {
  const location = useLocation()
  const {
    isAuthenticated,
    isAdmin,
    isModerator,
    profile,
    signOut,
    broadcastOnline,
    unreadDirectMessageCount,
    unreadPublicChatCount,
  } = useIntel()
  const [dropping, setDropping] = useState(false)
  const [dropStatus, setDropStatus] = useState('') // 'sent' | 'error' | ''
  const [keyboardActive, setKeyboardActive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [isInactive, setIsInactive] = useState(false)
  const bottomNavRef = useRef(null)
  
  const navHidden = keyboardActive || modalOpen || isInactive
  const navHiddenRef = useRef(navHidden)

  useEffect(() => {
    navHiddenRef.current = navHidden
  }, [navHidden])

  useEffect(() => {
    const root = document.documentElement
    const textInputSelector = 'input, textarea, select, [contenteditable="true"]'
    let frameId = 0
    let timeoutId = 0

    function updateVisualViewportBottom() {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = window.requestAnimationFrame(() => {
          frameId = 0
          measureVisualViewport()
        })
      })
    }

    function settleVisualViewportBottom() {
      updateVisualViewportBottom()
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(updateVisualViewportBottom, 160)
    }

    function measureVisualViewport() {
      const visualViewport = window.visualViewport
      const viewportHeight = visualViewport?.height ?? window.innerHeight
      const bottomOffset = visualViewport
        ? Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop)
        : 0
      const activeElement = document.activeElement
      const textFieldFocused = Boolean(activeElement?.matches?.(textInputSelector))
      const phoneViewport = window.matchMedia('(max-width: 640px)').matches
      const keyboardVisible = phoneViewport && (textFieldFocused || bottomOffset > 120)

      if (bottomNavRef.current) {
        if (navHiddenRef.current) {
          root.style.setProperty('--mobile-bottom-nav-height', '0px')
        } else {
          root.style.setProperty('--mobile-bottom-nav-height', `${Math.round(bottomNavRef.current.offsetHeight)}px`)
        }
      }

      root.style.setProperty('--visual-viewport-height', `${Math.round(viewportHeight)}px`)
      root.style.setProperty('--visual-viewport-bottom', `${Math.round(bottomOffset)}px`)
      setKeyboardActive(keyboardVisible)
    }

    settleVisualViewportBottom()
    window.addEventListener('resize', settleVisualViewportBottom)
    window.addEventListener('focusin', settleVisualViewportBottom)
    window.addEventListener('focusout', settleVisualViewportBottom)
    window.visualViewport?.addEventListener('resize', settleVisualViewportBottom)
    window.visualViewport?.addEventListener('scroll', settleVisualViewportBottom)
    window.screen.orientation?.addEventListener?.('change', settleVisualViewportBottom)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
      window.clearTimeout(timeoutId)
      window.removeEventListener('resize', settleVisualViewportBottom)
      window.removeEventListener('focusin', settleVisualViewportBottom)
      window.removeEventListener('focusout', settleVisualViewportBottom)
      window.visualViewport?.removeEventListener('resize', settleVisualViewportBottom)
      window.visualViewport?.removeEventListener('scroll', settleVisualViewportBottom)
      window.screen.orientation?.removeEventListener?.('change', settleVisualViewportBottom)
      root.style.removeProperty('--visual-viewport-bottom')
      root.style.removeProperty('--visual-viewport-height')
      root.style.removeProperty('--mobile-bottom-nav-height')
    }
  }, [])

  // Modal event listener
  useEffect(() => {
    const handleModalOpen = () => setModalOpen(true)
    const handleModalClose = () => setModalOpen(false)

    window.addEventListener('modal-open', handleModalOpen)
    window.addEventListener('modal-close', handleModalClose)
    return () => {
      window.removeEventListener('modal-open', handleModalOpen)
      window.removeEventListener('modal-close', handleModalClose)
    }
  }, [])

  // Trigger recalculations when nav hide state changes
  useEffect(() => {
    window.dispatchEvent(new Event('resize'))
  }, [navHidden])

  // Inactivity tracking for auto-hide
  useEffect(() => {
    let timeout

    const resetInactivity = () => {
      setIsInactive(false)
      clearTimeout(timeout)
      // Hide after 4.5 seconds of inactivity
      timeout = setTimeout(() => setIsInactive(true), 4500)
    }

    resetInactivity()

    window.addEventListener('mousemove', resetInactivity)
    window.addEventListener('touchstart', resetInactivity)
    window.addEventListener('touchmove', resetInactivity)
    window.addEventListener('wheel', resetInactivity)
    window.addEventListener('keydown', resetInactivity)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('mousemove', resetInactivity)
      window.removeEventListener('touchstart', resetInactivity)
      window.removeEventListener('touchmove', resetInactivity)
      window.removeEventListener('wheel', resetInactivity)
      window.removeEventListener('keydown', resetInactivity)
    }
  }, [])

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
  const isHome = location.pathname === '/'
  const isChat = location.pathname === '/chat' || location.pathname.startsWith('/messages')

  function navClass({ isActive }, item) {
    const isRoleItem = item.tone === 'admin' || item.tone === 'moderator'
    const activeTone = item.tone === 'admin'
      ? 'border-yellow-400/35 bg-yellow-400/10 text-yellow-100'
      : item.tone === 'moderator'
        ? 'border-orange-400/35 bg-orange-400/10 text-orange-100'
        : 'border-white/12 bg-white/[0.07] text-white'
    const idleTone = isRoleItem
      ? item.tone === 'admin'
        ? 'border-transparent text-yellow-200/80'
        : 'border-transparent text-orange-100/80'
      : 'border-transparent text-gray-500'

    return [
      'group relative isolate flex min-h-[3.45rem] flex-col items-center justify-center rounded-xl border px-1 text-[0.56rem] font-black uppercase tracking-[0.08em] transition-colors duration-150 active:bg-white/[0.08] sm:min-h-[3.65rem] sm:text-[0.6rem] sm:tracking-[0.12em]',
      isActive ? activeTone : idleTone,
    ].join(' ')
  }

  function NavItem({ item }) {
    const Icon = item.icon

    return (
      <NavLink key={item.to} to={item.to} className={(state) => navClass(state, item)}>
        {({ isActive }) => (
          <>
            <span className={`mb-0.5 flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${isActive ? 'text-white' : 'text-current'}`}>
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span>{item.label}</span>
            {item.to === '/messages' && unreadDirectMessageCount ? (
              <span className="absolute right-1 top-1 min-w-4 rounded-full border border-red-500/20 bg-red-600 px-1 py-0.5 text-[0.5rem] font-bold leading-none text-white shadow-sm shadow-red-600/30">
                {unreadDirectMessageCount > 9 ? '9+' : unreadDirectMessageCount}
              </span>
            ) : null}
            {item.to === '/chat' && unreadPublicChatCount ? (
              <span className="absolute right-1 top-1 min-w-4 rounded-full border border-red-500/20 bg-red-600 px-1 py-0.5 text-[0.5rem] font-bold leading-none text-white shadow-sm shadow-red-600/30">
                {unreadPublicChatCount > 9 ? '9+' : unreadPublicChatCount}
              </span>
            ) : null}
            {isActive ? (
              <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-white/5" aria-hidden="true" />
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
      <main className="relative z-[1] mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <div className={`${isHome ? 'pointer-events-none absolute inset-x-0 top-0 z-20 px-4 sm:px-6 lg:px-8' : ''} ${isChat ? 'hidden' : ''}`}>
          <header className={`${isHome ? 'pointer-events-auto mb-0 bg-black/38 shadow-2xl shadow-black/35' : 'mb-5 bg-black/30 shadow-lg shadow-black/20'} flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-3 py-2 backdrop-blur-xl sm:px-4`}>
            <Link to="/" className="group flex min-w-0 items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-white/10 bg-white/5 shadow-[0_0_22px_rgba(99, 102, 241,0.18)] transition group-hover:border-white/10 group-hover:shadow-[0_0_28px_rgba(99, 102, 241,0.28)]">
                <img
                  src="/ratslogo.png?v=20260511-ratslogo"
                  alt="21rats logo"
                  className="relative h-10 w-10 object-contain"
                />
              </div>
              <div className="relative min-w-0">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-x-2 -inset-y-1.5 bg-[radial-gradient(circle_at_18%_50%,rgba(99, 102, 241,0.22),transparent_58%),radial-gradient(circle_at_85%_50%,rgba(56,189,248,0.2),transparent_60%)] blur-md"
                />
                <p className="relative truncate text-[1rem] font-black uppercase tracking-[0.32em] text-transparent bg-gradient-to-r from-white/10 via-white to-cyan-200 bg-clip-text drop-shadow-[0_0_18px_rgba(99, 102, 241,0.35)] sm:text-[1.18rem]">
                  21RATS
                </p>
              </div>
            </Link>

            <div className="flex min-w-0 items-center justify-end gap-2">
              <Link
                to="/support"
                title="Support 21rats"
                aria-label="Open support page"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/8 text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/14 sm:w-auto sm:px-3"
              >
                <HeartHandshake className="h-4.5 w-4.5" aria-hidden="true" />
                <span className="hidden pl-2 text-[0.62rem] font-black uppercase tracking-[0.16em] sm:inline">Support</span>
              </Link>

              <Link
                to="/help"
                title="Help and FAQ"
                aria-label="Open Help and FAQ"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition hover:border-white/10 hover:text-gray-100 sm:w-auto sm:px-3"
              >
                <CircleHelp className="h-4.5 w-4.5" aria-hidden="true" />
                <span className="hidden pl-2 text-[0.62rem] font-black uppercase tracking-[0.16em] sm:inline">Help</span>
              </Link>

              {isAuthenticated ? (
                <Link to="/profile" className="hidden min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 hover:border-white/10 sm:flex">
                  <ProfileAvatar profile={profile} size="sm" />
                  <div className="min-w-0 text-right">
                    <p className="truncate text-[0.68rem] font-black uppercase tracking-[0.14em] text-gray-300">
                      {`${clanPrefix(profile)} ${displayProfileName(profile)}`}
                    </p>
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
                        ? 'border-white/10 bg-white/5 text-gray-100'
                      : dropping
                        ? 'border-white/10 bg-white/5 text-gray-500 opacity-60'
                        : 'drop-in-ready border-yellow-400/40 bg-yellow-400/10 text-yellow-100 hover:bg-yellow-400/20',
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
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-300 hover:border-white/10 hover:text-gray-100"
                >
                  <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                  Login
                </Link>
              )}
            </div>
          </header>
        </div>

        <Outlet />
      </main>

      <OnboardingPrompt />
      <VoiceChatWidget />

      <nav ref={bottomNavRef} className={`mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950/94 pb-[env(safe-area-inset-bottom)] pt-1 shadow-xl shadow-black backdrop-blur-xl ${(keyboardActive || modalOpen || isInactive) ? 'mobile-bottom-nav--hidden' : ''}`} aria-label="Primary navigation">
        <div className="mx-auto grid max-w-6xl gap-1 p-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${bottomNavItems.length}, minmax(0, 1fr))` }}>
          {bottomNavItems.map((item) => <NavItem key={item.to} item={item} />)}
        </div>
      </nav>
    </div>
  )
}

export default Layout
