import { LogIn, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import { useIntel } from '../context/useIntel.js'

function Auth() {
  const { isAuthenticated, profileDisplayName, role, signIn, signUp, signOut } = useIntel()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setStatus('')

    try {
      if (mode === 'signup') {
        await signUp(email, password, displayName)
        setStatus('Account created. Check email confirmation if Supabase requires it, then sign in.')
      } else {
        await signIn(email, password)
        navigate('/')
      }
    } catch (authError) {
      setError(authError.message)
    } finally {
      setSaving(false)
    }
  }

  if (isAuthenticated) {
    return (
      <div>
        <PageHeader eyebrow="Auth Screen" title="Logged In">
          You can add intel, manage your profile, and access role tools if assigned.
        </PageHeader>
        <section className="panel rounded-[1.8rem] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="intel-label mb-2">Current Operator</p>
              <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
                {profileDisplayName}
              </h2>
              <div className="mt-3"><RoleBadge role={role} /></div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-200 transition hover:border-red-500/40 hover:text-red-100"
            >
              Sign Out
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="Auth Screen" title="Login Required">
        Everyone can scan 21rats. Adding intel requires an account.
      </PageHeader>

      <form onSubmit={handleSubmit} className="panel mx-auto grid max-w-xl gap-4 rounded-[1.8rem] p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-2 rounded-full border border-white/10 bg-black/25 p-1">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full text-xs font-black uppercase tracking-[0.18em] transition ${
              mode === 'signin' ? 'bg-red-500/18 text-red-100' : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full text-xs font-black uppercase tracking-[0.18em] transition ${
              mode === 'signup' ? 'bg-red-500/18 text-red-100' : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Sign Up
          </button>
        </div>

        {mode === 'signup' ? (
          <div>
            <label htmlFor="display-name" className="intel-label mb-2 block">Display Name</label>
            <input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="field"
              placeholder="Your handle"
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="email" className="intel-label mb-2 block">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="intel-label mb-2 block">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
            placeholder="Minimum 6 characters"
            required
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-red-500/50 bg-red-500/14 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/22 disabled:opacity-60"
        >
          {saving ? 'Working' : mode === 'signin' ? 'Login' : 'Create Account'}
        </button>

        {status ? <p className="text-sm font-bold text-green-200">{status}</p> : null}
        {error ? <p className="text-sm font-bold text-red-200">{error}</p> : null}
      </form>
    </div>
  )
}

export default Auth
