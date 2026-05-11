import { Crown, Search, Shield } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminPushConsole from '../components/AdminPushConsole.jsx'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { clanPrefix, displayProfileName, isProfileOnline } from '../utils/profiles.js'

const roleOptions = ['user', 'moderator']

function Admin() {
  const { isAuthenticated, isAdmin, profiles, profile, onlineUserIds, claimAdmin, setProfileRole } = useIntel()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const adminProfile = profiles.find((nextProfile) => nextProfile.role === 'admin')
  const normalizedQuery = query.trim().toLowerCase()

  const visibleProfiles = useMemo(() => {
    return [...profiles]
      .filter((nextProfile) => {
        const matchesRole = roleFilter === 'all' || nextProfile.role === roleFilter
        const matchesQuery =
          !normalizedQuery ||
          displayProfileName(nextProfile).toLowerCase().includes(normalizedQuery) ||
          nextProfile.clan_tag?.toLowerCase().includes(normalizedQuery) ||
          nextProfile.activision_ids?.some((id) => id.toLowerCase().includes(normalizedQuery))

        return matchesRole && matchesQuery
      })
      .sort((first, second) => {
        return (
          Number(isProfileOnline(second, onlineUserIds)) - Number(isProfileOnline(first, onlineUserIds)) ||
          displayProfileName(first).localeCompare(displayProfileName(second))
        )
      })
  }, [normalizedQuery, onlineUserIds, profiles, roleFilter])

  const stats = useMemo(
    () => ({
      total: profiles.length,
      online: profiles.filter((nextProfile) => isProfileOnline(nextProfile, onlineUserIds)).length,
      moderators: profiles.filter((nextProfile) => nextProfile.role === 'moderator').length,
      incomplete: profiles.filter(
        (nextProfile) => !nextProfile.clan_tag?.trim() || !nextProfile.activision_ids?.length,
      ).length,
    }),
    [onlineUserIds, profiles],
  )

  async function handleClaimAdmin() {
    setStatus('')
    setError('')
    setWorkingId('claim')

    try {
      await claimAdmin()
      setStatus('Admin claimed. You now control moderator access.')
    } catch (claimError) {
      setError(claimError.message)
    } finally {
      setWorkingId('')
    }
  }

  async function handleRoleChange(userId, nextRole) {
    setStatus('')
    setError('')
    setWorkingId(userId)

    try {
      await setProfileRole(userId, nextRole)
      setStatus('Role updated.')
    } catch (roleError) {
      setError(roleError.message)
    } finally {
      setWorkingId('')
    }
  }

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader eyebrow="Admin Login" title="Admin Access">
          Login first, then claim admin if this is the first admin account.
        </PageHeader>
        <Link
          to="/auth"
          className="inline-flex min-h-11 items-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100"
        >
          Login
        </Link>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div>
        <PageHeader eyebrow="Admin Login" title="Claim Admin">
          There can only be one admin. If no admin exists yet, claim it here while logged in as your account.
        </PageHeader>
        <section className="panel rounded-[1.8rem] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="intel-label mb-2">Current Admin</p>
              {adminProfile ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xl font-black uppercase tracking-[0.04em] text-white">
                    {adminProfile.display_name || adminProfile.id}
                  </p>
                  <RoleBadge role="admin" />
                </div>
              ) : (
                <p className="text-sm font-bold text-gray-400">No admin has claimed the role yet.</p>
              )}
            </div>

            {!adminProfile ? (
              <button
                type="button"
                onClick={handleClaimAdmin}
                disabled={workingId === 'claim'}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                <Crown className="h-4 w-4" aria-hidden="true" />
                {workingId === 'claim' ? 'Claiming' : 'Claim Admin'}
              </button>
            ) : null}
          </div>
          {status ? <p className="mt-4 text-sm font-bold text-green-200">{status}</p> : null}
          {error ? <p className="mt-4 text-sm font-bold text-red-200">{error}</p> : null}
        </section>
      </div>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="Admin Screen" title="Command Center">
        Send tactical push alerts, watch subscriber coverage, and control moderator access.
      </PageHeader>

      <AdminPushConsole />

      <section className="panel rounded-[1.8rem] p-5">
        <div className="mb-4 flex items-center gap-3">
          <Crown className="h-5 w-5 text-red-200" aria-hidden="true" />
          <div>
            <p className="intel-label">Admin</p>
            <p className="text-sm font-bold text-gray-300">{profile?.display_name || profile?.id}</p>
          </div>
          <RoleBadge role="admin" />
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center">
            <p className="text-xl font-black text-white">{stats.total}</p>
            <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">Profiles</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center">
            <p className="text-xl font-black text-white">{stats.online}</p>
            <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">Online</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center">
            <p className="text-xl font-black text-white">{stats.moderators}</p>
            <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">Moderators</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center">
            <p className="text-xl font-black text-white">{stats.incomplete}</p>
            <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">Incomplete</p>
          </div>
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-red-200" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field min-h-12 pl-11"
              placeholder="Search name, clan, or Activision ID"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'user', 'moderator', 'admin'].map((nextRole) => (
              <button
                key={nextRole}
                type="button"
                onClick={() => setRoleFilter(nextRole)}
                className={`rounded-full border px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] transition ${
                  roleFilter === nextRole
                    ? 'border-red-500/50 bg-red-500/12 text-red-100'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
                }`}
              >
                {nextRole}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {visibleProfiles.map((nextProfile) => (
            <div
              key={nextProfile.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <OnlineDot online={isProfileOnline(nextProfile, onlineUserIds)} label={false} />
                  <p className="truncate text-lg font-black uppercase tracking-[0.04em] text-white">
                    {clanPrefix(nextProfile)} {displayProfileName(nextProfile)}
                  </p>
                  <RoleBadge role={nextProfile.role} />
                  {!nextProfile.clan_tag?.trim() || !nextProfile.activision_ids?.length ? (
                    <span className="rounded-full border border-orange-400/40 bg-orange-400/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-orange-100">
                      Incomplete
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-gray-400">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    Clan {nextProfile.clan_tag?.trim() || 'none'}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    IDs {nextProfile.activision_ids?.length || 0}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    Seen {nextProfile.last_seen ? new Date(nextProfile.last_seen).toLocaleString() : 'never'}
                  </span>
                </div>
                <p className="mt-2 truncate text-xs font-bold text-gray-500">{nextProfile.id}</p>
              </div>

              {nextProfile.role === 'admin' ? (
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-100">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  Locked Admin
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/messages?to=${nextProfile.id}`}
                    className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/20"
                  >
                    DM
                  </Link>
                  {roleOptions.map((nextRole) => (
                    <button
                      key={nextRole}
                      type="button"
                      onClick={() => handleRoleChange(nextProfile.id, nextRole)}
                      disabled={workingId === nextProfile.id || nextProfile.role === nextRole}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-red-500/40 hover:text-red-100 disabled:opacity-40"
                    >
                      {nextRole}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {status ? <p className="mt-4 text-sm font-bold text-green-200">{status}</p> : null}
        {error ? <p className="mt-4 text-sm font-bold text-red-200">{error}</p> : null}
      </section>
    </div>
  )
}

export default Admin
