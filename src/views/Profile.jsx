import { KeyRound, Plus, Save, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { supabase } from '../lib/supabase.js'
import { clanPrefix } from '../utils/profiles.js'

function Profile() {
  const { isAuthenticated, user, profile, onlineUserIds, updateProfile } = useIntel()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [clanTag, setClanTag] = useState(profile?.clan_tag ?? '')
  const [activisionIds, setActivisionIds] = useState(profile?.activision_ids ?? [])
  const [newId, setNewId] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [saveError, setSaveError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState('')
  const [passwordError, setPasswordError] = useState('')

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  const isOnline = onlineUserIds.includes(user?.id)

  function addActivisionId() {
    const trimmed = newId.trim()
    if (!trimmed || activisionIds.includes(trimmed)) {
      return
    }
    setActivisionIds([...activisionIds, trimmed])
    setNewId('')
  }

  function removeActivisionId(id) {
    setActivisionIds(activisionIds.filter((existing) => existing !== id))
  }

  async function handleSaveProfile(event) {
    event.preventDefault()
    setSaving(true)
    setSaveStatus('')
    setSaveError('')
    try {
      await updateProfile({ displayName, clanTag, activisionIds })
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

  return (
    <div>
      <PageHeader eyebrow="Settings" title="My Profile">
        Update your display name, clan tag, Activision IDs, and password.
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
              <p className="intel-label mb-2">Activision IDs</p>
              <div className="space-y-2">
                {activisionIds.map((id) => (
                  <div key={id} className="flex items-center gap-2">
                    <span className="flex-1 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 font-mono text-sm text-cyan-100">
                      {id}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeActivisionId(id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                      aria-label={`Remove ${id}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addActivisionId())}
                  className="field flex-1"
                  placeholder="Add Activision ID"
                  maxLength="64"
                />
                <button
                  type="button"
                  onClick={addActivisionId}
                  disabled={!newId.trim()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:border-red-500/40 hover:text-red-100 disabled:opacity-40"
                  aria-label="Add ID"
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
