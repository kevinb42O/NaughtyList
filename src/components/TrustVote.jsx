import { LogIn, Send } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useIntel } from '../context/useIntel.js'

function TrustVote({ player }) {
  const { isAuthenticated, userVotes, voteTrust } = useIntel()
  const currentVote = userVotes[player.id]
  const [score, setScore] = useState(currentVote ?? player.trustScore)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleVote(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await voteTrust(player.id, score)
    } catch (voteError) {
      setError(voteError.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Link
        to="/auth"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-red-500/40 hover:text-red-100"
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
        Login to vote
      </Link>
    )
  }

  return (
    <form onSubmit={handleVote} className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-500">
          Your Trust Vote
        </label>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-black text-white">
          {score}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <input
          type="range"
          min="0"
          max="100"
          value={score}
          onChange={(event) => setScore(Number(event.target.value))}
          className="h-2 w-full accent-red-500"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          {saving ? 'Saving' : currentVote == null ? 'Vote' : 'Update'}
        </button>
      </div>
      {currentVote != null ? (
        <p className="mt-2 text-xs font-bold text-gray-500">Current vote: {currentVote}</p>
      ) : null}
      {error ? <p className="mt-2 text-xs font-bold text-red-200">{error}</p> : null}
    </form>
  )
}

export default TrustVote
