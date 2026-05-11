/* eslint-disable react-hooks/set-state-in-effect */
import { KeyRound, Plus, Save, Trash2, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { supabase } from '../lib/supabase.js'
import { gameAccountStatusMeta, profileGameAccounts, shadowbanStatusOptions } from '../utils/gameAccounts.js'
import { clanPrefix } from '../utils/profiles.js'

function Profile() {
  const { isAuthenticated, user, profile, onlineUserIds, updateProfile, enablePushNotifications } = useIntel()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [clanTag, setClanTag] = useState(profile?.clan_tag ?? '')
  const [gameAccounts, setGameAccounts] = useState(() => profileGameAccounts(profile))
  const [newId, setNewId] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [saveError, setSaveError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [notificationStatus, setNotificationStatus] = useState('')
  const [notificationError, setNotificationError] = useState('')
  const [enablingNotifications, setEnablingNotifications] = useState(false)

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
    setClanTag(profile?.clan_tag ?? '')
    setGameAccounts(profileGameAccounts(profile))
  }, [profile])

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  const isOnline = onlineUserIds.includes(user?.id)

  function addGameAccount() {
    const trimmed = newId.trim()
    if (!trimmed || gameAccounts.some((account) => account.id.toLowerCase() === trimmed.toLowerCase())) {
      return
    }

    setGameAccounts([
      ...gameAccounts,
      {
        id: trimmed,
        shadowbanStatus: 'unknown',
        shadowbanDate: '',
      },
    ])
    setNewId('')
  }

  function updateGameAccount(index, field, value) {
    setGameAccounts((currentAccounts) =>
      currentAccounts.map((account, accountIndex) => {
        if (accountIndex !== index) {
          return account
        }

        if (field === 'shadowbanStatus') {
          return {
            ...account,
            shadowbanStatus: value,
            shadowbanDate: value === 'shadowbanned' ? account.shadowbanDate : '',
          }
        }

        return {
          ...account,
          [field]: value,
        }
      }),
    )
  }

  function removeGameAccount(index) {
    setGameAccounts((currentAccounts) => currentAccounts.filter((_, accountIndex) => accountIndex !== index))
  }

  async function handleSaveProfile(event) {
    event.preventDefault()
    setSaving(true)
    setSaveStatus('')
    setSaveError('')
    try {
      await updateProfile({ displayName, clanTag, gameAccounts })
      setSaveStatus('Profile saved.')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    setPasswordError('')
    setPasswordStatus('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordStatus('Password updated.')
      setNewPassword('')
      setConfirmPassword('')
    }
    setChangingPassword(false)
  }

  async function handleEnableNotifications() {
    setNotificationStatus('')
    setNotificationError('')
    setEnablingNotifications(true)

    try {
      const enabled = await enablePushNotifications()
      if (enabled) {
        setNotificationStatus('Phone notifications enabled on this device.')
      } else {
        setNotificationError('Notifications are blocked or unavailable on this device.')
      }
    } catch (notificationSetupError) {
      setNotificationError(notificationSetupError.message)
    } finally {
      setEnablingNotifications(false)
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Settings" title="My Profile">
        Update your display name, clan tag, game accounts, shadowban tracking, and password.
      </PageHeader>

      <div className="mb-6 flex items-center gap-4 rounded-[1.8rem] border border-white/10 bg-black/30 p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-gray-300">
          <UserRound className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
            {clanPrefix(profile)} {displayName || 'No name set'}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <OnlineDot online={isOnline} />
            <RoleBadge role={profile?.role} compact />
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{user?.email}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Profile details */}
        <section className="panel rounded-[1.8rem] p-5">
          <p className="intel-label mb-5">Profile Details</p>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label htmlFor="pf-name" className="intel-label mb-2 block">
                Display Name
              </label>
              <input
                id="pf-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="field"
                placeholder="Your name"
                maxLength="64"
              />
            </div>

            <div>
              <label htmlFor="pf-clan" className="intel-label mb-2 block">
                Clan Tag
              </label>
              <input
                id="pf-clan"
                value={clanTag}
                onChange={(e) => setClanTag(e.target.value)}
                className="field font-mono uppercase tracking-widest"
                placeholder="B21"
                maxLength="16"
              />
            </div>

            <div>
              <p className="intel-label mb-2">Game Accounts</p>
              <div className="space-y-3">
                {gameAccounts.length ? (
                  gameAccounts.map((account, index) => {
                    const statusMeta = gameAccountStatusMeta(account)

                    return (
                      <div key={`${account.id}-${index}`} className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                        <div className="flex items-start gap-2">
                          <input
                            value={account.id}
                            onChange={(event) => updateGameAccount(index, 'id', event.target.value)}
                            className="field flex-1 font-mono"
                            placeholder="Activision ID"
                            maxLength="64"
                          />
                          <button
                            type="button"
                            onClick={() => removeGameAccount(index)}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                            aria-label={`Remove ${account.id}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>

                        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
                          <select
                            value={account.shadowbanStatus}
                            onChange={(event) => updateGameAccount(index, 'shadowbanStatus', event.target.value)}
                            className="field"
                            aria-label={`Shadowban status for ${account.id || 'account'}`}
                          >
                            {shadowbanStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <input
                            type="date"
                            value={account.shadowbanDate}
                            onChange={(event) => updateGameAccount(index, 'shadowbanDate', event.target.value)}
                            disabled={account.shadowbanStatus !== 'shadowbanned'}
                            className="field disabled:opacity-50"
                            aria-label={`Shadowban date for ${account.id || 'account'}`}
                          />

                          <button
                            type="button"
                            onClick={() => updateGameAccount(index, 'shadowbanDate', new Date().toISOString().slice(0, 10))}
                            disabled={account.shadowbanStatus !== 'shadowbanned'}
                            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-red-500/40 hover:text-red-100 disabled:opacity-40"
                          >
                            Today
                          </button>
                        </div>

                        <p className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] ${statusMeta.className}`}>
                          {statusMeta.label}
                        </p>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/25 p-4 text-sm font-bold text-gray-500">
                    No game accounts yet. Add each account you play on and track shadowban status per account.
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGameAccount())}
                  className="field flex-1"
                  placeholder="Add another Activision ID"
                  maxLength="64"
                />
                <button
                  type="button"
                  onClick={addGameAccount}
                  disabled={!newId.trim()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:border-red-500/40 hover:text-red-100 disabled:opacity-40"
                  aria-label="Add game account"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {saveStatus ? <p className="mt-3 text-sm font-bold text-green-200">{saveStatus}</p> : null}
              {saveError ? <p className="mt-3 text-sm font-bold text-red-200">{saveError}</p> : null}
            </div>
          </form>
        </section>

        {/* Password */}
        <section className="panel rounded-[1.8rem] p-5">
          <div className="mb-6 border-b border-white/10 pb-5">
            <p className="intel-label mb-3">Phone Notifications</p>
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={enablingNotifications}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-yellow-400/40 bg-yellow-400/10 px-5 text-sm font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-400/20 disabled:opacity-60"
            >
              {enablingNotifications ? 'Enabling...' : 'Enable On This Device'}
            </button>
            {notificationStatus ? <p className="mt-3 text-sm font-bold text-green-200">{notificationStatus}</p> : null}
            {notificationError ? <p className="mt-3 text-sm font-bold text-red-200">{notificationError}</p> : null}
          </div>

          <p className="intel-label mb-5">Change Password</p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="pf-newpass" className="intel-label mb-2 block">
                New Password
              </label>
              <input
                id="pf-newpass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="field"
                placeholder="Min. 8 characters"
                minLength="8"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="pf-confirm" className="intel-label mb-2 block">
                Confirm Password
              </label>
              <input
                id="pf-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field"
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-red-500/40 hover:text-red-100 disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                {changingPassword ? 'Updating…' : 'Update Password'}
              </button>
              {passwordStatus ? <p className="mt-3 text-sm font-bold text-green-200">{passwordStatus}</p> : null}
              {passwordError ? <p className="mt-3 text-sm font-bold text-red-200">{passwordError}</p> : null}
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

export default Profile
