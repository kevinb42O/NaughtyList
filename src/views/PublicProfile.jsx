import { ArrowLeft, MessageSquare, Settings, UserRound } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { gameAccountStatusMeta, profileGameAccounts } from '../utils/gameAccounts.js'
import { clanPrefix, displayProfileName, isProfileOnline } from '../utils/profiles.js'

function PublicProfile() {
  const { profileId } = useParams()
  const { isAuthenticated, loading, onlineUserIds, profiles, user } = useIntel()

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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Operator Profile" title={`${clanPrefix(profile)} ${displayProfileName(profile)}`}>
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

      <section className="panel rounded-[1.8rem] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-gray-300">
            <UserRound className="h-8 w-8" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white sm:text-3xl">
                {clanPrefix(profile)} {displayProfileName(profile)}
              </h2>
              <OnlineDot online={online} />
              <RoleBadge role={profile.role} compact />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300">
                {gameAccounts.length} linked account{gameAccounts.length === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300">
                Last seen {profile.last_seen ? new Date(profile.last_seen).toLocaleString() : 'never'}
              </span>
            </div>

            <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
              <p className="intel-label mb-2">Bio</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">{bio || 'No bio set yet.'}</p>
            </div>
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

                return (
                  <div key={`${account.id}-${index}`} className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-black text-cyan-100">
                        {account.id}
                      </span>
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
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default PublicProfile