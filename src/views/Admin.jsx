import { Crown, Shield } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'

const roleOptions = ['user', 'moderator']

function Admin() {
  const { isAuthenticated, isAdmin, profiles, profile, claimAdmin, setProfileRole } = useIntel()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState('')
  const adminProfile = profiles.find((nextProfile) => nextProfile.role === 'admin')

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
      <PageHeader eyebrow="Admin Screen" title="Role Control">
        You are the only admin. Promote trusted people to moderator or demote them back to user.
      </PageHeader>

      <section className="panel rounded-[1.8rem] p-5">
        <div className="mb-4 flex items-center gap-3">
          <Crown className="h-5 w-5 text-red-200" aria-hidden="true" />
          <div>
            <p className="intel-label">Admin</p>
            <p className="text-sm font-bold text-gray-300">{profile?.display_name || profile?.id}</p>
          </div>
          <RoleBadge role="admin" />
        </div>

        <div className="grid gap-3">
          {profiles.map((nextProfile) => (
            <div
              key={nextProfile.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-lg font-black uppercase tracking-[0.04em] text-white">
                    {nextProfile.display_name || nextProfile.id}
                  </p>
                  <RoleBadge role={nextProfile.role} />
                </div>
                <p className="mt-1 truncate text-xs font-bold text-gray-500">{nextProfile.id}</p>
              </div>

              {nextProfile.role === 'admin' ? (
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-100">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  Locked Admin
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
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
