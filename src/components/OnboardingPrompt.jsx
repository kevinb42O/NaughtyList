import { Bell, Download, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIntel } from '../context/useIntel.js'
import { notificationPermission, pushSupported } from '../utils/push.js'

const STORAGE_KEY = '21rats_onboarding_v1'

function isInstalledPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true
  )
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

export default function OnboardingPrompt() {
  const { isAuthenticated, profile, enablePushNotifications } = useIntel()
  const [sessionClosed, setSessionClosed] = useState(false)
  const [permaDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(isInstalledPWA)
  const [notifPerm, setNotifPerm] = useState(notificationPermission)
  const [enablingNotif, setEnablingNotif] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Re-check notification permission every few seconds in case the user
  // granted it via browser settings while the app was open.
  useEffect(() => {
    if (!('Notification' in window)) return
    const interval = setInterval(() => setNotifPerm(notificationPermission()), 3000)
    return () => clearInterval(interval)
  }, [])

  if (permaDismissed || sessionClosed || !isAuthenticated || !profile) return null

  const ios = isIosDevice()
  const profileIncomplete = !profile.bio?.trim() || !profile.avatar_image_url
  const notifNeeded = pushSupported() && notifPerm === 'default'
  const installNeeded = !installed && (ios || !!installPrompt)

  if (!profileIncomplete && !notifNeeded && !installNeeded) return null

  function handlePermaDismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setSessionClosed(true)
  }

  async function handleEnableNotif() {
    if (enablingNotif) return
    setEnablingNotif(true)
    try {
      await enablePushNotifications()
    } catch {
      // user declined or unsupported – fall through
    } finally {
      setNotifPerm(notificationPermission())
      setEnablingNotif(false)
    }
  }

  async function handleInstall() {
    if (ios) {
      setIosHint(true)
      return
    }
    if (!installPrompt || installing) return
    setInstalling(true)
    try {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
        setInstallPrompt(null)
      }
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div
      className="fixed inset-x-3 z-40 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/96 shadow-2xl shadow-black/70 backdrop-blur-xl sm:inset-x-auto sm:right-5 sm:w-80"
      style={{ bottom: 'calc(var(--mobile-bottom-nav-height, 3.5rem) + 0.5rem)' }}
      role="complementary"
      aria-label="Setup checklist"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-indigo-200">
          Complete your setup
        </p>
        <button
          type="button"
          onClick={() => setSessionClosed(true)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 transition hover:bg-white/8 hover:text-gray-200"
          aria-label="Close for now"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Action rows */}
      <div className="divide-y divide-white/6 px-4">
        {profileIncomplete && (
          <div className="flex items-center gap-3 py-3">
            <User className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-xs font-bold leading-5 text-gray-300">
              {!profile.bio?.trim() && !profile.avatar_image_url
                ? 'Set a bio and profile picture'
                : !profile.bio?.trim()
                  ? 'Add a short bio'
                  : 'Add a profile picture'}
            </p>
            <Link
              to="/profile"
              onClick={() => setSessionClosed(true)}
              className="ml-auto shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.14em] text-gray-200 transition hover:bg-white/10"
            >
              Set up
            </Link>
          </div>
        )}

        {installNeeded && (
          <div className="flex items-center gap-3 py-3">
            <Download className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-xs font-bold leading-5 text-gray-300">
              {iosHint ? "Tap Share → 'Add to Home Screen'" : 'Add to Home Screen'}
            </p>
            {!iosHint && (
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing}
                className="ml-auto shrink-0 rounded-full border border-indigo-500/50 bg-indigo-500/12 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.14em] text-indigo-100 transition hover:bg-indigo-500/20 disabled:opacity-50"
              >
                {installing ? '…' : 'Install'}
              </button>
            )}
          </div>
        )}

        {notifNeeded && (
          <div className="flex items-center gap-3 py-3">
            <Bell className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-xs font-bold leading-5 text-gray-300">
              Get squad alerts on this device
            </p>
            <button
              type="button"
              onClick={handleEnableNotif}
              disabled={enablingNotif}
              className="ml-auto shrink-0 rounded-full border border-indigo-500/50 bg-indigo-500/12 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.14em] text-indigo-100 transition hover:bg-indigo-500/20 disabled:opacity-50"
            >
              {enablingNotif ? '…' : 'Enable'}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/8 px-4 py-2">
        <button
          type="button"
          onClick={handlePermaDismiss}
          className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-gray-600 transition hover:text-gray-400"
        >
          Don't remind me
        </button>
      </div>
    </div>
  )
}
