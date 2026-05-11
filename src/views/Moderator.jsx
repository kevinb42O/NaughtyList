import { MessageSquare, Search, ShieldAlert, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { clanPrefix, displayProfileName } from '../utils/profiles.js'
import { getThreatStyle } from '../utils/threat.js'

function Moderator() {
  const {
    isAuthenticated,
    isModerator,
    role,
    profileDisplayName,
    players,
    trustVotes,
    publicMessages,
    deletePlayer,
    deleteTrustVote,
    deletePublicMessage,
  } = useIntel()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [workingId, setWorkingId] = useState('')
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      if (!normalizedQuery) {
        return true
      }

      return [player.name, player.clan, player.notes, ...(player.tags ?? [])]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [normalizedQuery, players])

  const filteredVotes = useMemo(() => {
    return trustVotes.filter((vote) => {
      if (!normalizedQuery) {
        return true
      }

      return [vote.player?.name, vote.profile?.display_name, String(vote.score)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [normalizedQuery, trustVotes])

  const filteredMessages = useMemo(() => {
    return [...publicMessages]
      .reverse()
      .filter((message) => {
        if (!normalizedQuery) {
          return true
        }

        return [message.body, message.profile?.display_name, message.profile?.clan_tag]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery))
      })
  }, [normalizedQuery, publicMessages])

  async function handleDelete(playerId) {
    setStatus('')
    setError('')
    setWorkingId(playerId)

    try {
      await deletePlayer(playerId)
      setStatus('Entry deleted.')
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setWorkingId('')
    }
  }

  async function handleDeleteVote(voteId) {
    setStatus('')
    setError('')
    setWorkingId(voteId)

    try {
      await deleteTrustVote(voteId)
      setStatus('Vote deleted.')
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setWorkingId('')
    }
  }

  async function handleDeleteMessage(messageId) {
    setStatus('')
    setError('')
    setWorkingId(messageId)

    try {
      await deletePublicMessage(messageId)
      setStatus('Public chat message deleted.')
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setWorkingId('')
    }
  }

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader eyebrow="Moderator Login" title="Login Required">
          Moderator tools are only available to signed-in moderators and the admin.
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

  if (!isModerator) {
    return (
      <div>
        <PageHeader eyebrow="Moderator Screen" title="No Moderator Role">
          Ask the admin to promote your account before you can moderate entries.
        </PageHeader>
        <section className="panel rounded-[1.8rem] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xl font-black uppercase tracking-[0.04em] text-white">
              {profileDisplayName}
            </p>
            <RoleBadge role={role} />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="Moderator Screen" title="Moderation Queue">
        Remove bad or duplicate operator records. Admins and moderators share this queue.
      </PageHeader>

      <section className="panel rounded-[1.8rem] p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-orange-200" aria-hidden="true" />
          <p className="font-black uppercase tracking-[0.04em] text-white">{profileDisplayName}</p>
          <RoleBadge role={role} />
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,180px))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-red-200" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field min-h-12 pl-11"
              placeholder="Search players, votes, or public chat"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center">
            <p className="text-xl font-black text-white">{players.length}</p>
            <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">Operators</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center">
            <p className="text-xl font-black text-white">{trustVotes.length}</p>
            <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">Votes</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center">
            <p className="text-xl font-black text-white">{publicMessages.length}</p>
            <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">Chat Lines</p>
          </div>
        </div>

        <div className="mb-4 border-b border-white/10 pb-4">
          <p className="intel-label mb-2">Operator Records</p>
          <p className="text-sm text-gray-500">Delete fake, duplicate, or abusive entries.</p>
        </div>

        <div className="grid gap-3">
          {filteredPlayers.length ? (
            filteredPlayers.map((player) => {
              const threat = getThreatStyle(player.threatLevel)

              return (
                <article
                  key={player.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-black uppercase tracking-[0.04em] text-white">
                        {player.name}
                      </h2>
                      <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] ${threat.badge}`}>
                        {threat.label}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">
                        Trust {player.trustScore}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{player.notes || 'No notes.'}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(player.id)}
                    disabled={workingId === player.id}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {workingId === player.id ? 'Deleting' : 'Delete'}
                  </button>
                </article>
              )
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
              No entries to moderate.
            </div>
          )}
        </div>

        {status ? <p className="mt-4 text-sm font-bold text-green-200">{status}</p> : null}
        {error ? <p className="mt-4 text-sm font-bold text-red-200">{error}</p> : null}
      </section>

      <section className="panel mt-5 rounded-[1.8rem] p-5">
        <div className="mb-4 border-b border-white/10 pb-4">
          <p className="intel-label mb-2">Trust Votes</p>
          <p className="text-sm text-gray-500">Delete vote abuse so trust scores stay useful.</p>
        </div>

        <div className="grid gap-3">
          {filteredVotes.length ? (
            filteredVotes.map((vote) => (
              <article
                key={vote.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-black uppercase tracking-[0.04em] text-white">
                      {vote.player?.name || 'Deleted operator'}
                    </p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">
                      Vote {vote.score}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-gray-500">
                    By {vote.profile?.display_name || vote.user_id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteVote(vote.id)}
                  disabled={workingId === vote.id}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {workingId === vote.id ? 'Deleting' : 'Delete Vote'}
                </button>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
              No votes to moderate.
            </div>
          )}
        </div>
      </section>

      <section className="panel mt-5 rounded-[1.8rem] p-5">
        <div className="mb-4 border-b border-white/10 pb-4">
          <p className="intel-label mb-2">Public Chat</p>
          <p className="text-sm text-gray-500">Kill spam, abuse, or garbage callouts without leaving the moderation screen.</p>
        </div>

        <div className="grid gap-3">
          {filteredMessages.length ? (
            filteredMessages.map((message) => (
              <article
                key={message.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-lg font-black uppercase tracking-[0.04em] text-white">
                      {clanPrefix(message.profile)} {displayProfileName(message.profile)}
                    </p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-300">
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-400">{message.body}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteMessage(message.id)}
                  disabled={workingId === message.id}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                >
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  {workingId === message.id ? 'Deleting' : 'Delete Chat'}
                </button>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
              No public chat messages match the current search.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Moderator
