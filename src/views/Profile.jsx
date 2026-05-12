/* eslint-disable react-hooks/set-state-in-effect */
import { KeyRound, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProfileAvatar, { avatarIconOptions, defaultAvatarIconKey } from '../components/ProfileAvatar.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { supabase } from '../lib/supabase.js'
import { gameAccountStatusMeta, profileGameAccounts, shadowbanStatusOptions } from '../utils/gameAccounts.js'
import { clanPrefix } from '../utils/profiles.js'

function ProfileSectionHeader({ step, eyebrow, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-4 border-b border-white/10 pb-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-black text-white">
        {step}
      </span>
      <div>
        <p className="intel-label mb-2">{eyebrow}</p>
        <h2 className="text-xl font-black uppercase tracking-[0.04em] text-white">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">{description}</p>
      </div>
    </div>
  )
}

function Profile() {
  const {
    isAuthenticated,
    user,
    profile,
    myClan,
    myClanRole,
    clanInvites,
    clanJoinRequests,
    onlineUserIds,
    updateProfile,
    enablePushNotifications,
  } = useIntel()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [avatarIcon, setAvatarIcon] = useState(profile?.avatar_icon ?? defaultAvatarIconKey)
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
    setBio(profile?.bio ?? '')
    setAvatarIcon(profile?.avatar_icon ?? defaultAvatarIconKey)
    setGameAccounts(profileGameAccounts(profile))
  }, [profile])

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  const isOnline = onlineUserIds.includes(user?.id)
  const pendingInviteCount = clanInvites.filter((invite) => invite.invitee_user_id === user?.id).length
  const pendingRequestCount = clanJoinRequests.filter((request) => request.user_id === user?.id).length

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
      await updateProfile({ displayName, bio, avatarIcon, gameAccounts })
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
        Update your display name, bio, review your clan status, track game accounts, and manage your password.
      </PageHeader>

      <div className="mb-6 flex items-center gap-4 rounded-[1.8rem] border border-white/10 bg-black/30 p-5">
        <ProfileAvatar iconKey={avatarIcon} online={isOnline} showOnline size="lg" />
        <div>
          <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
            {clanPrefix(profile)} {displayName || 'No name set'}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <OnlineDot online={isOnline} />
            <RoleBadge role={profile?.role} compact />
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{user?.email}</span>
          </div>
          <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-gray-400">
            {bio.trim() || 'No bio set yet.'}
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <form onSubmit={handleSaveProfile} className="grid gap-5">
          <section className="panel rounded-[1.8rem] p-5">
            <ProfileSectionHeader
              step="1"
              eyebrow="Identity"
              title="Profile Details"
              description="Set the display name and bio your squad sees across the board, chat, and direct messages. Clan membership now lives in Clan HQ."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="intel-label mb-3">Avatar Icon</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-10">
                  {avatarIconOptions.map((option) => {
                    const selected = avatarIcon === option.key

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setAvatarIcon(option.key)}
                        title={option.label}
                        aria-label={`Use ${option.label} avatar`}
                        className={`group flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border p-2 transition ${
                          selected
                            ? 'border-red-400/60 bg-red-500/16 shadow-[0_0_22px_rgba(239,68,68,0.18)]'
                            : 'border-white/10 bg-black/25 hover:border-red-400/35 hover:bg-white/[0.04]'
                        }`}
                      >
                        <ProfileAvatar iconKey={option.key} size="md" />
                        <span className={`text-center text-[0.56rem] font-black uppercase tracking-[0.1em] ${selected ? 'text-red-100' : 'text-gray-500 group-hover:text-gray-300'}`}>
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

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

              <div className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
                <p className="intel-label mb-2">Clan Access</p>
                {myClan ? (
                  <>
                    <p className="text-lg font-black uppercase tracking-[0.04em] text-white">
                      [{myClan.tag}] {myClan.name}
                    </p>
                    <p className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-500">
                      Role: {myClanRole}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-black uppercase tracking-[0.04em] text-white">No active clan</p>
                    <p className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-500">
                      {pendingInviteCount} invites, {pendingRequestCount} requests pending
                    </p>
                  </>
                )}
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Clan tags are now managed through real clan membership instead of a manual profile field.
                </p>
                <Link
                  to="/clans"
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
                >
                  Open Clan HQ
                </Link>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="pf-bio" className="intel-label block">
                  Bio
                </label>
                <span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-500">
                  {bio.length}/280
                </span>
              </div>
              <textarea
                id="pf-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="field min-h-[140px] resize-y"
                placeholder="What you run, when you are on, or anything the squad should know before they queue with you."
                maxLength="280"
              />
            </div>
          </section>

          <section className="panel rounded-[1.8rem] p-5">
            <ProfileSectionHeader
              step="2"
              eyebrow="Accounts"
              title="Game Accounts"
              description="Track every Activision ID you use and keep the shadowban status current for each account."
            />

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

            <div className="mt-4 flex gap-2">
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
          </section>

          <section className="panel rounded-[1.8rem] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="intel-label mb-2">Save Profile</p>
                <p className="text-sm leading-6 text-gray-400">
                  Profile details and game accounts save together.
                </p>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
            {saveStatus ? <p className="mt-3 text-sm font-bold text-green-200">{saveStatus}</p> : null}
            {saveError ? <p className="mt-3 text-sm font-bold text-red-200">{saveError}</p> : null}
          </section>
        </form>

        <div className="grid content-start gap-5">
          <section className="panel rounded-[1.8rem] p-5">
            <ProfileSectionHeader
              step="3"
              eyebrow="Alerts"
              title="Phone Notifications"
              description="Enable push alerts on this device so you catch squad updates without reopening the app."
            />

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
          </section>

          <section className="panel rounded-[1.8rem] p-5">
            <ProfileSectionHeader
              step="4"
              eyebrow="Security"
              title="Change Password"
              description="Update your password here without touching the rest of your profile settings."
            />

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
    </div>
  )
}

export default Profile
