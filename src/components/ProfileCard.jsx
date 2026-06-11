import { MessageSquare } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { formatEuropeanDateTime } from '../utils/dates.js'
import { profileLevel, profileXpTotal } from '../utils/gamification.js'
import { gameAccountStatusMeta, profileGameAccounts } from '../utils/gameAccounts.js'
import OnlineDot from './OnlineDot.jsx'
import ProfileAvatar from './ProfileAvatar.jsx'
import ProfileDisplayName from './ProfileDisplayName.jsx'
import RoleBadge from './RoleBadge.jsx'
import StreakBadge from './StreakBadge.jsx'
import SupporterBadge from './SupporterBadge.jsx'
import { displayProfileName, isProfileOnline } from '../utils/profiles.js'

function ProfileCard({ profile, onlineUserIds }) {
  const navigate = useNavigate()
  const online = isProfileOnline(profile, onlineUserIds)
  const gameAccounts = profileGameAccounts(profile)
  const previewAccounts = gameAccounts.slice(0, 5)
  const overflowCount = gameAccounts.length - previewAccounts.length
  const bio = profile.bio?.trim()
  const level = profileLevel(profile)
  const xpTotal = profileXpTotal(profile)
  const bannerImageUrl = profile.banner_image_url ?? ''
  const cardStyle = bannerImageUrl
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(5, 6, 8, 0.5), rgba(5, 6, 8, 0.28) 42%, rgba(5, 6, 8, 0.62)), url("${bannerImageUrl}")`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }
    : undefined

  function openProfile() {
    navigate(`/profiles/${profile.id}`)
  }

  function handleKeyDown(event) {
    if (event.target !== event.currentTarget) {
      return
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    openProfile()
  }

  return (
    <article
      className="panel cursor-pointer rounded-[1.5rem] p-4 transition hover:border-white/10 hover:bg-black/35 focus-visible:border-white/10 focus-visible:outline-none"
      style={cardStyle}
      onClick={openProfile}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`Open ${displayProfileName(profile)} profile`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ProfileAvatar profile={profile} online={online} showOnline size="lg" className={bannerImageUrl ? 'rounded-3xl bg-black/70 p-1 shadow-xl shadow-black/50' : ''} />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black uppercase tracking-[0.04em] text-white">
                <ProfileDisplayName profile={profile} />
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <OnlineDot online={online} />
                <RoleBadge role={profile.role} compact />
                <StreakBadge compact profile={profile} />
                <SupporterBadge compact profile={profile} />
                <span className="inline-flex min-h-8 items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan-100 backdrop-blur-sm">
                  LV {level}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Link
          to={`/messages?to=${profile.id}`}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-200 backdrop-blur-sm hover:border-white/10 hover:text-gray-100"
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          DM
        </Link>
      </div>

      <p className={`mt-4 whitespace-pre-wrap text-sm leading-6 ${bannerImageUrl ? 'text-gray-200 drop-shadow-[0_1px_10px_rgba(0,0,0,0.8)]' : 'text-gray-400'}`}>
        {bio || 'No bio set yet.'}
      </p>

      <div className="mt-4 space-y-2">
        {previewAccounts.length ? (
          <>
            {previewAccounts.map((account) => {
              const statusMeta = gameAccountStatusMeta(account)

              return (
                <div key={account.id} className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-xs font-black text-cyan-100 backdrop-blur-sm">
                    {account.id}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                </div>
              )
            })}
            {overflowCount > 0 && (
              <span className="inline-block rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-gray-500">
                +{overflowCount} more — click to view all
              </span>
            )}
          </>
        ) : (
          <span className="rounded-full border border-dashed border-white/10 px-2.5 py-1 text-xs font-bold text-gray-500">
            No game accounts yet
          </span>
        )}
      </div>

      <p className={`mt-4 text-xs font-bold uppercase tracking-[0.16em] ${bannerImageUrl ? 'text-gray-300' : 'text-gray-600'}`}>
        {xpTotal} XP · Last seen {formatEuropeanDateTime(profile.last_seen)}
      </p>
    </article>
  )
}

export default ProfileCard
