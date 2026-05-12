/* eslint-disable react-refresh/only-export-components */
import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export const messageReactionOptions = [
  { key: 'heart', label: '❤️', title: 'Heart' },
  { key: 'rofl', label: '🤣', title: 'ROFL' },
  { key: 'sad_tear', label: '😢', title: 'Sad tear' },
  { key: 'xd', label: '😆', title: 'XD' },
  { key: 'middle_finger', label: '🖕', title: 'Middle finger' },
]

export const messageReactionKeys = messageReactionOptions.map((option) => option.key)

function MessageReactions({ align = 'left', currentUserId, disabled = false, message, onReact }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const reactions = message?.reactions ?? []
  const myReaction = reactions.find((reaction) => reaction.user_id === currentUserId)?.reaction ?? ''
  const countsByReaction = reactions.reduce((nextCounts, reaction) => {
    nextCounts[reaction.reaction] = (nextCounts[reaction.reaction] ?? 0) + 1
    return nextCounts
  }, {})
  const latestReaction = [...reactions].sort((first, second) => {
    return new Date(second.created_at) - new Date(first.created_at)
  })[0]
  const badgeReaction = myReaction || latestReaction?.reaction || ''
  const badgeOption = messageReactionOptions.find((option) => option.key === badgeReaction)
  const badgeCount = badgeReaction ? countsByReaction[badgeReaction] ?? 0 : 0

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
      className="contents"
    >
      {badgeOption ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          title={badgeOption.title}
          aria-label={`Reaction: ${badgeOption.title}`}
          className="absolute -bottom-3 right-2 z-10 inline-flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-full border border-white/15 bg-zinc-950 px-1.5 text-sm shadow-lg shadow-black/50 ring-1 ring-black/40 transition hover:border-red-400/40 hover:bg-zinc-900 disabled:opacity-60"
        >
          <span>{badgeOption.label}</span>
          {badgeCount > 1 ? <span className="text-[0.58rem] font-black text-gray-300">{badgeCount}</span> : null}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((currentlyOpen) => !currentlyOpen)}
        disabled={disabled}
        aria-expanded={open}
        aria-label="Add reaction"
        title="Add reaction"
        className="absolute -bottom-3 left-2 z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-gray-400 shadow-lg shadow-black/40 transition hover:border-red-400/45 hover:bg-red-500/10 hover:text-gray-100 disabled:opacity-60"
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
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default MessageReactions