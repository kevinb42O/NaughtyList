import {
  Check,
  ChevronRight,
  Copy,
  Crosshair,
  Edit2,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useIntel } from '../context/useIntel.js'
import { profileGameAccounts } from '../utils/gameAccounts.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const SHADOWBAN_DURATION = 5 * 24 * 60 * 60 * 1000 // 5 days in ms
const AVATAR_OPTIONS = ['/avatars/skull.png', '/avatars/soldier.png', '/avatars/shield.png']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRemainingTime(startTime) {
  if (!startTime) return 0
  const elapsed = Date.now() - startTime
  return Math.max(0, SHADOWBAN_DURATION - elapsed)
}

function formatCountdown(ms) {
  if (ms <= 0) return '00D 00:00:00'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  return `${days}D ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getRandomAvatar() {
  return AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)]
}

// ─── CountdownTimer Component ─────────────────────────────────────────────────
function CountdownTimer({ startTime, size = 'sm' }) {
  const [timeLeft, setTimeLeft] = useState(() => getRemainingTime(startTime))

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getRemainingTime(startTime)), 1000)
    return () => clearInterval(id)
  }, [startTime])

  const percent = Math.max(0, (timeLeft / SHADOWBAN_DURATION) * 100)
  const isExpired = timeLeft <= 0

  if (size === 'lg') {
    return (
      <div className="w-full">
        <div
          className={`text-center font-mono text-4xl font-black tracking-wider mb-3 ${isExpired ? 'text-gray-500' : 'text-orange-400'}`}
          style={!isExpired ? { textShadow: '0 0 20px rgba(251, 146, 60, 0.6)' } : {}}
        >
          {formatCountdown(timeLeft)}
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${percent}%`,
              background: isExpired
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(90deg, #f97316, #ef4444)',
              boxShadow: isExpired ? 'none' : '0 0 10px rgba(249, 115, 22, 0.6)',
            }}
          />
        </div>
        {isExpired && (
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-600 mt-2">
            Ban likely expired
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <p
        className={`text-center font-mono text-sm font-bold tracking-wider mb-1.5 ${isExpired ? 'text-gray-500' : 'text-orange-400'}`}
      >
        {formatCountdown(timeLeft)}
      </p>
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${percent}%`,
            background: isExpired ? 'rgba(255,255,255,0.1)' : 'linear-gradient(90deg, #f97316, #ef4444)',
          }}
        />
      </div>
    </div>
  )
}

// ─── AccountCard Component ─────────────────────────────────────────────────────
function AccountCard({ account, onClick }) {
  const isMaxLevel = Number(account.userLevel) >= 1250
  const isShadowbanned = account.shadowbanStatus === 'shadowbanned'
  const isClear = account.shadowbanStatus === 'clear'
  const avatarSrc = account.profilePicture || AVATAR_OPTIONS[0]

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      style={{
        border: isMaxLevel
          ? '1px solid rgba(255, 215, 0, 0.7)'
          : isShadowbanned
            ? '1px solid rgba(249, 115, 22, 0.25)'
            : '1px solid rgba(255,255,255,0.06)',
        boxShadow: isMaxLevel
          ? '0 0 30px rgba(255, 165, 0, 0.3), 0 8px 32px rgba(0,0,0,0.6)'
          : '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      {/* Max-level glow border animation */}
      {isMaxLevel && (
        <div
          className="pointer-events-none absolute inset-[-3px] rounded-2xl z-[-1]"
          style={{
            background: 'linear-gradient(90deg, #ffd700, #ff4500, #ff003c, #ff4500, #ffd700)',
            backgroundSize: '200% 200%',
            animation: 'shadowlistGoldSpin 2.5s ease-in-out infinite',
            filter: 'blur(8px)',
          }}
        />
      )}

      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-500 group-hover:scale-105"
        style={{ backgroundImage: `url(${avatarSrc})` }}
      />

      {/* Dark overlay */}
      <div
        className="absolute inset-0 z-10 transition-all duration-300"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,12,16,0.55) 0%, rgba(10,12,16,0.88) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-20 p-5 flex flex-col gap-3 min-h-[220px]">
        {/* Top row: level badge */}
        <div className="flex justify-end">
          <span
            className="text-[0.7rem] font-black uppercase tracking-[0.14em] px-2.5 py-1 rounded-full"
            style={
              isMaxLevel
                ? {
                    background: 'linear-gradient(135deg, #ffd700, #ff4500)',
                    color: '#000',
                    boxShadow: '0 0 12px rgba(255,165,0,0.5)',
                  }
                : {
                    background: 'rgba(0,0,0,0.55)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                  }
            }
          >
            LVL {account.userLevel}
          </span>
        </div>

        {/* Name & ID */}
        <div className="flex-1 flex flex-col justify-end gap-1">
          <p className="font-black text-xl uppercase tracking-wide text-white truncate" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
            {account.accountName || account.id}
          </p>
          <p className="font-mono text-xs text-white/70 truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            {account.id}
          </p>
        </div>

        {/* Status footer */}
        <div
          className="pt-3 border-t flex flex-col items-center gap-2"
          style={{ borderColor: isShadowbanned ? 'rgba(249, 115, 22, 0.35)' : isClear ? 'rgba(34, 197, 94, 0.35)' : 'rgba(255,255,255,0.08)' }}
        >
          {isShadowbanned ? (
            <>
              <span
                className="text-[0.68rem] font-black uppercase tracking-[0.18em] px-3 py-1 rounded-full"
                style={{ background: 'rgba(249,115,22,0.85)', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                ⚠ SHADOWBANNED
              </span>
              {account.shadowbanStartTime ? (
                <div className="w-full" style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '0.4rem 0.6rem', border: '1px solid rgba(249,115,22,0.2)' }}>
                  <CountdownTimer startTime={account.shadowbanStartTime} size="sm" />
                </div>
              ) : null}
            </>
          ) : isClear ? (
            <>
              <span
                className="text-[0.68rem] font-black uppercase tracking-[0.18em] px-3 py-1 rounded-full w-full text-center"
                style={{ background: 'rgba(34,197,94,0.85)', color: '#000', fontWeight: 900 }}
              >
                ✓ CLEAR
              </span>
              <span className="font-mono text-xs text-white font-bold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                NO ISSUES DETECTED
              </span>
            </>
          ) : (
            <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-400">
              Status Unknown
            </span>
          )}
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <ChevronRight className="h-4 w-4 text-white/60" />
      </div>
    </button>
  )
}

// ─── AddAccountModal Component ─────────────────────────────────────────────────
function AddAccountModal({ onClose, onAdd }) {
  const [activisionId, setActivisionId] = useState('')
  const [accountName, setAccountName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userLevel, setUserLevel] = useState(1)
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0])
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    const id = activisionId.trim()
    if (!id) return
    onAdd({
      id,
      accountName: accountName.trim() || id,
      email: email.trim(),
      password,
      userLevel: parseInt(userLevel, 10) || 1,
      profilePicture: avatar,
      shadowbanStatus: 'unknown',
      shadowbanDate: '',
      shadowbanStartTime: null,
      insuredSlot2: false,
      insuredSlot3: false,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', animation: 'shadowlistFadeIn 0.2s ease' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[1.8rem] border border-white/10 p-6 sm:p-8"
        style={{
          background: 'rgba(14, 17, 23, 0.96)',
          backdropFilter: 'blur(20px)',
          animation: 'shadowlistSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Crosshair className="h-5 w-5 text-orange-400" />
            <h2 className="text-lg font-black uppercase tracking-[0.1em] text-white">Add Account</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 hover:text-gray-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Avatar picker */}
        <div className="mb-5">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Avatar</p>
          <div className="flex gap-2">
            {AVATAR_OPTIONS.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setAvatar(src)}
                className="relative rounded-xl overflow-hidden transition-all"
                style={{
                  border: avatar === src ? '2px solid #f97316' : '2px solid rgba(255,255,255,0.08)',
                  boxShadow: avatar === src ? '0 0 12px rgba(249, 115, 22, 0.4)' : 'none',
                }}
              >
                <img src={src} alt="" className="h-14 w-14 object-cover" />
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-500 mb-1.5">Activision ID *</label>
            <input
              ref={inputRef}
              value={activisionId}
              onChange={(e) => setActivisionId(e.target.value)}
              className="field font-mono"
              placeholder="YourID#1234"
              maxLength={64}
              required
            />
          </div>
          <div>
            <label className="block text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-500 mb-1.5">Account Name</label>
            <input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="field"
              placeholder="Nickname (optional)"
              maxLength={64}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-500 mb-1.5">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                placeholder="email@example.com"
                type="email"
              />
            </div>
            <div>
              <label className="block text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-500 mb-1.5">Level</label>
              <input
                value={userLevel}
                onChange={(e) => setUserLevel(e.target.value)}
                className="field"
                type="number"
                min={1}
                max={9999}
              />
            </div>
          </div>
          <div>
            <label className="block text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-500 mb-1.5">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field font-mono"
              placeholder="Account password (optional)"
            />
          </div>

          <button
            type="submit"
            disabled={!activisionId.trim()}
            className="mt-2 w-full inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-orange-400/40 bg-orange-400/10 text-sm font-black uppercase tracking-[0.16em] text-orange-100 transition hover:bg-orange-400/20 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add to Shadowlist
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── AccountDetailModal Component ─────────────────────────────────────────────
function AccountDetailModal({ account, onClose, onUpdate, onDelete }) {
  const [timeLeft, setTimeLeft] = useState(() => account.shadowbanStatus === 'shadowbanned' ? getRemainingTime(account.shadowbanStartTime) : 0)
  const [isEditingLevel, setIsEditingLevel] = useState(false)
  const [editLevelValue, setEditLevelValue] = useState(account.userLevel ?? 1)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState(account.accountName || account.id)
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [editPasswordValue, setEditPasswordValue] = useState(account.password || '')
  const [showPassword, setShowPassword] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [emailCopySuccess, setEmailCopySuccess] = useState(false)
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [editDateValue, setEditDateValue] = useState('')
  const nameInputRef = useRef(null)
  const passwordInputRef = useRef(null)

  useEffect(() => {
    if (account.shadowbanStatus !== 'shadowbanned' || !account.shadowbanStartTime) return
    const id = setInterval(() => setTimeLeft(getRemainingTime(account.shadowbanStartTime)), 1000)
    return () => clearInterval(id)
  }, [account.shadowbanStatus, account.shadowbanStartTime])

  // Focus inputs when entering edit mode
  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus()
  }, [isEditingName])
  useEffect(() => {
    if (isEditingPassword) passwordInputRef.current?.focus()
  }, [isEditingPassword])

  function copyPassword() {
    navigator.clipboard.writeText(account.password || '')
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  function copyEmail() {
    if (!account.email) return
    navigator.clipboard.writeText(account.email)
    setEmailCopySuccess(true)
    setTimeout(() => setEmailCopySuccess(false), 2000)
  }

  function saveName() {
    const trimmed = editNameValue.trim()
    if (trimmed && trimmed !== account.accountName) {
      onUpdate({ ...account, accountName: trimmed })
    }
    setIsEditingName(false)
  }

  function savePassword() {
    onUpdate({ ...account, password: editPasswordValue })
    setIsEditingPassword(false)
  }

  function handleEditDateClick() {
    if (account.shadowbanStartTime) {
      const date = new Date(account.shadowbanStartTime)
      const offset = date.getTimezoneOffset() * 60000
      setEditDateValue(new Date(date - offset).toISOString().slice(0, 16))
    }
    setIsEditingDate(true)
  }

  function saveDate() {
    if (editDateValue) {
      onUpdate({ ...account, shadowbanStartTime: new Date(editDateValue).getTime() })
    }
    setIsEditingDate(false)
  }

  function toggleShadowban() {
    const nowBanned = account.shadowbanStatus !== 'shadowbanned'
    onUpdate({
      ...account,
      shadowbanStatus: nowBanned ? 'shadowbanned' : 'clear',
      ...(nowBanned ? {
        shadowbanDate: new Date().toISOString().slice(0, 10),
        shadowbanStartTime: Date.now()
      } : {})
    })
  }

  const isShadowbanned = account.shadowbanStatus === 'shadowbanned'
  const avatarSrc = account.profilePicture || AVATAR_OPTIONS[0]

  return (
    // Overlay: fixed full-screen backdrop, does NOT scroll.
    // The modal CARD itself scrolls (overflow-y-auto + max-h).
    // This is the only approach that works on iOS Safari + Android.
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)', animation: 'shadowlistFadeIn 0.2s ease' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[1.8rem] border border-white/10 overflow-y-auto overscroll-contain"
        style={{
          background: 'rgba(12, 15, 20, 0.97)',
          backdropFilter: 'blur(24px)',
          animation: 'shadowlistSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
          maxHeight: '90dvh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
          {/* Hero banner */}
          <div className="relative h-40 overflow-hidden shrink-0">
            <img src={avatarSrc} alt="" className="absolute inset-0 w-full h-full object-cover scale-110" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,12,16,0.3), rgba(10,12,16,0.9))' }} />
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                type="button"
                onClick={() => onDelete(account.id)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-950/80 text-orange-400 hover:bg-zinc-900 transition"
                title="Delete account"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-950/80 text-gray-400 hover:text-gray-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute bottom-4 left-5">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-orange-400/80">Account Briefing</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* ── Name & Level ── */}
            <div className="flex items-center justify-between gap-3 min-w-0">
              {/* Editable account name */}
              {isEditingName ? (
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <input
                    ref={nameInputRef}
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setIsEditingName(false) }}
                    className="field flex-1 text-lg font-black uppercase"
                    maxLength={64}
                  />
                  <button
                    type="button"
                    onClick={saveName}
                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-green-400/40 bg-green-400/10 text-green-300 hover:bg-green-400/20 transition"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditNameValue(account.accountName || account.id); setIsEditingName(false) }}
                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 hover:text-gray-100 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setEditNameValue(account.accountName || account.id); setIsEditingName(true) }}
                  className="group flex min-w-0 items-center gap-2 text-left"
                >
                  <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white leading-tight truncate">
                    {account.accountName || account.id}
                  </h2>
                  <Edit2 className="h-3.5 w-3.5 shrink-0 text-gray-600 group-hover:text-gray-300 transition" />
                </button>
              )}

              {/* Editable level */}
              <div className="shrink-0 flex items-center gap-2">
                {isEditingLevel ? (
                  <>
                    <input
                      type="number"
                      value={editLevelValue}
                      onChange={(e) => setEditLevelValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingLevel(false); onUpdate({ ...account, userLevel: parseInt(editLevelValue, 10) || 1 }) } }}
                      className="field w-20 text-center py-1"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => { setIsEditingLevel(false); onUpdate({ ...account, userLevel: parseInt(editLevelValue, 10) || 1 }) }}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-green-400/40 bg-green-400/10 text-green-300 hover:bg-green-400/20 transition"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingLevel(true)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-gray-300 hover:text-gray-100 transition"
                  >
                    LVL {account.userLevel ?? 1}
                    <Edit2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Account details ── */}
            <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4 space-y-3">
              {/* Activision ID */}
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-500">Activision ID</span>
                <span className="font-mono text-sm text-gray-100 truncate max-w-[200px]">{account.id}</span>
              </div>

              {/* Email */}
              {account.email ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-500">Email</span>
                  <div className="flex min-w-0 items-center gap-2 justify-end">
                    <span className="font-mono text-sm text-gray-300 break-all text-right">{account.email}</span>
                    <button type="button" onClick={copyEmail} className={`transition shrink-0 ${emailCopySuccess ? 'text-green-400' : 'text-gray-500 hover:text-gray-200'}`}>
                      {emailCopySuccess ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Password — always visible, add/edit/show/copy */}
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-[0.68rem] font-black uppercase tracking-[0.16em] text-gray-500">Password</span>
                {isEditingPassword ? (
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                    <input
                      ref={passwordInputRef}
                      type="text"
                      value={editPasswordValue}
                      onChange={(e) => setEditPasswordValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') savePassword(); if (e.key === 'Escape') setIsEditingPassword(false) }}
                      className="field font-mono text-sm py-1 flex-1 min-w-0"
                      placeholder="Enter password"
                    />
                    <button type="button" onClick={savePassword} className="shrink-0 text-green-400 hover:text-green-300 transition">
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => { setEditPasswordValue(account.password || ''); setIsEditingPassword(false) }} className="shrink-0 text-gray-500 hover:text-gray-300 transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : account.password ? (
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm text-gray-200">
                      {showPassword ? account.password : '••••••••••'}
                    </span>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-500 hover:text-gray-200 transition">
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button type="button" onClick={copyPassword} className={`transition ${copySuccess ? 'text-green-400' : 'text-gray-500 hover:text-gray-200'}`}>
                      {copySuccess ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button type="button" onClick={() => { setEditPasswordValue(account.password || ''); setIsEditingPassword(true) }} className="text-gray-500 hover:text-gray-200 transition">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEditPasswordValue(''); setIsEditingPassword(true) }}
                    className="inline-flex items-center gap-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-gray-600 hover:text-gray-300 transition"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                )}
              </div>
            </div>

            {/* ── Insured Weapon Slots ── */}
            <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 text-center">Insured Weapon Slots</p>
              <div className="flex gap-3">
                {/* Slot 1 — always unlocked */}
                <div
                  className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border"
                  style={{ borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.05)', color: '#4ade80' }}
                >
                  <span className="font-mono text-lg font-black">1</span>
                  <Unlock className="h-5 w-5" />
                </div>
                {/* Slot 2 */}
                <button
                  type="button"
                  onClick={() => onUpdate({ ...account, insuredSlot2: !account.insuredSlot2 })}
                  className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all hover:opacity-100"
                  style={account.insuredSlot2
                    ? { borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.05)', color: '#4ade80' }
                    : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: 'rgba(156,163,175,0.6)', opacity: 0.7 }
                  }
                >
                  <span className="font-mono text-lg font-black">2</span>
                  {account.insuredSlot2 ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </button>
                {/* Slot 3 */}
                <button
                  type="button"
                  onClick={() => onUpdate({ ...account, insuredSlot3: !account.insuredSlot3 })}
                  className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all hover:opacity-100"
                  style={account.insuredSlot3
                    ? { borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.05)', color: '#4ade80' }
                    : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: 'rgba(156,163,175,0.6)', opacity: 0.7 }
                  }
                >
                  <span className="font-mono text-lg font-black">3</span>
                  {account.insuredSlot3 ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* ── Shadowban Status ── */}
            <div
              className="rounded-[1.4rem] border p-5 text-center"
              style={{
                borderColor: isShadowbanned ? 'rgba(249,115,22,0.35)' : 'rgba(34,197,94,0.25)',
                background: isShadowbanned ? 'rgba(249,115,22,0.04)' : 'rgba(34,197,94,0.04)',
              }}
            >
              {isShadowbanned ? (
                <>
                  <ShieldAlert
                    className="mx-auto mb-3 h-12 w-12 text-orange-400"
                    style={{ filter: 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.5))', animation: 'shadowlistPulse 2s infinite' }}
                  />
                  <h3
                    className="text-xl font-black uppercase tracking-[0.1em] text-orange-400 mb-4"
                    style={{ textShadow: '0 0 12px rgba(249,115,22,0.4)' }}
                  >
                    Shadowban Active
                  </h3>
                  {account.shadowbanStartTime ? (
                    <CountdownTimer startTime={account.shadowbanStartTime} size="lg" />
                  ) : null}
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                    {isEditingDate ? (
                      <>
                        <input
                          type="datetime-local"
                          value={editDateValue}
                          onChange={(e) => setEditDateValue(e.target.value)}
                          className="field text-xs py-1 px-2"
                          style={{ width: 'auto' }}
                          autoFocus
                        />
                        <button type="button" onClick={saveDate} className="text-green-400 hover:text-green-300 transition"><Check className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setIsEditingDate(false)} className="text-gray-500 hover:text-gray-300 transition"><X className="h-4 w-4" /></button>
                      </>
                    ) : (
                      <>
                        <span>
                          Banned: {account.shadowbanStartTime
                            ? new Date(account.shadowbanStartTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                            : 'Unknown'}
                        </span>
                        <button type="button" onClick={handleEditDateClick} className="hover:text-gray-300 transition"><Edit2 className="h-3 w-3" /></button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <ShieldCheck
                    className="mx-auto mb-3 h-12 w-12 text-green-400"
                    style={{ filter: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.4))' }}
                  />
                  <h3 className="text-xl font-black uppercase tracking-[0.1em] text-green-400" style={{ textShadow: '0 0 12px rgba(34,197,94,0.4)' }}>
                    Account Clear
                  </h3>
                  {account.shadowbanStartTime ? (
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-500 text-center">
                      Last banned: {new Date(account.shadowbanStartTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  ) : account.shadowbanDate ? (
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-500 text-center">
                      Last banned: {account.shadowbanDate}
                    </p>
                  ) : null}
                </>
              )}

              <button
                type="button"
                onClick={toggleShadowban}
                className="mt-5 w-full inline-flex min-h-12 items-center justify-center gap-2 rounded-full border text-sm font-black uppercase tracking-[0.18em] transition"
                style={isShadowbanned
                  ? { borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)', color: '#86efac' }
                  : { borderColor: 'rgba(249,115,22,0.4)', background: 'rgba(249,115,22,0.1)', color: '#fdba74' }
                }
              >
                {isShadowbanned ? (
                  <><ShieldCheck className="h-4 w-4" /> Mark as Clear</>
                ) : (
                  <><ShieldAlert className="h-4 w-4" /> Enable Shadowban</>
                )}
              </button>
            </div>
          </div>
        </div>
    </div>
  )
}

// ─── Main Shadowlist View ──────────────────────────────────────────────────────
function Shadowlist() {
  const { isAuthenticated, profile, updateProfile, loading } = useIntel()
  const [gameAccounts, setGameAccounts] = useState(() => [])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'shadowbanned' | 'clear' | 'unknown'
  const [sortBy, setSortBy] = useState('status') // 'status' | 'level'

  // Sync gameAccounts from profile when it loads/changes, and auto-clear expired bans
  useEffect(() => {
    if (profile) {
      const accounts = profileGameAccounts(profile)
      const now = Date.now()
      let needsUpdate = false

      const nextAccounts = accounts.map((acc) => {
        if (acc.shadowbanStatus === 'shadowbanned' && acc.shadowbanStartTime) {
          if (now - acc.shadowbanStartTime >= SHADOWBAN_DURATION) {
            needsUpdate = true
            return { ...acc, shadowbanStatus: 'clear' } // Keep the startTime/date to show history
          }
        }
        return acc
      })

      if (needsUpdate) {
        // Optimistically set the state so the UI reflects the cleared accounts immediately
        setGameAccounts(nextAccounts)
        // Fire-and-forget the update to DB
        updateProfile({
          displayName: profile.display_name ?? '',
          bio: profile.bio ?? '',
          avatarIcon: profile.avatar_icon ?? 'default',
          avatarImageUrl: profile.avatar_image_url ?? '',
          bannerImageUrl: profile.banner_image_url ?? '',
          gameAccounts: nextAccounts,
        }).catch(console.error)
      } else {
        setGameAccounts(accounts)
      }
    }
  }, [profile, updateProfile])

  if (!isAuthenticated && !loading) {
    return <Navigate to="/auth" replace />
  }

  async function persistAccounts(nextAccounts) {
    setSaveError('')
    setSaving(true)
    try {
      await updateProfile({
        displayName: profile?.display_name ?? '',
        bio: profile?.bio ?? '',
        avatarIcon: profile?.avatar_icon ?? 'default',
        avatarImageUrl: profile?.avatar_image_url ?? '',
        bannerImageUrl: profile?.banner_image_url ?? '',
        gameAccounts: nextAccounts,
      })
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function addAccount(newAccount) {
    const next = [...gameAccounts, newAccount]
    setGameAccounts(next)
    setIsAddModalOpen(false)
    persistAccounts(next)
  }

  function updateAccount(updatedAccount) {
    const next = gameAccounts.map((acc) => acc.id === updatedAccount.id ? updatedAccount : acc)
    setGameAccounts(next)
    setSelectedAccount(updatedAccount)
    persistAccounts(next)
  }

  function deleteAccount(accountId) {
    const next = gameAccounts.filter((acc) => acc.id !== accountId)
    setGameAccounts(next)
    setSelectedAccount(null)
    persistAccounts(next)
  }

  // Sort & filter
  const filteredAccounts = gameAccounts
    .filter((acc) => {
      if (filterStatus === 'all') return true
      return acc.shadowbanStatus === filterStatus
    })
    .sort((a, b) => {
      if (sortBy === 'level') return (b.userLevel ?? 1) - (a.userLevel ?? 1)
      // Sort by status: shadowbanned last (show clear/unknown first), then by level
      const statusOrder = { unknown: 0, clear: 1, shadowbanned: 2 }
      const diff = (statusOrder[a.shadowbanStatus] ?? 0) - (statusOrder[b.shadowbanStatus] ?? 0)
      if (diff !== 0) return diff
      return (b.userLevel ?? 1) - (a.userLevel ?? 1)
    })

  const shadowbannedCount = gameAccounts.filter((a) => a.shadowbanStatus === 'shadowbanned').length
  const clearCount = gameAccounts.filter((a) => a.shadowbanStatus === 'clear').length

  return (
    <div className="pb-20">
      {/* Animations injected globally via a style tag */}
      <style>{`
        @keyframes shadowlistFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shadowlistSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes shadowlistPulse { 0%, 100% { filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.3)); } 50% { filter: drop-shadow(0 0 20px rgba(249, 115, 22, 0.7)); } }
        @keyframes shadowlistGoldSpin { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      `}</style>

      <PageHeader eyebrow="Intel" title="Shadowlist">
        Track every Activision account. Accounts are synced to your profile — each user sees only their own.
      </PageHeader>

      {/* Stats row */}
      {gameAccounts.length > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="panel rounded-[1.4rem] p-4 text-center">
            <p className="text-2xl font-black text-white">{gameAccounts.length}</p>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500 mt-0.5">Total</p>
          </div>
          <div className="panel rounded-[1.4rem] p-4 text-center" style={{ borderColor: shadowbannedCount > 0 ? 'rgba(249,115,22,0.2)' : undefined }}>
            <p className={`text-2xl font-black ${shadowbannedCount > 0 ? 'text-orange-400' : 'text-gray-600'}`}>{shadowbannedCount}</p>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500 mt-0.5">Banned</p>
          </div>
          <div className="panel rounded-[1.4rem] p-4 text-center" style={{ borderColor: clearCount > 0 ? 'rgba(34,197,94,0.2)' : undefined }}>
            <p className={`text-2xl font-black ${clearCount > 0 ? 'text-green-400' : 'text-gray-600'}`}>{clearCount}</p>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-500 mt-0.5">Clear</p>
          </div>
        </div>
      )}

      {/* Filter & Sort controls + Add button */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'shadowbanned', 'clear', 'unknown']).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className="inline-flex min-h-9 items-center px-3 rounded-full border text-[0.65rem] font-black uppercase tracking-[0.16em] transition"
              style={filterStatus === status
                ? { borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: '#fff' }
                : { borderColor: 'rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(156,163,175,0.8)' }
              }
            >
              {status === 'all' ? 'All' : status === 'shadowbanned' ? '⚠ Banned' : status === 'clear' ? '✓ Clear' : '? Unknown'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortBy(sortBy === 'status' ? 'level' : 'status')}
            className="inline-flex min-h-9 items-center gap-1.5 px-3 rounded-full border border-white/10 bg-white/5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-gray-400 hover:text-gray-100 transition"
          >
            Sort: {sortBy === 'status' ? 'Status' : 'Level'}
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex min-h-9 items-center gap-2 px-4 rounded-full border border-orange-400/40 bg-orange-400/10 text-[0.68rem] font-black uppercase tracking-[0.16em] text-orange-100 hover:bg-orange-400/20 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Account
          </button>
        </div>
      </div>

      {/* Save error */}
      {saveError && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
          {saveError}
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-400">
          Saving to your account…
        </div>
      )}

      {/* Account grid */}
      {filteredAccounts.length === 0 ? (
        <div className="panel rounded-[1.8rem] p-12 text-center">
          <Shield className="mx-auto mb-4 h-16 w-16 text-gray-700" />
          <h2 className="text-xl font-black uppercase tracking-[0.08em] text-gray-600 mb-2">
            {gameAccounts.length === 0 ? 'No Accounts Tracked' : 'No Results'}
          </h2>
          <p className="text-sm text-gray-600 max-w-xs mx-auto">
            {gameAccounts.length === 0
              ? 'Add an Activision account to start monitoring shadowban status.'
              : 'Try a different filter.'}
          </p>
          {gameAccounts.length === 0 && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-orange-400/40 bg-orange-400/10 px-5 text-sm font-black uppercase tracking-[0.16em] text-orange-100 hover:bg-orange-400/20 transition"
            >
              <Plus className="h-4 w-4" />
              Add First Account
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onClick={() => setSelectedAccount(account)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {isAddModalOpen && (
        <AddAccountModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={addAccount}
        />
      )}
      {selectedAccount && (
        <AccountDetailModal
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onUpdate={updateAccount}
          onDelete={deleteAccount}
        />
      )}
    </div>
  )
}

export default Shadowlist
