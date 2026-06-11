import { Maximize2, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import VoiceMessagePlayer from './VoiceMessagePlayer.jsx'

function MediaLightbox({ media, onClose }) {
  const closeButtonRef = useRef(null)
  const isGif = media.mediaType === 'gif'

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const lightbox = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-label={isGif ? 'Fullscreen GIF preview' : 'Fullscreen image preview'}
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-zinc-950/80 text-white shadow-lg shadow-black/40 transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-label="Close image preview"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <img
        src={media.mediaUrl}
        alt={isGif ? 'Shared GIF fullscreen preview' : 'Shared image fullscreen preview'}
        className="max-h-[92svh] max-w-full select-none rounded-xl border border-white/10 object-contain shadow-2xl shadow-black sm:max-h-[90vh]"
        draggable="false"
      />
    </div>
  )

  return createPortal(lightbox, document.body)
}

function MessageMedia({ mediaUrl, mediaType, onDelete, deleting = false }) {
  const [open, setOpen] = useState(false)
  const isGif = mediaType === 'gif'
  const isAudio = mediaType === 'audio'

  if (!mediaUrl) return null

  const media = { mediaUrl, mediaType }
  const deleteLabel = isAudio ? 'Delete voice message' : isGif ? 'Delete GIF from message' : 'Delete picture from message'

  if (isAudio) {
    return (
      <div className="relative mb-2 w-full">
        <VoiceMessagePlayer mediaUrl={mediaUrl} />
        {onDelete ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
            disabled={deleting}
            className="absolute -right-2 -top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-gray-400 shadow-lg shadow-black/30 transition hover:border-white/10 hover:text-white disabled:opacity-60"
            aria-label={deleteLabel}
            title={deleteLabel}
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <div className="relative mb-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group block w-full overflow-hidden rounded-xl border border-white/10 bg-black/35 text-left"
          aria-label={isGif ? 'Open GIF preview' : 'Open image preview'}
        >
          <span className="chat-media-frame">
            <img
              src={mediaUrl}
              alt={isGif ? 'Shared GIF' : 'Shared image'}
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </span>
          <span className="absolute left-2 top-2 rounded-full border border-black/30 bg-black/70 px-2 py-1 text-[0.56rem] font-black uppercase tracking-[0.16em] text-white/85">
            {isGif ? 'GIF' : 'IMG'}
          </span>
          <span className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/70 text-white/80 opacity-0 transition group-hover:opacity-100">
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>

        {onDelete ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
            disabled={deleting}
            className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-100 shadow-lg shadow-black/30 transition hover:border-white/10 hover:bg-white/5 disabled:opacity-60"
            aria-label={deleteLabel}
            title={deleteLabel}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {open ? <MediaLightbox media={media} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

export default MessageMedia