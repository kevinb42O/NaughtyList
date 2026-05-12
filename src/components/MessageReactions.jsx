import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export const messageReactionOptions = [
  { key: 'heart', label: '❤️', title: 'Heart' },
  { key: 'rofl', label: '🤣', title: 'ROFL' },
  { key: 'sad_tear', label: '😢', title: 'Sad tear' },
  { key: 'xd', label: '>_<', title: 'XD' },
  { key: 'middle_finger', label: '🖕', title: 'Middle finger' },
]

export const messageReactionKeys = messageReactionOptions.map((option) => option.key)

function MessageReactions({ align = 'left', currentUserId, disabled = false, message, onReact }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const reactions = message?.reactions ?? []
  const myReaction = reactions.find((reaction) => reaction.user_id === currentUserId)?.reaction ?? ''
  const counts = reactions.reduce((nextCounts, reaction) => {
    nextCounts[reaction.reaction] = (nextCounts[reaction.reaction] ?? 0) + 1
    return nextCounts
  }, {})
  const activeOptions = messageReactionOptions.filter((option) => counts[option.key])
  const hasReactions = Boolean(activeOptions.length)

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  async function handleReact(optionKey) {
    await onReact?.(message, optionKey)
    setOpen(false)
  }

  return (
    <div
      ref={containerRef}
      className={`relative mt-1.5 flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : 'justify-start'}`}
    >
      {hasReactions ? (
        <div className="flex flex-wrap items-center gap-1">
          {activeOptions.map((option) => {
            const selected = myReaction === option.key

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => handleReact(option.key)}
                disabled={disabled}
                title={option.title}
                aria-label={`${selected ? 'Remove' : 'React with'} ${option.title}`}
                className={`inline-flex min-h-7 items-center justify-center gap-1 rounded-full border px-2 text-[0.68rem] font-black transition disabled:opacity-60 ${
                  selected
                    ? 'border-red-400/55 bg-red-500/18 text-white'
                    : 'border-white/12 bg-black/30 text-gray-300 hover:border-red-400/35 hover:text-gray-100'
                }`}
              >
                <span className={option.key === 'xd' ? 'text-[0.62rem] tracking-normal' : 'text-sm'}>
                  {option.label}
                </span>
                <span className="text-[0.62rem] text-gray-300">{counts[option.key]}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((currentlyOpen) => !currentlyOpen)}
        disabled={disabled}
        aria-expanded={open}
        aria-label="Add reaction"
        title="Add reaction"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/35 text-gray-400 transition hover:border-red-400/45 hover:bg-red-500/10 hover:text-gray-100 disabled:opacity-60"
      >
        {open ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>

      {open ? (
        <div
          className={`absolute bottom-8 z-20 flex items-center gap-1 rounded-full border border-white/12 bg-zinc-950/95 p-1.5 shadow-2xl shadow-black/60 ring-1 ring-red-500/10 backdrop-blur ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {messageReactionOptions.map((option) => {
            const selected = myReaction === option.key

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => handleReact(option.key)}
                disabled={disabled}
                title={option.title}
                aria-label={`${selected ? 'Remove' : 'React with'} ${option.title}`}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border text-base font-black transition hover:-translate-y-0.5 disabled:opacity-60 ${
                  selected
                    ? 'border-red-400/60 bg-red-500/20 text-white shadow-[0_0_18px_rgba(239,68,68,0.24)]'
                    : 'border-transparent bg-white/[0.04] text-gray-200 hover:border-white/15 hover:bg-white/10'
                }`}
              >
                <span className={option.key === 'xd' ? 'px-1 text-[0.72rem] tracking-normal' : ''}>
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default MessageReactions