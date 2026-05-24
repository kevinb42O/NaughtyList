import { ArrowLeft, Check, Copy, MessageSquare, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import ProfileDisplayName from '../components/ProfileDisplayName.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import StreakBadge from '../components/StreakBadge.jsx'
import SupporterBadge from '../components/SupporterBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { formatEuropeanDateTime } from '../utils/dates.js'
import { levelProgress, profileLevel, profileXpTotal } from '../utils/gamification.js'
import { gameAccountStatusMeta, profileGameAccounts } from '../utils/gameAccounts.js'
import { clanPrefix, displayProfileName, isProfileOnline } from '../utils/profiles.js'
import { profileLoginStreak, profileLongestLoginStreak } from '../utils/streaks.js'

function PublicProfile() {
  const { profileId } = useParams()
  const { isAuthenticated, loading, onlineUserIds, profiles, user } = useIntel()
  const [copiedAccountId, setCopiedAccountId] = useState('')

  const profile = profiles.find((nextProfile) => nextProfile.id === profileId)

  if (!profileId) {
    return <Navigate to="/profiles" replace />
  }

  if (loading && !profile) {
    return (
      <div>
        <PageHeader eyebrow="Operator Profile" title="Loading Profile">
          Pulling operator details from the roster.
        </PageHeader>
      </div>
    )
  }

  if (!profile) {
    return (
      <div>
        <PageHeader eyebrow="Operator Profile" title="Profile Not Found">
          That operator is not in the current roster.
        </PageHeader>
        <Link
          to="/profiles"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-200 hover:border-red-500/40 hover:text-red-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Team
        </Link>
      </div>
    )
  }

  const online = isProfileOnline(profile, onlineUserIds)
  const gameAccounts = profileGameAccounts(profile)
  const bio = profile.bio?.trim()
  const viewingOwnProfile = user?.id === profile.id
  const loginStreak = profileLoginStreak(profile)
  const longestLoginStreak = profileLongestLoginStreak(profile)
  const level = profileLevel(profile)
  const xpTotal = profileXpTotal(profile)
  const levelState = levelProgress(profile)
  const bannerImageUrl = profile.banner_image_url ?? ''
  const profileHeroBannerStyle = bannerImageUrl
    ? {
        backgroundImage: `url("${bannerImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined

  async function copyGameAccountId(accountId) {
    await navigator.clipboard.writeText(accountId)
    setCopiedAccountId(accountId)
    window.setTimeout(() => {
      setCopiedAccountId((currentId) => (currentId === accountId ? '' : currentId))
    }, 1800)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Operator Profile"
        title={`${clanPrefix(profile)} ${displayProfileName(profile)}`}
        titleLead="Operator"
        titleRest={`${clanPrefix(profile)} ${displayProfileName(profile)}`}
      >
        Review operator details before you squad up, message them, or check which account they are running.
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/profiles"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-200 hover:border-red-500/40 hover:text-red-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Team
        </Link>

        <div className="flex flex-wrap gap-2">
          {viewingOwnProfile ? (
            <Link
              to="/profile"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Edit My Profile
            </Link>
          ) : isAuthenticated ? (
            <Link
              to={`/messages?to=${profile.id}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Direct Message
            </Link>
          ) : null}
        </div>
      </div>

      <section className="panel overflow-hidden rounded-[1.8rem]">
        <div
          className="relative h-44 border-b border-white/10 bg-gradient-to-br from-red-500/20 via-black/60 to-cyan-400/20 sm:h-64"
          style={profileHeroBannerStyle}
        />

        <div className="px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="-mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
              <ProfileAvatar
                profile={profile}
                online={online}
                showOnline
                size="3xl"
                className="rounded-[2.25rem] bg-[#050608] p-1.5 shadow-2xl shadow-black/70 sm:[&>span:first-child]:h-36 sm:[&>span:first-child]:w-36"
              />

              <div className="min-w-0 flex-1 pt-1 sm:pb-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white sm:text-3xl">
                    <ProfileDisplayName profile={profile} />
                  </h2>
                  <OnlineDot online={online} />
                  <RoleBadge role={profile.role} compact />
                  <StreakBadge profile={profile} />
                  <SupporterBadge profile={profile} />
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan-100">
                    LV {level}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300">
                    {gameAccounts.length} linked account{gameAccounts.length === 1 ? '' : 's'}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300">
                    Last seen {formatEuropeanDateTime(profile.last_seen)}
                  </span>
                  <span className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-100">
                    {loginStreak} day streak
                  </span>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-cyan-100">
                    {xpTotal} XP
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-white/10 bg-black/30 px-4 py-2 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-400">
              {bannerImageUrl ? 'Custom banner' : 'Default banner'}
            </div>
          </div>

          <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
            <p className="intel-label mb-2">Bio</p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">{bio || 'No bio set yet.'}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)]">
        <section className="panel rounded-[1.8rem] p-5 sm:p-6">
          <p className="intel-label mb-4">Game Accounts</p>

          {gameAccounts.length ? (
            <div className="space-y-3">
              {gameAccounts.map((account, index) => {
                const statusMeta = gameAccountStatusMeta(account)
                const copied = copiedAccountId === account.id

                return (
                  <div key={`${account.id}-${index}`} className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-black text-cyan-100">
                        {account.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyGameAccountId(account.id)}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/20"
                        aria-label={`Copy Activision ID ${account.id}`}
                      >
                        {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    {account.shadowbanDate ? (
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                        Updated {new Date(account.shadowbanDate).toLocaleDateString()}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
              No linked game accounts yet.
            </div>
          )}
        </section>

        <aside className="grid gap-3">
          <section className="panel rounded-[1.8rem] p-5">
            <p className="intel-label mb-3">Profile Intel</p>
            <div className="grid gap-3">
              <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Clan Tag</p>
                <p className="mt-2 text-lg font-black text-white">{profile.clan_tag?.trim() || 'No clan tag'}</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Joined</p>
                <p className="mt-2 text-lg font-black text-white">{new Date(profile.created_at).toLocaleDateString()}</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Last Updated</p>
                <p className="mt-2 text-lg font-black text-white">
                  {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Best Streak</p>
                <p className="mt-2 text-lg font-black text-white">{longestLoginStreak} days</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Level Progress</p>
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">LV {level}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-cyan-300/90" style={{ width: `${levelState.progressPercent}%` }} />
                </div>
                <p className="mt-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-500">
                  {levelState.neededForNext} XP to next
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default PublicProfile
