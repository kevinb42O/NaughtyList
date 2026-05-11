import { Save } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useIntel } from '../context/useIntel.js'
import { b21Tags, threatLevels } from '../data/mockPlayers.js'
import { getThreatStyle } from '../utils/threat.js'

const defaultForm = {
  name: '',
  clan: '',
  threatLevel: 'hostile',
  trustScore: 50,
  tags: [],
  evidenceUrl: '',
  notes: '',
}

function AddPlayer() {
  const { addPlayer, clans, isAuthenticated } = useIntel()
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function toggleTag(tag) {
    setForm((currentForm) => ({
      ...currentForm,
      tags: currentForm.tags.includes(tag)
        ? currentForm.tags.filter((currentTag) => currentTag !== tag)
        : [...currentForm.tags, tag],
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.name.trim()) {
      return
    }

    setSaving(true)

    try {
      await addPlayer({
        ...form,
        name: form.name.trim(),
        trustScore: Number(form.trustScore),
        evidenceUrl: form.evidenceUrl.trim(),
        notes: form.notes.trim(),
      })

      // Mock Discord webhook handoff for later integration.
      // sendDiscordWebhook(loggedPlayer)

      setForm(defaultForm)
      navigate('/')
    } catch (addError) {
      setError(addError.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader eyebrow="New Entry" title="Login Required">
          Everyone can view The Naughty List, but only logged-in users can add names.
        </PageHeader>
        <section className="panel rounded-[1.8rem] p-6 text-center">
          <p className="mx-auto max-w-xl text-sm leading-6 text-gray-400">
            Sign in or create an account to log operators and attach clan intel.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
          >
            Login to add names
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="New Entry" title="Log Operator">
        Save a real operator record, attach a clan tag if needed, and push it straight onto the list.
      </PageHeader>

      <form onSubmit={handleSubmit} className="panel grid gap-5 rounded-[1.8rem] p-4 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label htmlFor="player-name" className="intel-label mb-2 block">
              Player Name
            </label>
            <input
              id="player-name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="field"
              placeholder="Enter gamer tag"
              required
            />
          </div>

          <div>
            <label htmlFor="clan-name" className="intel-label mb-2 block">
              Clan / Squad Tag
            </label>
            <input
              id="clan-name"
              list="known-clans"
              value={form.clan}
              onChange={(event) => updateField('clan', event.target.value)}
              className="field"
              placeholder="Optional clan tag"
            />
            <datalist id="known-clans">
              {clans.map((clan) => (
                <option key={clan.id} value={clan.name} />
              ))}
            </datalist>
          </div>
        </div>

        <fieldset>
          <legend className="intel-label mb-3">Threat Level</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {threatLevels.map((level) => {
              const threat = getThreatStyle(level.id)
              const isSelected = form.threatLevel === level.id

              return (
                <label
                  key={level.id}
                  className={`rounded-lg border p-3 transition ${
                    isSelected
                      ? `${threat.badge} ring-2 ${threat.ring}`
                      : 'border-white/10 bg-black/25 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="threatLevel"
                    value={level.id}
                    checked={isSelected}
                    onChange={(event) => updateField('threatLevel', event.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-black uppercase">{level.label}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="trust-score" className="intel-label">
              Trust Score
            </label>
            <span className="rounded-md border border-gray-700 px-2 py-1 text-sm font-black text-white">
              {form.trustScore}
            </span>
          </div>
          <input
            id="trust-score"
            type="range"
            min="1"
            max="100"
            value={form.trustScore}
            onChange={(event) => updateField('trustScore', event.target.value)}
            className="h-2 w-full accent-green-400"
          />
        </div>

        <fieldset>
          <legend className="intel-label mb-3">B21 Tags</legend>
          <div className="flex flex-wrap gap-2">
            {b21Tags.map((tag) => {
              const isSelected = form.tags.includes(tag)

              return (
                <label
                  key={tag}
                  className={`rounded-md border px-3 py-2 text-sm font-black transition ${
                    isSelected
                      ? 'border-red-500/60 bg-red-500/12 text-red-100'
                      : 'border-white/10 bg-black/25 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTag(tag)}
                    className="sr-only"
                  />
                  {tag}
                </label>
              )
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="evidence-url" className="intel-label mb-2 block">
            Evidence Clip URL
          </label>
          <input
            id="evidence-url"
            type="url"
            value={form.evidenceUrl}
            onChange={(event) => updateField('evidenceUrl', event.target.value)}
            className="field"
            placeholder="https://twitch.tv/..."
          />
        </div>

        <div>
          <label htmlFor="notes" className="intel-label mb-2 block">
            Death Comms / Notes
          </label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            className="field min-h-32 resize-y"
            placeholder="Quote, squad context, betrayals, exfil details..."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-red-500/60 bg-red-500/14 px-4 py-3 text-sm font-black uppercase tracking-wider text-red-100 shadow-[0_0_28px_rgba(239,68,68,0.18)] transition hover:bg-red-500/22 disabled:opacity-60"
        >
          <Save className="h-5 w-5" aria-hidden="true" />
          {saving ? 'Saving' : 'Save To The Naughty List'}
        </button>
        {error ? <p className="text-sm font-bold text-red-200">{error}</p> : null}
      </form>
    </div>
  )
}

export default AddPlayer
