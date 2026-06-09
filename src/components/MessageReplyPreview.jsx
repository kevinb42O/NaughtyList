import { MessageSquareQuote, X } from 'lucide-react'
import { mediaPreviewLabel } from '../utils/media.js'
import { clanPrefix, displayProfileName } from '../utils/profiles.js'

function replyAuthorLabel(message, currentUserId) {
  if (!message) {
    return 'Original message'
  }

  const authorProfile = message?.profile || message?.sender

  if (message?.user_id === currentUserId || message?.sender_id === currentUserId) {
    return 'You'
  }

  return `${clanPrefix(authorProfile)} ${displayProfileName(authorProfile)}`.trim()
}

function replyBodyLabel(message) {
  if (!message) {
    return 'Original message unavailable'
  }

  if (message.deleted_at) {
    return 'Message removed.'
  }

  return mediaPreviewLabel(message) || 'Message'
}

function MessageReplyPreview({ currentUserId, message, onCancel, tone = 'bubble' }) {
  const bubbleTone = tone === 'composer'
    ? 'mb-2 border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-indigo-50'
    : 'mb-2 border-white/10 bg-black/25 px-3 py-2 text-gray-200'

  return (
    <div className={`flex min-w-0 items-start gap-2 rounded-xl border ${bubbleTone}`}>
      <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-200" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.14em] text-indigo-200/90">
          {replyAuthorLabel(message, currentUserId)}
        </p>
        <p className="truncate text-xs font-bold text-current/75">{replyBodyLabel(message)}</p>
      </div>
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-current/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Cancel reply"
          title="Cancel reply"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

export default MessageReplyPreview
