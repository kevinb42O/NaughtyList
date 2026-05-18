import { Crown, Search, Shield, Trash2, UserX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminDonationConsole from '../components/AdminDonationConsole.jsx'
import AdminPushConsole from '../components/AdminPushConsole.jsx'
import EditPlayerModal from '../components/EditPlayerModal.jsx'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { formatEuropeanDateTime } from '../utils/dates.js'
import { clanPrefix, displayProfileName, isProfileOnline } from '../utils/profiles.js'
import { getThreatStyle } from '../utils/threat.js'

const roleOptions = ['user', 'moderator']

function Admin() {
  const {
    isAuthenticated,
    isAdmin,
    profiles,
    profile,
    players,
    onlineUserIds,
    claimAdmin,
    setProfileRole,
    deletePlayer,
    deleteProfileAccount,
  } = useIntel()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
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

  const visiblePlayers = useMemo(() => {
    return players.filter((player) => {
      if (!normalizedQuery) {
        return true
      }

      return [player.name, player.clan, player.notes, ...(player.tags ?? [])]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [normalizedQuery, players])

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

  async function handleDeletePlayer(playerId) {
    const targetPlayer = players.find((player) => player.id === playerId)
    const label = targetPlayer?.name || 'this operator'

    if (!window.confirm(`Delete tracked operator ${label}?`)) {
      return
    }

    setStatus('')
    setError('')
    setWorkingId(`player-${playerId}`)

    try {
      await deletePlayer(playerId)
      setStatus('Tracked operator deleted.')
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setWorkingId('')
    }
  }

  async function handleEditPlayer(player) {
    setEditingPlayer(player)
    setEditModalOpen(true)
  }

  function closeEditModal() {
    setEditingPlayer(null)
    setEditModalOpen(false)
  }

  async function handleDeleteAccount(userId) {
    const targetProfile = profiles.find((nextProfile) => nextProfile.id === userId)
    const label = displayProfileName(targetProfile)

    if (!window.confirm(`Delete account ${label}? This removes their login, profile, chat, DMs, votes, and push subscriptions.`)) {
      return
    }

    setStatus('')
    setError('')
    setWorkingId(`account-${userId}`)

    try {
      await deleteProfileAccount(userId)
      setStatus('Account deleted.')
    } catch (deleteError) {
      setError(deleteError.message)
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
        Send tactical push alerts, manage tracked operators, and control account access.
      </PageHeader>

      <AdminPushConsole />

      <AdminDonationConsole />

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

        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-red-200" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field min-h-12 pl-11"
              placeholder="Search operators, profiles, clans, or IDs"
            />
          </div>
          <Link
            to="/moderator"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-orange-100 transition hover:bg-orange-400/20"
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
            Mod Queue
          </Link>
        </div>

        <div className="mb-4 border-b border-white/10 pb-4">
          <p className="intel-label mb-2">Tracked Operators</p>
          <p className="text-sm text-gray-500">Admins can remove fake, duplicate, or stale operator records here.</p>
        </div>

        <div className="mb-6 grid gap-3">
          {visiblePlayers.length ? (
            visiblePlayers.map((player, index) => {
              const threat = getThreatStyle(player.threatLevel)

              return (
                <article
                  key={player.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-gray-700 px-2 py-0.5 text-xs font-black text-gray-400">
                        #{index + 1}
                      </span>
                      <p className="truncate text-lg font-black uppercase tracking-[0.04em] text-white">
                        {player.clan ? <span className="text-gray-400">[{player.clan}] </span> : null}
                        {player.name}
                      </p>
                      <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] ${threat.badge}`}>
                        {threat.label}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">
                        Trust {player.trustScore}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-500">{player.notes || 'No notes.'}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditPlayer(player)}
                      disabled={workingId === `edit-${player.id}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-orange-500/50 bg-orange-500/12 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-orange-100 transition hover:bg-orange-500/20 disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlayer(player.id)}
                      disabled={workingId === `player-${player.id}`}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {workingId === `player-${player.id}` ? 'Deleting' : 'Delete'}
                    </button>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
              No tracked operators match the current search.
            </div>
          )}
        </div>

        <div className="mb-4 border-b border-white/10 pb-4">
          <p className="intel-label mb-2">Accounts</p>
          <p className="text-sm text-gray-500">Promote moderators or remove accounts that should no longer have access.</p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
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
                    Seen {formatEuropeanDateTime(nextProfile.last_seen)}
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
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(nextProfile.id)}
                    disabled={workingId === `account-${nextProfile.id}`}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    <UserX className="h-4 w-4" aria-hidden="true" />
                    {workingId === `account-${nextProfile.id}` ? 'Deleting' : 'Delete Account'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {status ? <p className="mt-4 text-sm font-bold text-green-200">{status}</p> : null}
        {error ? <p className="mt-4 text-sm font-bold text-red-200">{error}</p> : null}
      </section>

      <EditPlayerModal open={editModalOpen} onClose={closeEditModal} player={editingPlayer} />
    </div>
  )
}

export default Admin
