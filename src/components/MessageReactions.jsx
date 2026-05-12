export const messageReactionOptions = [
  { key: 'middle_finger', label: '🖕', title: 'Middle finger' },
  { key: 'heart', label: '❤️', title: 'Heart' },
  { key: 'rofl', label: '🤣', title: 'ROFL' },
  { key: 'sad_tear', label: '😢', title: 'Sad tear' },
  { key: 'xd', label: 'XD', title: 'XD' },
]

export const messageReactionKeys = messageReactionOptions.map((option) => option.key)

function MessageReactions({ align = 'left', currentUserId, disabled = false, message, onReact }) {
  const reactions = message?.reactions ?? []
  const myReaction = reactions.find((reaction) => reaction.user_id === currentUserId)?.reaction ?? ''
  const counts = reactions.reduce((nextCounts, reaction) => {
    nextCounts[reaction.reaction] = (nextCounts[reaction.reaction] ?? 0) + 1
    return nextCounts
  }, {})

  return (
    <div className={`mt-1.5 flex flex-wrap gap-1.5 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      {messageReactionOptions.map((option) => {
        const count = counts[option.key] ?? 0
        const selected = myReaction === option.key

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onReact?.(message, option.key)}
            disabled={disabled}
            title={option.title}
            aria-label={`${selected ? 'Remove' : 'React with'} ${option.title}`}
            className={`inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-full border px-2 text-[0.72rem] font-black transition disabled:opacity-60 ${
              selected
                ? 'border-red-400/60 bg-red-500/18 text-white shadow-[0_0_18px_rgba(239,68,68,0.22)]'
                : count
                  ? 'border-white/15 bg-white/8 text-gray-100 hover:border-red-400/40 hover:bg-red-500/10'
                  : 'border-white/10 bg-black/20 text-gray-400 hover:border-red-400/35 hover:text-gray-100'
            }`}
          >
            <span className={option.key === 'xd' ? 'text-[0.62rem] tracking-[0.08em]' : 'text-sm'}>
              {option.label}
            </span>
            {count ? <span className="text-[0.62rem] text-gray-300">{count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export default MessageReactions