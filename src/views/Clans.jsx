/* eslint-disable react-hooks/set-state-in-effect */
import { Check, Crown, Eye, LogIn, MessageSquare, Search, Settings, Shield, Star, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ClanBadge from '../components/ClanBadge.jsx'
import { clanBadgeIconOptions, defaultClanBadgeIconKey, getClanBadgeIconOption } from '../components/ProfileAvatar.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useIntel } from '../context/useIntel.js'
import { clanPrefix, displayProfileName } from '../utils/profiles.js'

function roleBadgeTone(role) {
  if (role === 'owner') {
    return 'border-yellow-400/40 bg-yellow-400/10 text-yellow-100'
  }

  if (role === 'officer') {
    return 'border-orange-400/40 bg-orange-400/10 text-orange-100'
  }

  if (role === 'veteran') {
    return 'border-sky-400/40 bg-sky-400/10 text-sky-100'
  }

  if (role === 'sergeant') {
    return 'border-teal-400/40 bg-teal-400/10 text-teal-100'
  }

  if (role === 'recruit') {
    return 'border-white/5 bg-white/[0.03] text-gray-500'
  }

  return 'border-white/10 bg-white/5 text-gray-300'
}

function RolePill({ role }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] ${roleBadgeTone(role)}`}>
      {role}
    </span>
  )
}

function SectionCard({ children, className = '' }) {
  return <section className={`panel rounded-[1.8rem] p-5 ${className}`.trim()}>{children}</section>
}

function Clans() {
  const {
    isAdmin,
    isAuthenticated,
    user,
    profile,
    profiles,
    clanDirectory,
    myClan,
    myClanRole,
    myClanMembers,
    clanJoinRequests,
    clanInvites,
    createClan,
    requestClanJoin,
    cancelClanJoinRequest,
    approveClanJoinRequest,
    rejectClanJoinRequest,
    inviteClanMember,
    acceptClanInvite,
    declineClanInvite,
    removeClanMember,
    leaveClan,
    updateClanMemberRole,
    transferClanOwnership,
    updateClan,
    archiveClan,
    fetchClanMessages,
    fetchClanMembers,
  } = useIntel()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [workingKey, setWorkingKey] = useState('')
  const [directoryQuery, setDirectoryQuery] = useState('')

  const [createName, setCreateName] = useState('')
  const [createTag, setCreateTag] = useState('')
  const [createDescription, setCreateDescription] = useState('')

  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [adminClanId, setAdminClanId] = useState('')
  const [clanBadgeIcon, setClanBadgeIcon] = useState(defaultClanBadgeIconKey)
  const [utilitiesOpen, setUtilitiesOpen] = useState(false)
  const [adminClanState, setAdminClanState] = useState({
    clanId: '',
    members: [],
    messages: [],
    error: '',
    loading: false,
  })
  const myClanId = myClan?.id ?? ''

  const canManageClan = Boolean(myClan && (isAdmin || myClanRole === 'owner' || myClanRole === 'officer'))
  const canEditClan = Boolean(myClan && (isAdmin || myClanRole === 'owner'))

  const myPendingInvites = useMemo(() => {
    return clanInvites.filter((invite) => invite.invitee_user_id === user?.id)
  }, [clanInvites, user?.id])

  const myPendingRequests = useMemo(() => {
    return clanJoinRequests.filter((request) => request.user_id === user?.id)
  }, [clanJoinRequests, user?.id])

  const myClanPendingRequests = useMemo(() => {
    return clanJoinRequests.filter((request) => request.clan_id === myClanId)
  }, [clanJoinRequests, myClanId])

  const myClanPendingInvites = useMemo(() => {
    return clanInvites.filter((invite) => invite.clan_id === myClanId)
  }, [clanInvites, myClanId])

  const inviteOptions = useMemo(() => {
    const memberIds = new Set(myClanMembers.map((member) => member.user_id))
    const pendingInviteIds = new Set(myClanPendingInvites.map((invite) => invite.invitee_user_id))

    return [...profiles]
      .filter((nextProfile) => nextProfile.id !== user?.id)
      .filter((nextProfile) => !memberIds.has(nextProfile.id) && !pendingInviteIds.has(nextProfile.id))
      .sort((first, second) => displayProfileName(first).localeCompare(displayProfileName(second)))
  }, [myClanMembers, myClanPendingInvites, profiles, user?.id])

  const sortedDirectory = useMemo(() => {
    return [...clanDirectory].sort((first, second) => {
      return second.memberCount - first.memberCount || first.name.localeCompare(second.name)
    })
  }, [clanDirectory])
  const visibleDirectory = useMemo(() => {
    const normalizedQuery = directoryQuery.trim().toLowerCase()
    if (!normalizedQuery) return sortedDirectory

    return sortedDirectory.filter((clan) => {
      return [clan.name, clan.tag, clan.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [directoryQuery, sortedDirectory])
  const directoryMemberTotal = useMemo(() => {
    return sortedDirectory.reduce((total, clan) => total + clan.memberCount, 0)
  }, [sortedDirectory])
  const adminSelectedClan = useMemo(() => {
    if (!isAdmin || !adminClanId) return null
    return sortedDirectory.find((clan) => clan.id === adminClanId) ?? null
  }, [adminClanId, isAdmin, sortedDirectory])
  const adminClanLoading = Boolean(adminSelectedClan?.id && adminClanState.loading)

  useEffect(() => {
    let cancelled = false

    if (!isAdmin || !adminSelectedClan?.id) {
      return undefined
    }

    setAdminClanState({
      clanId: adminSelectedClan.id,
      members: [],
      messages: [],
      error: '',
      loading: true,
    })

    Promise.all([
      fetchClanMembers(adminSelectedClan.id),
      fetchClanMessages(adminSelectedClan.id),
    ])
      .then(([nextMembers, nextMessages]) => {
        if (!cancelled) {
          setAdminClanState({
            clanId: adminSelectedClan.id,
            members: nextMembers,
            messages: nextMessages,
            error: '',
            loading: false,
          })
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setAdminClanState({
            clanId: adminSelectedClan.id,
            members: [],
            messages: [],
            error: nextError.message,
            loading: false,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [adminSelectedClan?.id, fetchClanMembers, fetchClanMessages, isAdmin])

  useEffect(() => {
    if (!utilitiesOpen) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setUtilitiesOpen(false)
      }
    }

    const previousBodyOverflow = document.body.style.overflow
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior

    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [utilitiesOpen])

  useEffect(() => {
    setClanBadgeIcon(myClan?.badge_icon ?? defaultClanBadgeIconKey)
  }, [myClan?.badge_icon, myClan?.id, utilitiesOpen])

  async function runAction(key, successMessage, action) {
    setWorkingKey(key)
    setStatus('')
    setError('')

    try {
      await action()
      setStatus(successMessage)
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setWorkingKey('')
    }
  }

  async function handleCreateClan(event) {
    event.preventDefault()

    await runAction('create-clan', 'Clan created.', async () => {
      await createClan({
        name: createName,
        tag: createTag,
        description: createDescription,
      })
      setCreateName('')
      setCreateTag('')
      setCreateDescription('')
    })
  }

  async function handleSaveClan(event) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    await runAction('save-clan', 'Clan profile updated.', async () => {
      await updateClan(myClan.id, {
        name: String(formData.get('name') ?? ''),
        tag: String(formData.get('tag') ?? ''),
        description: String(formData.get('description') ?? ''),
        badgeIcon: String(formData.get('badgeIcon') ?? defaultClanBadgeIconKey),
      })
      setUtilitiesOpen(false)
    })
  }

  async function handleInviteMember(event) {
    event.preventDefault()

    if (!inviteUserId) {
      return
    }

    await runAction(`invite-${inviteUserId}`, 'Invite sent.', async () => {
      await inviteClanMember(myClan.id, inviteUserId, inviteMessage)
      setInviteUserId('')
      setInviteMessage('')
    })
  }

  async function handleArchiveClan() {
    if (!window.confirm(`Archive clan ${myClan.name}? This removes every active membership and closes the room.`)) {
      return
    }

    await runAction('archive-clan', 'Clan archived.', async () => {
      await archiveClan(myClan.id)
      setUtilitiesOpen(false)
    })
  }

  async function handleLeaveClan() {
    if (!window.confirm(`Leave ${myClan.name}?`)) {
      return
    }

    await runAction('leave-clan', 'You left the clan.', async () => {
      await leaveClan(myClan.id)
      setUtilitiesOpen(false)
    })
  }

  const directoryPanel = (
    <SectionCard>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <UsersRound className="h-5 w-5 text-red-200" aria-hidden="true" />
          <div>
            <p className="intel-label">Clan Directory</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">
                {sortedDirectory.length} clans
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">
                {directoryMemberTotal} members
              </span>
            </div>
          </div>
        </div>
        <label htmlFor="clan-directory-search" className="relative block sm:min-w-64">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-red-200" aria-hidden="true" />
          <input
            id="clan-directory-search"
            type="search"
            aria-label="Search clans"
            value={directoryQuery}
            onChange={(event) => setDirectoryQuery(event.target.value)}
            className="field min-h-11 pl-11 text-sm"
            placeholder="Search clans"
          />
        </label>
      </div>

      {visibleDirectory.length ? (
        <div className="space-y-3">
          {visibleDirectory.map((clan) => {
            const pendingInvite = clan.has_pending_invite
            const pendingRequest = clan.has_pending_request
            const isSelectedByAdmin = adminSelectedClan?.id === clan.id

            return (
              <article key={clan.id} className={`rounded-2xl border bg-black/25 p-4 ${isSelectedByAdmin ? 'border-red-500/40' : 'border-white/10'}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <ClanBadge clan={clan} size="md" className="mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black uppercase tracking-[0.04em] text-white">
                          [{clan.tag}] {clan.name}
                        </h3>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">
                          {clan.memberCount} members
                        </span>
                        {clan.is_member ? (
                          <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-red-100">
                            Yours
                          </span>
                        ) : null}
                      </div>
                      {clan.description ? (
                        <p className="mt-2 text-sm leading-6 text-gray-400">{clan.description}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => setAdminClanId(clan.id)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-400/20"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        {isSelectedByAdmin ? 'Viewing' : 'Inspect'}
                      </button>
                    ) : null}

                    {isAuthenticated && !myClan ? (
                      pendingInvite ? (
                        <span className="rounded-full border border-green-500/40 bg-green-500/10 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-green-100">
                          Invite Ready
                        </span>
                      ) : pendingRequest ? (
                        <span className="rounded-full border border-orange-400/40 bg-orange-400/10 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-orange-100">
                          Pending
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            runAction(`request-join-${clan.id}`, 'Join request sent.', () => requestClanJoin(clan.id))
                          }
                          disabled={workingKey === `request-join-${clan.id}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-full border border-red-500/50 bg-red-500/12 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                        >
                          Request Access
                        </button>
                      )
                    ) : null}

                    {!isAuthenticated ? (
                      <Link
                        to="/auth"
                        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white"
                      >
                        <LogIn className="h-4 w-4" aria-hidden="true" />
                        Login
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
          {sortedDirectory.length ? 'No clans match.' : 'No clans yet.'}
        </p>
      )}
    </SectionCard>
  )

  const adminInspector = isAdmin ? (
    <SectionCard>
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="intel-label mb-2">Admin Clan Inspect</p>
          {adminSelectedClan ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <ClanBadge clan={adminSelectedClan} size="lg" />
                <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
                  [{adminSelectedClan.tag}] {adminSelectedClan.name}
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                {adminSelectedClan.description || 'No clan description yet.'}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
                Select a clan to inspect
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Pick Inspect on a directory row or use the dropdown. Clan interiors do not load until selected.
              </p>
            </>
          )}
        </div>
        <div className="grid gap-2 sm:min-w-72">
          <label htmlFor="admin-clan-select" className="intel-label">
            Open Clan
          </label>
          <select
            id="admin-clan-select"
            value={adminSelectedClan?.id ?? ''}
            onChange={(event) => setAdminClanId(event.target.value)}
            className="field min-h-11 text-sm font-black uppercase tracking-[0.12em]"
          >
            <option value="">Choose a clan</option>
            {sortedDirectory.map((clan) => (
              <option key={clan.id} value={clan.id}>
                [{clan.tag}] {clan.name} ({clan.memberCount})
              </option>
            ))}
          </select>
        </div>
      </div>

      {adminClanState.error ? <p className="mb-4 text-sm font-bold text-red-200">{adminClanState.error}</p> : null}

      {!adminSelectedClan ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-4 text-sm font-bold text-gray-500">
          No clan selected.
        </p>
      ) : adminClanLoading ? (
        <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm font-bold text-gray-500">
          Loading clan interior...
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="intel-label">Roster</p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">
                {adminSelectedClan.memberCount}
              </span>
            </div>
            <div className="space-y-2">
              {adminClanState.members.length ? adminClanState.members.map((member) => (
                <article key={member.user_id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black uppercase tracking-[0.06em] text-white">
                      {displayProfileName(member.profile)}
                    </p>
                    <RolePill role={member.role} />
                  </div>
                  <p className="mt-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-gray-600">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </article>
              )) : (
                <p className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-3 text-sm font-bold text-gray-500">
                  No roster rows visible.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="intel-label mb-3">Recent Chat</p>
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
              {adminClanState.messages.length ? adminClanState.messages.slice(-20).map((message) => (
                <article key={message.id} className="rounded-xl bg-white/[0.04] p-3">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-gray-500">
                    {clanPrefix(message.profile)} {displayProfileName(message.profile)}
                  </p>
                  <p className={`mt-1 whitespace-pre-wrap text-sm leading-6 ${message.deleted_at ? 'italic text-gray-600' : 'text-gray-300'}`}>
                    {message.deleted_at ? 'Message removed.' : message.body}
                  </p>
                </article>
              )) : (
                <p className="text-sm font-bold text-gray-500">No clan messages visible.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  ) : null

  const transferCandidates = myClanMembers.filter((member) => member.role !== 'owner' && member.user_id !== user?.id)

  const utilitiesDrawer = isAuthenticated && myClan && utilitiesOpen ? (
    <div className="fixed inset-0 z-50 flex h-[100dvh] max-h-[100dvh] justify-end overflow-hidden bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Clan utilities">
      <button
        type="button"
        aria-label="Close clan utilities"
        className="absolute inset-0 cursor-default"
        onClick={() => setUtilitiesOpen(false)}
      />
      <aside className="relative z-10 h-[100dvh] max-h-[100dvh] w-full max-w-xl overflow-y-auto overscroll-contain border-l border-white/10 bg-gray-950 shadow-2xl shadow-black/60 [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">
        <div className="min-h-full p-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="intel-label mb-2">Utilities</p>
            <div className="flex flex-wrap items-center gap-3">
              <ClanBadge clan={myClan} size="lg" />
              <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
                [{myClan.tag}] Controls
              </h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Settings and destructive actions live here so the main HQ stays focused.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUtilitiesOpen(false)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition hover:border-white/20 hover:text-white"
            aria-label="Close utilities"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {canEditClan ? (
          <SectionCard className="mb-4">
            <p className="intel-label mb-3">Clan Settings</p>
            <form key={myClan.id} onSubmit={handleSaveClan} className="grid gap-4">
              <input type="hidden" name="badgeIcon" value={clanBadgeIcon} />
              <div>
                <label htmlFor="clan-name" className="intel-label mb-2 block">
                  Clan Name
                </label>
                <input
                  id="clan-name"
                  name="name"
                  defaultValue={myClan.name}
                  className="field"
                  maxLength="40"
                />
              </div>
              <div>
                <label htmlFor="clan-tag" className="intel-label mb-2 block">
                  Clan Tag
                </label>
                <input
                  id="clan-tag"
                  name="tag"
                  defaultValue={myClan.tag}
                  className="field font-mono uppercase tracking-[0.3em]"
                  maxLength="16"
                  onChange={(event) => {
                    event.currentTarget.value = event.currentTarget.value.toUpperCase()
                  }}
                />
              </div>
              <div>
                <label htmlFor="clan-description" className="intel-label mb-2 block">
                  Description
                </label>
                <textarea
                  id="clan-description"
                  name="description"
                  defaultValue={myClan.description}
                  className="field min-h-28"
                  maxLength="280"
                />
              </div>
              <div>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="intel-label">Clan Badge Icon</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-gray-600">
                      Pick from the existing player badge icon set.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                    <ClanBadge iconKey={clanBadgeIcon} size="md" />
                    <span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-300">
                      {getClanBadgeIconOption(clanBadgeIcon).label}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {clanBadgeIconOptions.map((option) => {
                    const selected = clanBadgeIcon === option.key

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setClanBadgeIcon(option.key)}
                        className={`group flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 transition ${
                          selected
                            ? 'border-red-400/60 bg-red-500/16 shadow-[0_0_22px_rgba(239,68,68,0.18)]'
                            : 'border-white/10 bg-black/25 hover:border-red-400/35 hover:bg-white/[0.04]'
                        }`}
                        aria-pressed={selected}
                      >
                        <ClanBadge iconKey={option.key} size="md" />
                        <span className={`text-center text-[0.56rem] font-black uppercase tracking-[0.1em] ${selected ? 'text-red-100' : 'text-gray-500 group-hover:text-gray-300'}`}>
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <button
                type="submit"
                disabled={workingKey === 'save-clan'}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                {workingKey === 'save-clan' ? 'Saving' : 'Save Clan'}
              </button>
            </form>
          </SectionCard>
        ) : null}

        {myClanRole === 'owner' ? (
          <SectionCard className="mb-4">
            <p className="intel-label mb-3">Transfer Ownership</p>
            {transferCandidates.length ? (
              <div className="space-y-2">
                {transferCandidates.map((member) => (
                  <button
                    key={member.user_id}
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Transfer clan ownership to ${displayProfileName(member.profile)}?`)) {
                        return
                      }

                      runAction(
                        `transfer-${member.user_id}`,
                        'Ownership transferred.',
                        async () => {
                          await transferClanOwnership(myClan.id, member.user_id)
                          setUtilitiesOpen(false)
                        },
                      )
                    }}
                    disabled={workingKey === `transfer-${member.user_id}`}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 text-left text-sm font-black uppercase tracking-[0.12em] text-yellow-100 transition hover:bg-yellow-400/20 disabled:opacity-60"
                  >
                    <span>{displayProfileName(member.profile)}</span>
                    <RolePill role={member.role} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-4 text-sm font-bold text-gray-500">
                No other members to transfer ownership to.
              </p>
            )}
          </SectionCard>
        ) : null}

        <SectionCard>
          <p className="intel-label mb-3">Exit</p>
          <div className="grid gap-3">
            {myClanRole === 'owner' ? (
              <p className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm font-bold leading-6 text-yellow-100">
                Owners cannot leave until they transfer ownership or archive the clan.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleLeaveClan}
                disabled={workingKey === 'leave-clan'}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-60"
              >
                {workingKey === 'leave-clan' ? 'Leaving' : 'Leave Clan'}
              </button>
            )}

            {canEditClan ? (
              <button
                type="button"
                onClick={handleArchiveClan}
                disabled={workingKey === 'archive-clan'}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                {workingKey === 'archive-clan' ? 'Archiving' : 'Archive Clan'}
              </button>
            ) : null}
          </div>
        </SectionCard>
        </div>
      </aside>
    </div>
  ) : null

  return (
    <div>
      <PageHeader eyebrow="Clan Network" code="B21 // CLANS" title="Clan HQ">
        Clan status, roster, and access.
      </PageHeader>

      {utilitiesDrawer}

      {status ? <p className="mb-4 text-sm font-bold text-green-200">{status}</p> : null}
      {error ? <p className="mb-4 text-sm font-bold text-red-200">{error}</p> : null}

      {!isAuthenticated ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <SectionCard>
            <p className="intel-label mb-3">Clan HQ</p>
            <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
              Login to join
            </h2>
            <Link
              to="/auth"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Login
            </Link>
          </SectionCard>
          {directoryPanel}
        </div>
      ) : null}

      {adminInspector ? <div className="mb-5">{adminInspector}</div> : null}

      {isAuthenticated && !myClan ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="grid gap-5">
            <SectionCard>
              <p className="intel-label mb-3">Your Status</p>
              <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
                {profile?.display_name || user?.email}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                You are not in a clan yet. Create one, accept an invite, or request access to an
                existing clan below.
              </p>
            </SectionCard>

            <SectionCard>
              <p className="intel-label mb-3">Create Clan</p>
              <form onSubmit={handleCreateClan} className="grid gap-4">
                <div>
                  <label htmlFor="create-clan-name" className="intel-label mb-2 block">
                    Clan Name
                  </label>
                  <input
                    id="create-clan-name"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    className="field"
                    maxLength="40"
                    placeholder="Building 21 Sweepers"
                  />
                </div>
                <div>
                  <label htmlFor="create-clan-tag" className="intel-label mb-2 block">
                    Clan Tag
                  </label>
                  <input
                    id="create-clan-tag"
                    value={createTag}
                    onChange={(event) => setCreateTag(event.target.value.toUpperCase())}
                    className="field font-mono uppercase tracking-[0.3em]"
                    maxLength="16"
                    placeholder="B21"
                  />
                </div>
                <div>
                  <label htmlFor="create-clan-description" className="intel-label mb-2 block">
                    Description
                  </label>
                  <textarea
                    id="create-clan-description"
                    value={createDescription}
                    onChange={(event) => setCreateDescription(event.target.value)}
                    className="field min-h-28"
                    maxLength="280"
                    placeholder="What kind of players you run with, play times, and what you're recruiting for."
                  />
                </div>
                <button
                  type="submit"
                  disabled={workingKey === 'create-clan'}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                >
                  {workingKey === 'create-clan' ? 'Creating' : 'Create Clan'}
                </button>
              </form>
            </SectionCard>

            <SectionCard>
              <p className="intel-label mb-3">Pending Invites</p>
              <div className="space-y-3">
                {myPendingInvites.length ? (
                  myPendingInvites.map((invite) => (
                    <article key={invite.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black uppercase tracking-[0.04em] text-white">
                          [{invite.clan?.tag}] {invite.clan?.name}
                        </h3>
                        <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-green-100">
                          Invite Ready
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        {invite.message || 'No invite message.'}
                      </p>
                      <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-gray-500">
                        From {displayProfileName(invite.invitedByProfile)}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            runAction(`accept-invite-${invite.id}`, 'Invite accepted.', () => acceptClanInvite(invite.id))
                          }
                          disabled={workingKey === `accept-invite-${invite.id}`}
                          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-green-500/50 bg-green-500/10 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-green-100 transition hover:bg-green-500/20 disabled:opacity-60"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            runAction(`decline-invite-${invite.id}`, 'Invite declined.', () => declineClanInvite(invite.id))
                          }
                          disabled={workingKey === `decline-invite-${invite.id}`}
                          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-60"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                          Decline
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-4 text-sm font-bold text-gray-500">
                    No invites waiting.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard>
              <p className="intel-label mb-3">Your Requests</p>
              <div className="space-y-3">
                {myPendingRequests.length ? (
                  myPendingRequests.map((request) => (
                    <article key={request.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black uppercase tracking-[0.04em] text-white">
                          [{request.clan?.tag}] {request.clan?.name}
                        </h3>
                        <span className="rounded-full border border-orange-400/40 bg-orange-400/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-orange-100">
                          Pending
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        {request.message || 'No join message.'}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          runAction(`cancel-request-${request.id}`, 'Join request cancelled.', () => cancelClanJoinRequest(request.id))
                        }
                        disabled={workingKey === `cancel-request-${request.id}`}
                        className="mt-4 inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-60"
                      >
                        Cancel Request
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-4 text-sm font-bold text-gray-500">
                    No join requests sent.
                  </p>
                )}
              </div>
            </SectionCard>
          </div>

          {directoryPanel}
        </div>
      ) : null}

      {isAuthenticated && myClan ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="grid gap-5">
            <SectionCard>
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <ClanBadge clan={myClan} size="xl" className="mt-1" />
                  <div className="min-w-0">
                    <p className="intel-label mb-3">Ready Room</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-3xl font-black uppercase tracking-[0.04em] text-white">
                        [{myClan.tag}] {myClan.name}
                      </h2>
                      <RolePill role={myClanRole} />
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">
                        {myClanMembers.length} members
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {myClan.description || 'No clan description yet.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUtilitiesOpen(true)}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Utilities
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-2.5">
                    <MessageSquare className="h-5 w-5 text-red-200" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-400">Clan Chat</p>
                    <h3 className="mt-0.5 text-lg font-black uppercase tracking-[0.04em] text-white">
                      Open comms, no ceremony
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-gray-400">
                      Jump straight to the clan room when the squad is forming.
                    </p>
                  </div>
                </div>
                <Link
                  to="/chat?room=clan"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
                >
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  Open Clan Chat
                </Link>
              </div>
            </SectionCard>

            <SectionCard>
              <div className="mb-4 flex items-center gap-3">
                <UsersRound className="h-5 w-5 text-red-200" aria-hidden="true" />
                <div>
                  <p className="intel-label">Roster</p>
                  <p className="text-sm text-gray-500">Manage roles and remove members from the squad.</p>
                </div>
              </div>

              <div className="space-y-3">
                {myClanMembers.map((member) => {
                  const canToggleRole = member.role !== 'owner' && (isAdmin || myClanRole === 'owner')
                  const canRemove =
                    member.role !== 'owner' &&
                    member.user_id !== user?.id &&
                    (isAdmin || myClanRole === 'owner' || (myClanRole === 'officer' && ['recruit', 'member', 'veteran', 'sergeant'].includes(member.role)))

                  return (
                    <article
                      key={member.user_id}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-black uppercase tracking-[0.04em] text-white">
                              {displayProfileName(member.profile)}
                            </p>
                            {member.role === 'owner' ? <Crown className="h-4 w-4 text-yellow-300" aria-hidden="true" /> : null}
                            {member.role === 'officer' ? <Shield className="h-4 w-4 text-orange-200" aria-hidden="true" /> : null}
                            {member.role === 'veteran' ? <Star className="h-4 w-4 text-sky-200" aria-hidden="true" /> : null}
                            {member.role === 'sergeant' ? <Star className="h-4 w-4 text-teal-200" aria-hidden="true" /> : null}
                            <RolePill role={member.role} />
                          </div>
                          <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {canToggleRole ? (
                            <select
                              value={member.role}
                              onChange={(e) => {
                                if (e.target.value !== member.role) {
                                  runAction(
                                    `role-${member.user_id}`,
                                    'Clan role updated.',
                                    () => updateClanMemberRole(myClan.id, member.user_id, e.target.value),
                                  )
                                }
                              }}
                              disabled={!!workingKey}
                              className="field min-h-10 text-[0.68rem] font-black uppercase tracking-[0.18em]"
                            >
                              <option value="recruit">Recruit</option>
                              <option value="member">Member</option>
                              <option value="sergeant">Sergeant</option>
                              <option value="veteran">Veteran</option>
                              <option value="officer">Officer</option>
                            </select>
                          ) : null}

                          {canRemove ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!window.confirm(`Remove ${displayProfileName(member.profile)} from ${myClan.name}?`)) {
                                  return
                                }

                                runAction(
                                  `remove-${member.user_id}`,
                                  'Member removed.',
                                  () => removeClanMember(myClan.id, member.user_id),
                                )
                              }}
                              disabled={workingKey === `remove-${member.user_id}`}
                              className="inline-flex min-h-10 items-center rounded-full border border-red-500/50 bg-red-500/12 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </SectionCard>

            {canManageClan ? (
              <SectionCard>
                <p className="intel-label mb-3">Pending Join Requests</p>
                <div className="space-y-3">
                  {myClanPendingRequests.length ? (
                    myClanPendingRequests.map((request) => (
                      <article key={request.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-black uppercase tracking-[0.04em] text-white">
                            {displayProfileName(request.profile)}
                          </p>
                          <span className="rounded-full border border-orange-400/40 bg-orange-400/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-orange-100">
                            Pending
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                          {request.message || 'No join message.'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              runAction(`approve-${request.id}`, 'Join request approved.', () => approveClanJoinRequest(request.id))
                            }
                            disabled={workingKey === `approve-${request.id}`}
                            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-green-500/50 bg-green-500/10 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-green-100 transition hover:bg-green-500/20 disabled:opacity-60"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              runAction(`reject-${request.id}`, 'Join request rejected.', () => rejectClanJoinRequest(request.id))
                            }
                            disabled={workingKey === `reject-${request.id}`}
                            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-60"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                            Reject
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-4 text-sm font-bold text-gray-500">
                      No pending requests right now.
                    </p>
                  )}
                </div>
              </SectionCard>
            ) : null}
          </div>

          <div className="grid gap-5">
            {directoryPanel}

            {canManageClan ? (
              <SectionCard>
                <p className="intel-label mb-3">Invite Member</p>
                <form onSubmit={handleInviteMember} className="grid gap-4">
                  <div>
                    <label htmlFor="invite-user" className="intel-label mb-2 block">
                      Operator
                    </label>
                    <select
                      id="invite-user"
                      value={inviteUserId}
                      onChange={(event) => setInviteUserId(event.target.value)}
                      className="field"
                    >
                      <option value="">Select a profile</option>
                      {inviteOptions.map((nextProfile) => (
                        <option key={nextProfile.id} value={nextProfile.id}>
                          {displayProfileName(nextProfile)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="invite-message" className="intel-label mb-2 block">
                      Invite Message
                    </label>
                    <textarea
                      id="invite-message"
                      value={inviteMessage}
                      onChange={(event) => setInviteMessage(event.target.value)}
                      className="field min-h-24"
                      maxLength="280"
                      placeholder="Tell them what the clan is about."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!inviteUserId || workingKey === `invite-${inviteUserId}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    Send Invite
                  </button>
                </form>
              </SectionCard>
            ) : null}

          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Clans
