import { Award, Banknote, CheckCircle2, HeartHandshake, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIntel } from '../context/useIntel.js'
import { formatEuropeanDateTime } from '../utils/dates.js'
import { displayProfileName } from '../utils/profiles.js'
import { donationTiers, formatDonationAmount, supporterTierMeta } from '../utils/supporters.js'
import CollapsiblePanel from './CollapsiblePanel.jsx'

function AdminDonationConsole() {
  const {
    donations,
    profiles,
    fetchDonationAdmin,
    adminGrantSupporterBadge,
    adminRecordDonation,
  } = useIntel()
  const [query, setQuery] = useState('')
  const [profileId, setProfileId] = useState('')
  const [grantProfileId, setGrantProfileId] = useState('')
  const [grantTier, setGrantTier] = useState('supporter')
  const [grantDisplayName, setGrantDisplayName] = useState('')
  const [grantWallVisible, setGrantWallVisible] = useState(false)
  const [amount, setAmount] = useState('10')
  const [provider, setProvider] = useState('bank_transfer')
  const [reference, setReference] = useState('')
  const [message, setMessage] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [grantStatus, setGrantStatus] = useState('')
  const [grantErrorMessage, setGrantErrorMessage] = useState('')
  const [working, setWorking] = useState(false)
  const [grantWorking, setGrantWorking] = useState(false)

  const normalizedQuery = query.trim().toLowerCase()
  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((first, second) => displayProfileName(first).localeCompare(displayProfileName(second)))
  }, [profiles])
  const visibleDonations = useMemo(() => {
    return donations.filter((donation) => {
      if (!normalizedQuery) return true
      return [donation.donor_name, donation.donor_email, donation.provider, donation.provider_payment_id, donation.profile?.display_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
  }, [donations, normalizedQuery])

  async function handleRecordDonation(event) {
    event.preventDefault()
    setStatus('')
    setError('')
    setGrantStatus('')
    setGrantErrorMessage('')

    if (!profileId) {
      setError('Choose a profile first.')
      return
    }

    const amountCents = Math.round(Number(amount || 0) * 100)
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError('Enter a valid amount.')
      return
    }

    setWorking(true)
    try {
      await adminRecordDonation({ profileId, amountCents, provider, reference, message, isPublic })
      setStatus('Donation confirmed and reward recalculated.')
      setReference('')
      setMessage('')
      await fetchDonationAdmin()
    } catch (recordError) {
      setError(recordError.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleGrantBadge(event) {
    event.preventDefault()
    setGrantStatus('')
    setGrantErrorMessage('')

    if (!grantProfileId) {
      setGrantErrorMessage('Choose a profile first.')
      return
    }

    setGrantWorking(true)
    try {
      await adminGrantSupporterBadge({
        profileId: grantProfileId,
        tier: grantTier,
        displayName: grantDisplayName,
        wallVisible: grantWallVisible,
      })
      setGrantStatus('Contributor badge granted.')
      setGrantDisplayName('')
      await fetchDonationAdmin()
    } catch (grantError) {
      setGrantErrorMessage(grantError.message)
    } finally {
      setGrantWorking(false)
    }
  }

  return (
    <CollapsiblePanel
      eyebrow="Support Ops"
      title="Donations and rewards"
      description="Record support, grant badges, and audit confirmed donations."
      icon={HeartHandshake}
      meta={formatDonationAmount(donations.reduce((total, donation) => total + (donation.status === 'confirmed' ? Number(donation.amount_cents ?? 0) : 0), 0))}
    >
      <div className="mb-5 flex justify-end">
        <div className="flex flex-wrap gap-2">
          <Link
            to="/support"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 hover:border-red-500/40 hover:text-red-100"
          >
            Support Page
          </Link>
          <button
            type="button"
            onClick={fetchDonationAdmin}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 hover:border-red-500/40 hover:text-red-100"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {donationTiers.map((tier) => (
          <div key={tier.key} className="rounded-[1.3rem] border border-white/10 bg-black/25 p-4">
            <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] ${tier.tone}`}>
              {tier.label}
            </span>
            <p className="mt-3 text-2xl font-black text-white">{formatDonationAmount(tier.amountCents)}+</p>
            <p className="mt-2 text-sm leading-6 text-gray-500">{tier.description}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleGrantBadge} className="mb-5 grid gap-3 rounded-[1.4rem] border border-emerald-400/20 bg-emerald-400/10 p-4 lg:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)]">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-100" aria-hidden="true" />
            <p className="intel-label">Contributor Badge</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-400">Grant a cosmetic supporter badge without creating a traceable payment record.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
          {donationTiers.map((tier) => (
            <button
              key={tier.key}
              type="button"
              onClick={() => setGrantTier(tier.key)}
              className={`min-h-16 rounded-2xl border p-3 text-left transition ${
                grantTier === tier.key
                  ? `${tier.tone} ring-1 ring-white/10`
                  : 'border-white/10 bg-black/25 text-gray-400 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <span className="block text-sm font-black uppercase tracking-[0.16em] text-white">{tier.label}</span>
              <span className="mt-1 block text-xs font-bold uppercase tracking-[0.14em] text-gray-500">{formatDonationAmount(tier.amountCents)}+</span>
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="grant-profile" className="intel-label mb-2 block">Profile</label>
          <select id="grant-profile" value={grantProfileId} onChange={(event) => setGrantProfileId(event.target.value)} className="field min-h-12">
            <option value="">Choose profile</option>
            {sortedProfiles.map((nextProfile) => (
              <option key={nextProfile.id} value={nextProfile.id}>{displayProfileName(nextProfile)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="grant-tier" className="intel-label mb-2 block">Tier</label>
          <select id="grant-tier" value={grantTier} onChange={(event) => setGrantTier(event.target.value)} className="field min-h-12">
            {donationTiers.map((tier) => (
              <option key={tier.key} value={tier.key}>{tier.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="grant-display-name" className="intel-label mb-2 block">Wall Name</label>
          <input id="grant-display-name" value={grantDisplayName} onChange={(event) => setGrantDisplayName(event.target.value)} className="field min-h-12" maxLength="64" placeholder="Optional public alias" />
        </div>
        <div className="flex flex-wrap items-end gap-3 lg:col-span-3">
          <label className="flex min-h-11 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-300">
            <input type="checkbox" checked={grantWallVisible} onChange={(event) => setGrantWallVisible(event.target.checked)} className="h-4 w-4 accent-emerald-500" />
            Public wall
          </label>
          <button
            type="submit"
            disabled={grantWorking}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-60"
          >
            <Award className="h-4 w-4" aria-hidden="true" />
            {grantWorking ? 'Granting' : 'Grant Badge'}
          </button>
        </div>
        {grantStatus ? <p className="text-sm font-bold text-green-200 lg:col-span-3">{grantStatus}</p> : null}
        {grantErrorMessage ? <p className="text-sm font-bold text-red-200 lg:col-span-3">{grantErrorMessage}</p> : null}
      </form>

      <form onSubmit={handleRecordDonation} className="mb-5 grid gap-3 rounded-[1.4rem] border border-white/10 bg-black/25 p-4 lg:grid-cols-[minmax(0,1fr)_120px_160px]">
        <div className="lg:col-span-3">
          <p className="intel-label">Transaction Record</p>
        </div>
        <div>
          <label htmlFor="donation-profile" className="intel-label mb-2 block">Profile</label>
          <select id="donation-profile" value={profileId} onChange={(event) => setProfileId(event.target.value)} className="field min-h-12">
            <option value="">Choose profile</option>
            {sortedProfiles.map((nextProfile) => (
              <option key={nextProfile.id} value={nextProfile.id}>{displayProfileName(nextProfile)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="donation-amount" className="intel-label mb-2 block">Amount</label>
          <input id="donation-amount" value={amount} onChange={(event) => setAmount(event.target.value)} className="field min-h-12" inputMode="decimal" />
        </div>
        <div>
          <label htmlFor="donation-provider" className="intel-label mb-2 block">Provider</label>
          <select id="donation-provider" value={provider} onChange={(event) => setProvider(event.target.value)} className="field min-h-12">
            <option value="bank_transfer">Bank transfer</option>
            <option value="manual">Manual</option>
            <option value="kofi">Ko-fi</option>
          </select>
        </div>
        <div>
          <label htmlFor="donation-reference" className="intel-label mb-2 block">Reference</label>
          <input id="donation-reference" value={reference} onChange={(event) => setReference(event.target.value)} className="field min-h-12" placeholder="Bank note or receipt id" />
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="donation-message" className="intel-label mb-2 block">Message</label>
          <input id="donation-message" value={message} onChange={(event) => setMessage(event.target.value)} className="field min-h-12" maxLength="140" placeholder="Optional supporter wall text" />
        </div>
        <div className="flex flex-wrap items-end gap-3 lg:col-span-3">
          <label className="flex min-h-11 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-300">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="h-4 w-4 accent-red-500" />
            Public wall
          </label>
          <button
            type="submit"
            disabled={working}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {working ? 'Recording' : 'Confirm Donation'}
          </button>
        </div>
      </form>

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-red-200" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="field min-h-12 pl-11" placeholder="Search donations" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center">
          <p className="text-xl font-black text-white">{formatDonationAmount(donations.reduce((total, donation) => total + (donation.status === 'confirmed' ? Number(donation.amount_cents ?? 0) : 0), 0))}</p>
          <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500">Confirmed</p>
        </div>
      </div>

      <div className="grid gap-3">
        {visibleDonations.length ? visibleDonations.map((donation) => {
          const tier = supporterTierMeta(donation.profile?.supporter_tier)
          return (
            <article key={donation.id} className="flex flex-col gap-3 rounded-[1.4rem] border border-white/10 bg-black/25 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-black uppercase tracking-[0.04em] text-white">{donation.profile ? displayProfileName(donation.profile) : donation.donor_name || 'Unclaimed'}</p>
                  <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] ${tier?.tone ?? 'border-white/10 bg-white/5 text-gray-400'}`}>{tier?.label ?? 'No tier'}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-300">{donation.status}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-gray-400">
                  {formatDonationAmount(donation.amount_cents, donation.currency)} via {donation.provider} · {formatEuropeanDateTime(donation.created_at)}
                </p>
                <p className="mt-1 text-xs font-bold text-gray-600">{donation.provider_payment_id || donation.donor_email || donation.id}</p>
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                <Banknote className="h-4 w-4" aria-hidden="true" />
                Reward synced
              </div>
            </article>
          )
        }) : (
          <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">No donations match the current search.</div>
        )}
      </div>

      {status ? <p className="mt-4 text-sm font-bold text-green-200">{status}</p> : null}
      {error ? <p className="mt-4 text-sm font-bold text-red-200">{error}</p> : null}
    </CollapsiblePanel>
  )
}

export default AdminDonationConsole
