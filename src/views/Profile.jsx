/* eslint-disable react-hooks/set-state-in-effect */
import { Camera, HeartHandshake, KeyRound, Lock, Plus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import ClanBadge from '../components/ClanBadge.jsx'
import CollapsiblePanel from '../components/CollapsiblePanel.jsx'
import DailyCheckInPanel from '../components/DailyCheckInPanel.jsx'
import GifPickerModal from '../components/GifPickerModal.jsx'
import OnlineDot from '../components/OnlineDot.jsx'
import ProfileAvatar, { avatarIconOptions, canUseAvatarIcon, defaultAvatarIconKey, getAvatarIconLockLabel } from '../components/ProfileAvatar.jsx'
import ProfileDisplayName from '../components/ProfileDisplayName.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import StreakBadge from '../components/StreakBadge.jsx'
import SupporterBadge from '../components/SupporterBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { supabase } from '../lib/supabase.js'
import { profileLevel, profileXpTotal } from '../utils/gamification.js'
import { gameAccountStatusMeta, profileGameAccounts, shadowbanStatusOptions } from '../utils/gameAccounts.js'
import { imageAcceptValue, uploadProfileImage, validateImageFile } from '../utils/media.js'
import { avatarStreakRequirement, formatDaysUntilReward, nextStreakReward, profileLoginStreak } from '../utils/streaks.js'
import { formatDonationAmount } from '../utils/supporters.js'

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
    isAdmin,
    isModerator,
    updateProfile,
    updateSupporterPreferences,
    enablePushNotifications,
    signOut,
  } = useIntel()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [avatarIcon, setAvatarIcon] = useState(profile?.avatar_icon ?? defaultAvatarIconKey)
  const [avatarImageUrl, setAvatarImageUrl] = useState(profile?.avatar_image_url ?? '')
  const [avatarImageFile, setAvatarImageFile] = useState(null)
  const [avatarImagePreviewUrl, setAvatarImagePreviewUrl] = useState('')
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0)
  const [bannerImageUrl, setBannerImageUrl] = useState(profile?.banner_image_url ?? '')
  const [bannerImageFile, setBannerImageFile] = useState(null)
  const [bannerImagePreviewUrl, setBannerImagePreviewUrl] = useState('')
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0)
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
  const [supporterBadgeVisible, setSupporterBadgeVisible] = useState(profile?.supporter_badge_visible ?? true)
  const [supporterWallVisible, setSupporterWallVisible] = useState(profile?.supporter_wall_visible ?? false)
  const [supporterDisplayName, setSupporterDisplayName] = useState(profile?.supporter_display_name ?? '')
  const [savingSupporterPrefs, setSavingSupporterPrefs] = useState(false)
  const [supporterStatus, setSupporterStatus] = useState('')
  const [supporterError, setSupporterError] = useState('')
  const [showBannerGifPicker, setShowBannerGifPicker] = useState(false)
  const avatarFileInputRef = useRef(null)
  const bannerFileInputRef = useRef(null)

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
    setBio(profile?.bio ?? '')
    setAvatarIcon(profile?.avatar_icon ?? defaultAvatarIconKey)
    setAvatarImageUrl(profile?.avatar_image_url ?? '')
    setAvatarImageFile(null)
    setAvatarUploadProgress(0)
    setBannerImageUrl(profile?.banner_image_url ?? '')
    setBannerImageFile(null)
    setBannerUploadProgress(0)
    setGameAccounts(profileGameAccounts(profile))
    setSupporterBadgeVisible(profile?.supporter_badge_visible ?? true)
    setSupporterWallVisible(profile?.supporter_wall_visible ?? false)
    setSupporterDisplayName(profile?.supporter_display_name ?? '')
  }, [profile])

  useEffect(() => {
    if (!avatarImageFile) {
      setAvatarImagePreviewUrl('')
      return undefined
    }

    const previewUrl = URL.createObjectURL(avatarImageFile)
    setAvatarImagePreviewUrl(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [avatarImageFile])

  useEffect(() => {
    if (!bannerImageFile) {
      setBannerImagePreviewUrl('')
      return undefined
    }

    const previewUrl = URL.createObjectURL(bannerImageFile)
    setBannerImagePreviewUrl(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [bannerImageFile])

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  const isOnline = onlineUserIds.includes(user?.id)
  const viewerRole = isAdmin ? 'admin' : isModerator ? 'moderator' : 'user'
  const currentProfileAvatar = profile?.avatar_icon ?? defaultAvatarIconKey
  const displayedAvatarImageUrl = avatarImagePreviewUrl || avatarImageUrl
  const displayedBannerImageUrl = bannerImagePreviewUrl || bannerImageUrl
  const profileHeroBannerStyle = displayedBannerImageUrl
    ? {
        backgroundImage: `url("${displayedBannerImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined
  const pendingInviteCount = clanInvites.filter((invite) => invite.invitee_user_id === user?.id).length
  const pendingRequestCount = clanJoinRequests.filter((request) => request.user_id === user?.id).length
  const loginStreak = profileLoginStreak(profile)
  const currentLevel = profileLevel(profile)
  const currentXp = profileXpTotal(profile)
  const upcomingStreakReward = nextStreakReward(loginStreak)
  const nextRewardRemaining = upcomingStreakReward ? formatDaysUntilReward(loginStreak, upcomingStreakReward) : 'All avatar badges unlocked'

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

  function handleAvatarImageChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setSaveStatus('')
    setSaveError('')

    if (!file) {
      return
    }

    try {
      validateImageFile(file)
      setAvatarImageFile(file)
      setAvatarUploadProgress(0)
    } catch (validationError) {
      setSaveError(validationError.message)
    }
  }

  function handleBannerImageChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setSaveStatus('')
    setSaveError('')

    if (!file) {
      return
    }

    try {
      validateImageFile(file)
      setBannerImageFile(file)
      setBannerUploadProgress(0)
    } catch (validationError) {
      setSaveError(validationError.message)
    }
  }

  function handleUseIconAvatar() {
    setAvatarImageFile(null)
    setAvatarImageUrl('')
    setAvatarUploadProgress(0)
    setSaveStatus('')
    setSaveError('')
  }

  function handleUseDefaultBanner() {
    setBannerImageFile(null)
    setBannerImageUrl('')
    setBannerUploadProgress(0)
    setSaveStatus('')
    setSaveError('')
  }

  function handleEditBioFromPreview() {
    const identityPanel = document.querySelector('details.profile-identity-panel')
    if (identityPanel && !identityPanel.hasAttribute('open')) {
      identityPanel.setAttribute('open', '')
    }

    window.requestAnimationFrame(() => {
      const bioField = document.getElementById('pf-bio')
      if (!bioField) return
      bioField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      bioField.focus()
    })
  }

  function handleBannerGifSelect({ mediaUrl }) {
    setBannerImageFile(null)
    setBannerImagePreviewUrl('')
    setBannerUploadProgress(0)
    setBannerImageUrl(mediaUrl)
    setSaveStatus('')
    setSaveError('')
    setShowBannerGifPicker(false)
  }

  async function handleSaveProfile(event) {
    event.preventDefault()
    setSaving(true)
    setSaveStatus('')
    setSaveError('')

    if (!canUseAvatarIcon(avatarIcon, viewerRole, loginStreak) && avatarIcon !== currentProfileAvatar) {
      setSaveError(`That avatar is locked: ${getAvatarIconLockLabel(avatarIcon)}.`)
      setSaving(false)
      return
    }

    try {
      let nextAvatarImageUrl = avatarImageUrl
      let nextBannerImageUrl = bannerImageUrl

      if (avatarImageFile) {
        nextAvatarImageUrl = await uploadProfileImage(supabase, avatarImageFile, setAvatarUploadProgress)
      }

      if (bannerImageFile) {
        nextBannerImageUrl = await uploadProfileImage(supabase, bannerImageFile, setBannerUploadProgress)
      }

      await updateProfile({
        displayName,
        bio,
        avatarIcon,
        avatarImageUrl: nextAvatarImageUrl,
        bannerImageUrl: nextBannerImageUrl,
        gameAccounts,
      })
      setAvatarImageFile(null)
      setAvatarImageUrl(nextAvatarImageUrl)
      setBannerImageFile(null)
      setBannerImageUrl(nextBannerImageUrl)
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

  async function handleSaveSupporterPreferences(event) {
    event.preventDefault()
    setSupporterStatus('')
    setSupporterError('')
    setSavingSupporterPrefs(true)

    try {
      await updateSupporterPreferences({
        badgeVisible: supporterBadgeVisible,
        wallVisible: supporterWallVisible,
        displayName: supporterDisplayName,
      })
      setSupporterStatus('Supporter preferences saved.')
    } catch (preferencesError) {
      setSupporterError(preferencesError.message)
    } finally {
      setSavingSupporterPrefs(false)
    }
  }

  return (
    <div className="pb-20">
      <section className="panel mb-6 overflow-hidden rounded-[1.8rem]">
        <div
          className="relative h-44 border-b border-white/10 bg-gradient-to-br from-white/10 via-black/60 to-cyan-400/20 sm:h-64"
          style={profileHeroBannerStyle}
        >
          <input ref={bannerFileInputRef} type="file" accept={imageAcceptValue} onChange={handleBannerImageChange} className="hidden" />
          <div className="absolute right-3 top-3 z-50 flex flex-wrap justify-end gap-2 sm:right-4 sm:top-4">
            <button
              type="button"
              onClick={() => bannerFileInputRef.current?.click()}
              className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 bg-zinc-950/90 px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-100 shadow-lg shadow-black/40 transition hover:border-cyan-300/45 hover:bg-zinc-900 sm:min-h-11"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              Edit Cover
            </button>
            <button
              type="button"
              onClick={() => setShowBannerGifPicker(true)}
              className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 bg-zinc-950/90 px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-100 shadow-lg shadow-black/40 transition hover:border-purple-400/45 hover:bg-zinc-900 sm:min-h-11"
            >
              GIF
            </button>
            {displayedBannerImageUrl ? (
              <button
                type="button"
                onClick={handleUseDefaultBanner}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-zinc-950/90 px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-100 shadow-lg shadow-black/40 transition hover:border-white/10 hover:bg-zinc-900 sm:min-h-11"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Remove Cover
              </button>
            ) : null}
          {showBannerGifPicker ? (
            <GifPickerModal onClose={() => setShowBannerGifPicker(false)} onSelect={handleBannerGifSelect} />
          ) : null}
          </div>
        </div>

        <div className="px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="-mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
              <div className="relative z-20 w-max">
                <ProfileAvatar
                  iconKey={avatarIcon}
                  imageUrl={displayedAvatarImageUrl}
                  online={isOnline}
                  showOnline
                  size="3xl"
                  className="rounded-[2.25rem] bg-[#050608] p-1.5 shadow-2xl shadow-black/70 sm:[&>span:first-child]:h-36 sm:[&>span:first-child]:w-36"
                />
                <input ref={avatarFileInputRef} type="file" accept={imageAcceptValue} onChange={handleAvatarImageChange} className="hidden" />
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-zinc-950 text-gray-100 shadow-lg shadow-black/50 transition hover:border-cyan-300/45 hover:bg-zinc-900"
                  aria-label="Edit profile picture"
                  title="Edit profile picture"
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="min-w-0 pt-1 sm:pb-2">
                <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white sm:text-3xl">
                  <ProfileDisplayName profile={{ ...profile, display_name: displayName }} fallbackName="No name set" />
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <OnlineDot online={isOnline} />
                  <RoleBadge role={profile?.role} compact />
                  <StreakBadge profile={profile} />
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan-100">
                    LV {currentLevel} · {currentXp} XP
                  </span>
                  <SupporterBadge profile={profile} />
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{user?.email}</span>
                </div>
              </div>
            </div>

            <div className="z-20 flex flex-wrap gap-2 sm:justify-end">
              {displayedAvatarImageUrl ? (
                <button
                  type="button"
                  onClick={handleUseIconAvatar}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-300 transition hover:border-white/10 hover:text-gray-100"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Use Icon
                </button>
              ) : null}
            </div>
          </div>

          {(bannerImageFile || avatarImageFile || (saving && (bannerUploadProgress > 0 || avatarUploadProgress > 0))) ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan-100">
              {bannerImageFile ? <span>Cover queued: {bannerImageFile.name}</span> : null}
              {avatarImageFile ? <span>Photo queued: {avatarImageFile.name}</span> : null}
              {saving && bannerUploadProgress > 0 && bannerUploadProgress < 100 ? <span>Cover {bannerUploadProgress}%</span> : null}
              {saving && avatarUploadProgress > 0 && avatarUploadProgress < 100 ? <span>Photo {avatarUploadProgress}%</span> : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleEditBioFromPreview}
            className="mt-4 block w-full rounded-[1.4rem] border border-white/10 bg-black/25 p-4 text-left transition hover:border-white/10 hover:bg-black/40"
            aria-label="Edit bio"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="intel-label">Bio</p>
              <span className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-gray-500">Tap to edit</span>
            </div>
            <p className="max-w-3xl whitespace-pre-wrap text-sm leading-6 text-gray-300">
              {bio.trim() || 'No bio set yet.'}
            </p>
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <form id="profile-form" onSubmit={handleSaveProfile} className="grid gap-5">
          <section className="panel rounded-[1.8rem] p-5">
            <p className="intel-label mb-2">Alerts</p>
            <h2 className="text-xl font-black uppercase tracking-[0.04em] text-white">Phone Notifications</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              Enable push alerts on this device so you catch squad updates without reopening the app.
            </p>

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

          <CollapsiblePanel
            className="profile-identity-panel"
            defaultOpen={false}
            eyebrow="Identity"
            title="Profile Details"
            description="Set the display name and bio your squad sees across the board, chat, and direct messages. Clan membership now lives in Clan HQ."
            meta="Step 1"
          >

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="intel-label">Avatar Badges</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-gray-600">
                      {upcomingStreakReward ? `Next: ${upcomingStreakReward.unlockLabel}` : 'All streak avatars unlocked'}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-400">
                    {upcomingStreakReward ? nextRewardRemaining : 'Maxed'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-10">
                  {avatarIconOptions.map((option) => {
                    const selected = avatarIcon === option.key
                    const earnedByStreak = canUseAvatarIcon(option, viewerRole, loginStreak)
                    const unlocked = earnedByStreak || option.key === currentProfileAvatar
                    const lockLabel = getAvatarIconLockLabel(option)
                    const requiredStreak = avatarStreakRequirement(option.key)

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          if (unlocked) {
                            setAvatarIcon(option.key)
                          }
                        }}
                        title={unlocked ? option.label : `${option.label} · ${lockLabel}`}
                        aria-label={unlocked ? `Use ${option.label} avatar` : `${option.label} avatar locked: ${lockLabel}`}
                        className={`group flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border p-2 transition ${
                          selected
                            ? 'border-white/10 bg-white/5 shadow-[0_0_22px_rgba(99, 102, 241,0.18)]'
                            : unlocked
                              ? 'border-white/10 bg-black/25 hover:border-white/10 hover:bg-white/[0.04]'
                              : 'border-white/10 bg-black/20 opacity-60'
                        }`}
                        aria-disabled={!unlocked}
                      >
                        <div className="relative">
                          <ProfileAvatar iconKey={option.key} size="md" className={!unlocked ? 'saturate-0 brightness-75' : ''} />
                          {!unlocked ? (
                            <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-gray-200 shadow-lg shadow-black/40">
                              <Lock className="h-3 w-3" aria-hidden="true" />
                            </span>
                          ) : null}
                        </div>
                        <span className={`text-center text-[0.56rem] font-black uppercase tracking-[0.1em] ${selected ? 'text-gray-100' : unlocked ? 'text-gray-500 group-hover:text-gray-300' : 'text-gray-500'}`}>
                          {option.label}
                        </span>
                        {requiredStreak ? (
                          <span className={`text-[0.5rem] font-black uppercase tracking-[0.14em] ${unlocked ? 'text-emerald-200/80' : 'text-gray-600'}`}>
                            {earnedByStreak ? 'Earned' : unlocked ? 'Equipped' : `${requiredStreak}D`}
                          </span>
                        ) : !unlocked ? <span className="text-[0.5rem] font-black uppercase tracking-[0.14em] text-gray-600">{lockLabel}</span> : null}
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
                    <div className="flex items-center gap-3">
                      <ClanBadge clan={myClan} size="md" />
                      <p className="text-lg font-black uppercase tracking-[0.04em] text-white">
                        [{myClan.tag}] {myClan.name}
                      </p>
                    </div>
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
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-100 transition hover:bg-white/5"
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
          </CollapsiblePanel>

          <CollapsiblePanel
            defaultOpen={false}
            eyebrow="Accounts"
            title="Game Accounts"
            description="Track every Activision ID you use and keep the shadowban status current for each account."
            meta="Step 2"
          >

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
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-200 hover:bg-white/5"
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
                          className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/10 hover:text-gray-100 disabled:opacity-40"
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
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:border-white/10 hover:text-gray-100 disabled:opacity-40"
                aria-label="Add game account"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </CollapsiblePanel>

        </form>

        <div className="grid content-start gap-5">
          <CollapsiblePanel
            defaultOpen={false}
            eyebrow="Daily Streak"
            title="Daily Ops"
            description="Claim your daily signal, keep the streak alive, level up, and push toward the next badge unlock."
            meta="Step 3"
          >
            <DailyCheckInPanel embedded />
          </CollapsiblePanel>

          <CollapsiblePanel
            defaultOpen={false}
            eyebrow="Support"
            title="Supporter Rewards"
            description="Control whether cosmetic supporter rewards show publicly. Donation rewards never affect intel rank, votes, moderation, or clan access."
            meta="Step 4"
          >

            <form onSubmit={handleSaveSupporterPreferences} className="space-y-4">
              <div className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <HeartHandshake className="h-5 w-5 text-emerald-100" aria-hidden="true" />
                  <div>
                    <p className="text-lg font-black uppercase tracking-[0.04em] text-white">
                      {profile?.supporter_tier === 'none' ? 'No supporter tier' : profile?.supporter_tier}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                      Lifetime {formatDonationAmount(profile?.supporter_lifetime_amount_cents ?? 0)}
                    </p>
                  </div>
                  <SupporterBadge profile={profile} />
                </div>
                <p className="text-sm leading-6 text-gray-400">
                  Supporter badges are cosmetic signals for helping keep the project online.
                </p>
              </div>

              <label className="flex min-h-12 items-center gap-3 rounded-[1.3rem] border border-white/10 bg-black/25 px-4 text-sm font-bold text-gray-300">
                <input
                  type="checkbox"
                  checked={supporterBadgeVisible}
                  onChange={(event) => setSupporterBadgeVisible(event.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                  disabled={!profile?.supporter_badge_enabled}
                />
                Show supporter badge on my profile and messages
              </label>

              <label className="flex min-h-12 items-center gap-3 rounded-[1.3rem] border border-white/10 bg-black/25 px-4 text-sm font-bold text-gray-300">
                <input
                  type="checkbox"
                  checked={supporterWallVisible}
                  onChange={(event) => setSupporterWallVisible(event.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                  disabled={!profile?.supporter_badge_enabled}
                />
                Show me on the supporter wall
              </label>

              <div>
                <label htmlFor="supporter-display-name" className="intel-label mb-2 block">Supporter Wall Name</label>
                <input
                  id="supporter-display-name"
                  value={supporterDisplayName}
                  onChange={(event) => setSupporterDisplayName(event.target.value)}
                  className="field"
                  maxLength="64"
                  placeholder="Leave empty to use profile name"
                  disabled={!profile?.supporter_badge_enabled}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={savingSupporterPrefs || !profile?.supporter_badge_enabled}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  {savingSupporterPrefs ? 'Saving...' : 'Save Reward Privacy'}
                </button>
                <Link
                  to="/support"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/10 hover:text-gray-100"
                >
                  Support Page
                </Link>
              </div>
              {supporterStatus ? <p className="text-sm font-bold text-green-200">{supporterStatus}</p> : null}
              {supporterError ? <p className="text-sm font-bold text-red-200">{supporterError}</p> : null}
            </form>
          </CollapsiblePanel>

          <CollapsiblePanel
            defaultOpen={false}
            eyebrow="Security"
            title="Change Password"
            description="Update your password here without touching the rest of your profile settings."
            meta="Step 6"
          >

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
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/10 hover:text-gray-100 disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  {changingPassword ? 'Updating…' : 'Update Password'}
                </button>
                {passwordStatus ? <p className="mt-3 text-sm font-bold text-green-200">{passwordStatus}</p> : null}
                {passwordError ? <p className="mt-3 text-sm font-bold text-red-200">{passwordError}</p> : null}
              </div>
            </form>
          </CollapsiblePanel>

          <CollapsiblePanel
            defaultOpen={false}
            eyebrow="Session"
            title="Sign Out"
            description="Sign out of this device."
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="intel-label mb-1">Session</p>
                <p className="text-sm font-bold text-gray-400">Sign out of this device</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-200 transition hover:bg-white/5"
              >
                Logout
              </button>
            </div>
          </CollapsiblePanel>
        </div>
      </div>

      {/* Fixed save bar — sits above the mobile bottom nav, always visible */}
      <div
        className="fixed inset-x-0 z-40 border-t border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur-md sm:px-6"
        style={{ bottom: 'var(--mobile-bottom-nav-height, 0px)' }}
      >
        <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-gray-400">don't forget to save -&gt;</p>
            {saveStatus ? <p className="truncate text-sm font-bold text-green-300">{saveStatus}</p> : null}
            {saveError ? <p className="truncate text-sm font-bold text-red-300">{saveError}</p> : null}
          </div>
          <button
            type="submit"
            form="profile-form"
            disabled={saving}
            className="inline-flex shrink-0 min-h-11 items-center justify-center gap-2 rounded-full bg-white/15 px-6 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-white/5 transition hover:bg-white/10 disabled:opacity-60 disabled:shadow-none"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Profile
