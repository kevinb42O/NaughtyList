import { Check, Crown, LogIn, Send, Shield, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import OnlineDot from '../components/OnlineDot.jsx'
import PageHeader from '../components/PageHeader.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { clanPrefix, displayProfileName, isProfileOnline } from '../utils/profiles.js'

const clanEventLabels = {
  'clan-created': 'Clan created',
  'join-requested': 'Join requested',
  'join-request-approved': 'Join approved',
  'join-request-rejected': 'Join rejected',
  'join-request-cancelled': 'Join request cancelled',
  'member-invited': 'Invite sent',
  'invite-accepted': 'Invite accepted',
  'invite-declined': 'Invite declined',
  'member-removed': 'Member removed',
  'member-left': 'Member left',
  'role-updated': 'Role updated',
  'ownership-transferred': 'Ownership transferred',
  'clan-updated': 'Clan updated',
  'clan-archived': 'Clan archived',
  'message-deleted': 'Message deleted',
}

function roleBadgeTone(role) {
  if (role === 'owner') {
    return 'border-yellow-400/40 bg-yellow-400/10 text-yellow-100'
  }

  if (role === 'officer') {
    return 'border-orange-400/40 bg-orange-400/10 text-orange-100'
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
    fetchClanAuditEvents,
    fetchClanMessages,
    sendClanMessage,
    onlineUserIds,
  } = useIntel()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [workingKey, setWorkingKey] = useState('')

  const [createName, setCreateName] = useState('')
  const [createTag, setCreateTag] = useState('')
  const [createDescription, setCreateDescription] = useState('')

  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [auditState, setAuditState] = useState({ clanId: '', events: [] })
  const [clanChatMessages, setClanChatMessages] = useState([])
  const [clanChatInput, setClanChatInput] = useState('')
  const [clanChatSending, setClanChatSending] = useState(false)
  const [clanChatError, setClanChatError] = useState('')
  const chatBottomRef = useRef(null)
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

  const visibleDirectory = useMemo(() => {
    return [...clanDirectory].sort((first, second) => {
      return second.memberCount - first.memberCount || first.name.localeCompare(second.name)
    })
  }, [clanDirectory])
  const auditEvents = auditState.clanId === myClanId ? auditState.events : []
  const loadingAudit = Boolean(myClanId && auditState.clanId !== myClanId)

  useEffect(() => {
    let cancelled = false

    if (!myClanId) {
      return undefined
    }

    const loadMessages = () => {
      fetchClanMessages(myClanId)
        .then((msgs) => {
          if (!cancelled) {
            setClanChatMessages(msgs)
          }
        })
        .catch(() => {})
    }

    loadMessages()
    const intervalId = window.setInterval(loadMessages, 3000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [fetchClanMessages, myClanId])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [clanChatMessages.length])

  useEffect(() => {
    let cancelled = false

    if (!myClanId) {
      return undefined
    }

    fetchClanAuditEvents(myClanId)
      .then((nextEvents) => {
        if (!cancelled) {
          setAuditState({ clanId: myClanId, events: nextEvents })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuditState({ clanId: myClanId, events: [] })
        }
      })

    return () => {
      cancelled = true
    }
  }, [clanInvites.length, clanJoinRequests.length, fetchClanAuditEvents, myClanId, myClanMembers.length])

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

  async function handleClanChatSend(event) {
    event.preventDefault()
    if (!clanChatInput.trim()) return
    setClanChatSending(true)
    setClanChatError('')
    try {
      await sendClanMessage(myClanId, clanChatInput)
      setClanChatInput('')
      const msgs = await fetchClanMessages(myClanId)
      setClanChatMessages(msgs)
    } catch (chatErr) {
      setClanChatError(chatErr.message)
    } finally {
      setClanChatSending(false)
    }
  }

  async function handleSaveClan(event) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    await runAction('save-clan', 'Clan profile updated.', async () => {
      await updateClan(myClan.id, {
        name: String(formData.get('name') ?? ''),
        tag: String(formData.get('tag') ?? ''),
        description: String(formData.get('description') ?? ''),
      })
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
    })
  }

  async function handleLeaveClan() {
    if (!window.confirm(`Leave ${myClan.name}?`)) {
      return
    }

    await runAction('leave-clan', 'You left the clan.', async () => {
      await leaveClan(myClan.id)
    })
  }

  return (
    <div>
      <PageHeader eyebrow="Clan Network" title="Clan HQ">
        Manage real account-based clans, membership, invites, and private rooms.
      </PageHeader>

      {status ? <p className="mb-4 text-sm font-bold text-green-200">{status}</p> : null}
      {error ? <p className="mb-4 text-sm font-bold text-red-200">{error}</p> : null}

      {!isAuthenticated ? (
        <SectionCard>
          <p className="intel-label mb-3">Clan HQ</p>
          <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
            Login required for social clans
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Real clans are account-based. Log in to create a clan, accept members, or use private
            clan chat.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Login to continue
          </Link>
        </SectionCard>
      ) : null}

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

          <SectionCard>
            <div className="mb-4 flex items-center gap-3">
              <UsersRound className="h-5 w-5 text-red-200" aria-hidden="true" />
              <div>
                <p className="intel-label">Clan Directory</p>
                <p className="text-sm text-gray-500">Request access or wait for an invite.</p>
              </div>
            </div>
            <div className="space-y-3">
              {visibleDirectory.length ? (
                visibleDirectory.map((clan) => {
                  const pendingInvite = clan.has_pending_invite
                  const pendingRequest = clan.has_pending_request

                  return (
                    <article key={clan.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black uppercase tracking-[0.04em] text-white">
                          [{clan.tag}] {clan.name}
                        </h3>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">
                          {clan.memberCount} members
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        {clan.description || 'No clan description yet.'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {pendingInvite ? (
                          <span className="rounded-full border border-green-500/40 bg-green-500/10 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-green-100">
                            Check your invite panel
                          </span>
                        ) : pendingRequest ? (
                          <span className="rounded-full border border-orange-400/40 bg-orange-400/10 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-orange-100">
                            Request pending
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
                        )}
                      </div>
                    </article>
                  )
                })
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
                  No clans have been created yet.
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {isAuthenticated && myClan ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="grid gap-5">
            <SectionCard>
              <div className="mb-4">
                <p className="intel-label mb-3">Your Clan</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-3xl font-black uppercase tracking-[0.04em] text-white">
                    [{myClan.tag}] {myClan.name}
                  </h2>
                  <RolePill role={myClanRole} />
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {myClan.description || 'No clan description yet.'}
                </p>
              </div>

              <div className="flex h-[52vh] flex-col rounded-2xl border border-white/10 bg-black/20">
                <div className="border-b border-white/10 px-4 py-2.5">
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-400">Clan Chat</p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  {clanChatMessages.length ? (
                    clanChatMessages.map((msg) => {
                      const mine = msg.user_id === user?.id
                      const online = isProfileOnline(msg.profile, onlineUserIds)
                      const wasDeleted = Boolean(msg.deleted_at)
                      return (
                        <div key={msg.id} className={`mb-3 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[82%]">
                            <div className={`mb-1 flex flex-wrap items-center gap-1.5 ${mine ? 'justify-end' : ''}`}>
                              {!mine ? <OnlineDot online={online} label={false} /> : null}
                              <span className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-gray-300">
                                {clanPrefix(msg.profile)} {displayProfileName(msg.profile)}
                                {msg.profile?.role === 'admin' ? (
                                  <Crown className="ml-1 inline h-3 w-3 text-yellow-300" aria-hidden="true" />
                                ) : null}
                              </span>
                              {!mine ? <RoleBadge role={msg.profile?.role} compact /> : null}
                              <span className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-gray-600">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className={`rounded-2xl border px-3 py-2 text-sm leading-6 ${
                              mine
                                ? 'border-red-500/35 bg-red-500/12 text-red-50'
                                : 'border-white/10 bg-black/25 text-gray-200'
                            }`}>
                              <p className={`whitespace-pre-wrap ${wasDeleted ? 'italic text-gray-400' : ''}`}>
                                {wasDeleted ? 'Message removed.' : msg.body}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm font-bold text-gray-600">No messages yet. Say something.</p>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <form onSubmit={handleClanChatSend} className="border-t border-white/10 p-3 flex gap-2">
                  <input
                    value={clanChatInput}
                    onChange={(e) => setClanChatInput(e.target.value)}
                    className="field min-h-10 flex-1 text-sm"
                    placeholder={`Message ${myClan.name}`}
                    maxLength="500"
                  />
                  <button
                    type="submit"
                    disabled={clanChatSending}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-4 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
                {clanChatError ? <p className="px-3 pb-2 text-sm font-bold text-red-200">{clanChatError}</p> : null}
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
                  const canTransfer = member.role !== 'owner' && myClanRole === 'owner'
                  const canRemove =
                    member.role !== 'owner' &&
                    member.user_id !== user?.id &&
                    (isAdmin || myClanRole === 'owner' || (myClanRole === 'officer' && member.role === 'member'))

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
                            <RolePill role={member.role} />
                          </div>
                          <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {canToggleRole ? (
                            <button
                              type="button"
                              onClick={() =>
                                runAction(
                                  `role-${member.user_id}`,
                                  'Clan role updated.',
                                  () => updateClanMemberRole(myClan.id, member.user_id, member.role === 'member' ? 'officer' : 'member'),
                                )
                              }
                              disabled={workingKey === `role-${member.user_id}`}
                              className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-60"
                            >
                              {member.role === 'member' ? 'Promote to Officer' : 'Demote to Member'}
                            </button>
                          ) : null}

                          {canTransfer ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!window.confirm(`Transfer clan ownership to ${displayProfileName(member.profile)}?`)) {
                                  return
                                }

                                runAction(
                                  `transfer-${member.user_id}`,
                                  'Ownership transferred.',
                                  () => transferClanOwnership(myClan.id, member.user_id),
                                )
                              }}
                              disabled={workingKey === `transfer-${member.user_id}`}
                              className="inline-flex min-h-10 items-center rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-400/20 disabled:opacity-60"
                            >
                              Transfer Ownership
                            </button>
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
            {canEditClan ? (
              <SectionCard>
                <p className="intel-label mb-3">Clan Settings</p>
                <form key={myClan.id} onSubmit={handleSaveClan} className="grid gap-4">
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
                  <button
                    type="submit"
                    disabled={workingKey === 'save-clan'}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    {workingKey === 'save-clan' ? 'Saving' : 'Save Clan'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={handleArchiveClan}
                  disabled={workingKey === 'archive-clan'}
                  className="mt-4 inline-flex min-h-11 items-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                >
                  {workingKey === 'archive-clan' ? 'Archiving' : 'Archive Clan'}
                </button>
              </SectionCard>
            ) : null}

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

            <SectionCard>
              <p className="intel-label mb-3">Activity Feed</p>
              <div className="space-y-3">
                {loadingAudit ? (
                  <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm font-bold text-gray-500">
                    Loading clan activity…
                  </p>
                ) : auditEvents.length ? (
                  auditEvents.map((event) => (
                    <article key={event.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black uppercase tracking-[0.08em] text-white">
                          {clanEventLabels[event.event_type] || event.event_type}
                        </p>
                        <span className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-gray-600">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        {displayProfileName(event.actorProfile)}
                        {event.targetProfile ? ` -> ${displayProfileName(event.targetProfile)}` : ''}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-4 text-sm font-bold text-gray-500">
                    No clan activity recorded yet.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard>
              <p className="intel-label mb-3">Membership Controls</p>
              {myClanRole === 'owner' ? (
                <p className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm font-bold leading-6 text-yellow-100">
                  Owners cannot leave until they transfer ownership or archive the clan.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleLeaveClan}
                  disabled={workingKey === 'leave-clan'}
                  className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-60"
                >
                  {workingKey === 'leave-clan' ? 'Leaving' : 'Leave Clan'}
                </button>
              )}
            </SectionCard>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Clans
