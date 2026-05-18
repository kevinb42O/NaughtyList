import { Banknote, BadgeCheck, Check, Copy, EyeOff, HeartHandshake, Lock, QrCode, ShieldCheck } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import SupporterBadge from '../components/SupporterBadge.jsx'
import { useIntel } from '../context/useIntel.js'
import { displayProfileName } from '../utils/profiles.js'
import { donationTiers, formatDonationAmount, supporterTierMeta } from '../utils/supporters.js'

const bankTransferReferencePrefix = 'NaughtyList'
const bankTransferIban = 'BE43 7380 0488 6701'
const bankTransferIbanCompact = bankTransferIban.replace(/\s+/g, '')
const bankTransferName = 'Kevin Bourguignon'

function parseEuroAmount(value) {
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (!normalized) return 0
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return Math.round(amount * 100)
}

function buildEpcQrPayload({ amountCents, beneficiaryName, iban, reference }) {
  const amountLine = amountCents > 0 ? `EUR${(amountCents / 100).toFixed(2)}` : ''

  return [
    'BCD',
    '002',
    '1',
    'SCT',
    '',
    beneficiaryName.slice(0, 70),
    iban,
    amountLine,
    '',
    reference.slice(0, 140),
    '',
  ].join('\n')
}

function Support() {
  const {
    isAuthenticated,
    profile,
    supporterWall,
  } = useIntel()
  const [selectedTier, setSelectedTier] = useState(donationTiers[1].key)
  const [customAmount, setCustomAmount] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const currentTier = supporterTierMeta(profile?.supporter_tier)
  const selectedTierMeta = supporterTierMeta(selectedTier)
  const selectedAmountCents = selectedTier === 'custom'
    ? parseEuroAmount(customAmount)
    : selectedTierMeta?.amountCents ?? 0
  const transferReference = useMemo(() => {
    const identity = profile?.display_name || profile?.id || '@username'
    const note = transferNote.trim()
    return `${bankTransferReferencePrefix} ${identity}${note ? ` ${note}` : ''}`.slice(0, 140)
  }, [profile?.display_name, profile?.id, transferNote])
  const qrPayload = useMemo(() => buildEpcQrPayload({
    amountCents: selectedAmountCents,
    beneficiaryName: bankTransferName,
    iban: bankTransferIbanCompact,
    reference: transferReference,
  }), [selectedAmountCents, transferReference])

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#050608',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl)
        }
      })
      .catch((qrError) => {
        if (!cancelled) {
          setQrDataUrl('')
          setError(qrError.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [qrPayload])

  async function copyTransferDetails() {
    const details = [
      `Name: ${bankTransferName}`,
      `IBAN: ${bankTransferIban}`,
      selectedAmountCents > 0 ? `Amount: ${formatDonationAmount(selectedAmountCents)}` : 'Amount: open',
      `Reference: ${transferReference}`,
    ].join('\n')

    await navigator.clipboard.writeText(details)
    setCopied(true)
    setStatus('Transfer details copied.')
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Project Support" title="Support 21rats">
        Keep the intel board online and unlock cosmetic supporter signals. Core tools stay free.
      </PageHeader>

      <section className="panel rounded-[1.8rem] p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)]">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <HeartHandshake className="h-6 w-6 text-red-100" aria-hidden="true" />
              <div>
                  <p className="intel-label">Bank App Support</p>
                  <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">Scan and send</h2>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {donationTiers.map((tier) => (
                <button
                  key={tier.key}
                  type="button"
                  onClick={() => setSelectedTier(tier.key)}
                  className={`min-h-36 rounded-[1.4rem] border p-4 text-left transition ${
                    selectedTier === tier.key
                      ? 'border-red-400/55 bg-red-500/14 shadow-lg shadow-red-950/20'
                      : 'border-white/10 bg-black/25 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] ${tier.tone}`}>
                    {tier.label}
                  </span>
                  <p className="mt-4 text-3xl font-black text-white">{formatDonationAmount(tier.amountCents)}</p>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{tier.description}</p>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedTier('custom')}
              className={`mt-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-[1.4rem] border px-4 text-left transition ${
                selectedTier === 'custom'
                  ? 'border-red-400/55 bg-red-500/14'
                  : 'border-white/10 bg-black/25 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <span>
                <span className="block text-sm font-black uppercase tracking-[0.16em] text-white">Custom Amount</span>
                <span className="block text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Any amount, or leave open</span>
              </span>
              <input
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                inputMode="decimal"
                className="field h-11 w-28 text-right"
                placeholder="€"
                aria-label="Custom support amount"
              />
            </button>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <label htmlFor="support-message" className="intel-label mb-2 block">Transfer Note</label>
                <input
                  id="support-message"
                  value={transferNote}
                  onChange={(event) => setTransferNote(event.target.value)}
                  className="field"
                  maxLength="80"
                  placeholder="Optional short note"
                />
              </div>
              <button
                type="button"
                onClick={copyTransferDetails}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-300 transition hover:border-emerald-400/40 hover:text-emerald-100"
              >
                {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                {copied ? 'Copied' : 'Copy Details'}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-5 text-sm font-black uppercase tracking-[0.18em] text-emerald-100">
                <QrCode className="h-4 w-4" aria-hidden="true" />
                {selectedAmountCents > 0 ? `QR ${formatDonationAmount(selectedAmountCents)}` : 'QR Open Amount'}
              </div>
              {!isAuthenticated ? (
                <Link
                  to="/auth"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black uppercase tracking-[0.18em] text-gray-300 hover:border-red-500/40 hover:text-red-100"
                >
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Login for rewards
                </Link>
              ) : null}
            </div>
            {status ? <p className="mt-3 text-sm font-bold text-green-200">{status}</p> : null}
            {error ? <p className="mt-3 text-sm font-bold text-red-200">{error}</p> : null}
          </div>

          <aside className="grid content-start gap-3">
            <div className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
              <p className="intel-label mb-3">Your Status</p>
              {currentTier ? (
                <>
                  <SupporterBadge profile={profile} />
                  <p className="mt-3 text-sm leading-6 text-gray-400">
                    Lifetime support: {formatDonationAmount(profile?.supporter_lifetime_amount_cents ?? 0)}.
                  </p>
                </>
              ) : (
                <p className="text-sm leading-6 text-gray-400">No supporter badge yet. Bank transfers are confirmed manually by admin.</p>
              )}
            </div>

            <div className="rounded-[1.4rem] border border-white/10 bg-white p-3 text-zinc-950 shadow-xl shadow-black/20">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Bank transfer QR code" className="mx-auto h-auto w-full max-w-72 rounded-xl" />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-xl border border-zinc-200 text-sm font-black uppercase tracking-[0.16em] text-zinc-500">
                  Building QR
                </div>
              )}
            </div>

            <div className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
              <p className="intel-label mb-3">QR Transfer</p>
              <div className="space-y-2 text-sm font-bold text-gray-300">
                <p>Name: {bankTransferName}</p>
                <p>IBAN: {bankTransferIban}</p>
                <p>Amount: {selectedAmountCents > 0 ? formatDonationAmount(selectedAmountCents) : 'open'}</p>
                <p className="break-words">Reference: {transferReference}</p>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-100" aria-hidden="true" />
                <p className="intel-label">Fair Play</p>
              </div>
              <p className="text-sm leading-6 text-gray-400">
                Support never changes votes, trust, moderation, leaderboard rank, or clan access.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
              <div className="mb-3 flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-gray-300" aria-hidden="true" />
                <p className="intel-label">Privacy</p>
              </div>
              <p className="text-sm leading-6 text-gray-400">
                Badges and wall entries are opt-in. Exact amounts are not shown publicly.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="panel rounded-[1.8rem] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <Banknote className="h-5 w-5 text-emerald-100" aria-hidden="true" />
          <div>
            <p className="intel-label">Bank Transfer</p>
            <h2 className="text-xl font-black uppercase tracking-[0.04em] text-white">Bank transfer path</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">IBAN</p>
            <p className="mt-2 font-mono text-lg font-black text-white">{bankTransferIban}</p>
          </div>
          <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Name</p>
            <p className="mt-2 text-lg font-black text-white">{bankTransferName}</p>
          </div>
          <div className="rounded-[1.3rem] border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Reference</p>
            <p className="mt-2 font-mono text-sm font-black text-white">{transferReference}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-400">
          The QR uses standard SEPA transfer data. Bank transfers are confirmed manually by admin. Include the reference so the reward can be attached to {isAuthenticated ? displayProfileName(profile) : 'your profile'}.
        </p>
      </section>

      <section className="panel rounded-[1.8rem] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <BadgeCheck className="h-5 w-5 text-yellow-100" aria-hidden="true" />
          <div>
            <p className="intel-label">Supporter Wall</p>
            <h2 className="text-xl font-black uppercase tracking-[0.04em] text-white">Opt-in signals</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {supporterWall.length ? supporterWall.map((entry) => (
            <article key={`${entry.profile_id}-${entry.supporter_since}`} className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <p className="text-lg font-black uppercase tracking-[0.04em] text-white">{entry.display_name}</p>
                <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] ${supporterTierMeta(entry.supporter_tier)?.tone ?? 'border-emerald-400/45 bg-emerald-400/10 text-emerald-100'}`}>
                  {supporterTierMeta(entry.supporter_tier)?.label ?? 'Supporter'}
                </span>
              </div>
              <p className="text-sm leading-6 text-gray-400">{entry.message || 'Supporting the project.'}</p>
            </article>
          )) : (
            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/25 p-5 text-sm font-bold text-gray-500">
              No public supporters yet.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Support
