import { AlertTriangle, LogIn, Save, ShieldX, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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

function AddPlayerModal({ open, onClose }) {
  const { addPlayer, clans, isAuthenticated } = useIntel()
  const titleId = useId()
  const dialogRef = useRef(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedThreat = useMemo(
    () => threatLevels.find((level) => level.id === form.threatLevel),
    [form.threatLevel],
  )

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !saving) {
        onClose()
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    window.setTimeout(() => dialogRef.current?.focus(), 0)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, open, saving])

  if (!open) return null

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

  function resetAndClose() {
    if (saving) return
    setError('')
    onClose()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Operator name is required.')
      return
    }

    setSaving(true)

    try {
      await addPlayer({
        ...form,
        name: form.name.trim(),
        clan: form.clan.trim(),
        trustScore: Number(form.trustScore),
        evidenceUrl: form.evidenceUrl.trim(),
        notes: form.notes.trim(),
      })
      setForm(defaultForm)
      onClose()
    } catch (addError) {
      setError(addError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/80 px-3 py-4 backdrop-blur-md sm:px-5 sm:py-8">
      <button
        type="button"
        className="fixed inset-0 h-full w-full cursor-default"
        onClick={resetAndClose}
        aria-label="Close add operator modal"
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-4xl items-center">
        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="panel relative my-auto max-h-[calc(100vh-2rem)] w-full overflow-hidden rounded-[1.5rem] border-red-500/20 shadow-2xl shadow-black sm:max-h-[calc(100vh-4rem)] sm:rounded-[2rem]"
        >
          <div className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/95 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="intel-label mb-2 text-red-100">New Intel Record</p>
                <h2 id={titleId} className="text-2xl font-black uppercase tracking-[0.04em] text-white sm:text-3xl">
                  Log Operator
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                  Start with the gamer tag, set the threat level, then add only the context your squad can use immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={resetAndClose}
                disabled={saving}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition hover:border-red-500/40 hover:text-red-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="grid gap-5 p-4 sm:p-6">
              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-100" aria-hidden="true" />
                  <p className="font-black uppercase tracking-[0.04em] text-white">Login required</p>
                </div>
                <p className="text-sm leading-6 text-gray-300">
                  Everyone can read the board, but only signed-in squad members can add intel.
                </p>
              </div>
              <Link
                to="/auth"
                onClick={onClose}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Login to add intel
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-h-[calc(100vh-10rem)] overflow-y-auto p-4 sm:max-h-[calc(100vh-12rem)] sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="grid gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="modal-player-name" className="intel-label mb-2 block">
                        Player Name
                      </label>
                      <input
                        id="modal-player-name"
                        value={form.name}
                        onChange={(event) => updateField('name', event.target.value)}
                        className="field min-h-13 text-base font-black uppercase tracking-[0.04em]"
                        placeholder="Enter gamer tag"
                        autoComplete="off"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="modal-clan-name" className="intel-label mb-2 block">
                        Clan / Squad Tag
                      </label>
                      <input
                        id="modal-clan-name"
                        list="modal-known-clans"
                        value={form.clan}
                        onChange={(event) => updateField('clan', event.target.value)}
                        className="field min-h-13 text-base font-black uppercase tracking-[0.04em]"
                        placeholder="Optional clan tag"
                        autoComplete="off"
                      />
                      <datalist id="modal-known-clans">
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
                            className={`cursor-pointer rounded-xl border p-3 transition ${
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
                            <span className="block text-sm font-black uppercase">{level.label}</span>
                            <span className="mt-1 block text-xs font-bold text-current opacity-70">
                              {level.id === 'hostile'
                                ? 'Immediate squad warning'
                                : level.id === 'caution'
                                  ? 'Track before trusting'
                                  : 'Known friendly operator'}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label htmlFor="modal-trust-score" className="intel-label">
                        Trust Score
                      </label>
                      <span className="rounded-md border border-gray-700 px-2 py-1 text-sm font-black text-white">
                        {form.trustScore}
                      </span>
                    </div>
                    <input
                      id="modal-trust-score"
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
                            className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-black transition ${
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
                    <label htmlFor="modal-evidence-url" className="intel-label mb-2 block">
                      Evidence Clip URL
                    </label>
                    <input
                      id="modal-evidence-url"
                      type="url"
                      value={form.evidenceUrl}
                      onChange={(event) => updateField('evidenceUrl', event.target.value)}
                      className="field"
                      placeholder="https://twitch.tv/..."
                    />
                  </div>

                  <div>
                    <label htmlFor="modal-notes" className="intel-label mb-2 block">
                      Death Comms / Notes
                    </label>
                    <textarea
                      id="modal-notes"
                      value={form.notes}
                      onChange={(event) => updateField('notes', event.target.value)}
                      className="field min-h-32 resize-y py-3"
                      placeholder="Quote, squad context, betrayals, exfil details..."
                    />
                  </div>
                </div>

                <aside className="grid content-start gap-4">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="intel-label mb-3">Intel Preview</p>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-100">
                          <ShieldX className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-black uppercase tracking-[0.04em] text-white">
                            {form.name.trim() || 'Unknown Operator'}
                          </p>
                          <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                            {form.clan.trim() ? `[${form.clan.trim()}]` : 'No clan tag'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-black uppercase tracking-[0.12em] text-red-100">
                        {selectedThreat?.label ?? 'Hostile'}
                      </p>
                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-gray-400">
                        {form.notes.trim() || 'No notes yet.'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="intel-label mb-2">Ready Check</p>
                    <ul className="grid gap-2 text-xs font-bold text-gray-400">
                      <li className={form.name.trim() ? 'text-green-200' : ''}>Name locked</li>
                      <li className={form.tags.length ? 'text-green-200' : ''}>Tags added</li>
                      <li className={form.evidenceUrl.trim() ? 'text-green-200' : ''}>Clip linked</li>
                    </ul>
                  </div>
                </aside>
              </div>

              <div className="sticky bottom-0 -mx-4 mt-6 border-t border-white/10 bg-neutral-950/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-h-5">
                    {error ? <p className="text-sm font-bold text-red-200">{error}</p> : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={resetAndClose}
                      disabled={saving}
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !form.name.trim()}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-red-500/60 bg-red-500/14 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 shadow-[0_0_28px_rgba(239,68,68,0.18)] transition hover:bg-red-500/22 disabled:opacity-50"
                    >
                      <Save className="h-5 w-5" aria-hidden="true" />
                      {saving ? 'Saving' : 'Save Intel'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}

export default AddPlayerModal
