import { MessageSquare, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { gameAccountStatusMeta, profileGameAccounts } from '../utils/gameAccounts.js'
import OnlineDot from './OnlineDot.jsx'
import RoleBadge from './RoleBadge.jsx'
import { clanPrefix, displayProfileName, isProfileOnline } from '../utils/profiles.js'

function ProfileCard({ profile, onlineUserIds }) {
  const navigate = useNavigate()
  const online = isProfileOnline(profile, onlineUserIds)
  const gameAccounts = profileGameAccounts(profile)
  const bio = profile.bio?.trim()

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
      className="panel cursor-pointer rounded-[1.5rem] p-4 transition hover:border-red-500/30 hover:bg-black/35 focus-visible:border-red-500/40 focus-visible:outline-none"
      onClick={openProfile}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`Open ${displayProfileName(profile)} profile`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-300">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black uppercase tracking-[0.04em] text-white">
                {clanPrefix(profile)} {displayProfileName(profile)}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <OnlineDot online={online} />
                <RoleBadge role={profile.role} compact />
              </div>
            </div>
          </div>
        </div>

        <Link
          to={`/messages?to=${profile.id}`}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-300 hover:border-red-500/40 hover:text-red-100"
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          DM
        </Link>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-400">
        {bio || 'No bio set yet.'}
      </p>

      <div className="mt-4 space-y-2">
        {gameAccounts.length ? (
          gameAccounts.map((account) => {
            const statusMeta = gameAccountStatusMeta(account)

            return (
              <div key={account.id} className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-xs font-black text-cyan-100">
                  {account.id}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] ${statusMeta.className}`}>
                  {statusMeta.label}
                </span>
              </div>
            )
          })
        ) : (
          <span className="rounded-full border border-dashed border-white/10 px-2.5 py-1 text-xs font-bold text-gray-500">
            No game accounts yet
          </span>
        )}
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-gray-600">
        Last seen {profile.last_seen ? new Date(profile.last_seen).toLocaleString() : 'never'}
      </p>
    </article>
  )
}

export default ProfileCard
