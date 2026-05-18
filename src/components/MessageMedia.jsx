import { Maximize2, X } from 'lucide-react'
import { useState } from 'react'

function MediaLightbox({ media, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
        aria-label="Close image preview"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <img
        src={media.mediaUrl}
        alt="Shared media preview"
        className="max-h-[88vh] max-w-full rounded-2xl border border-white/10 object-contain shadow-2xl shadow-black"
      />
    </div>
  )
}

function MessageMedia({ mediaUrl, mediaType }) {
  const [open, setOpen] = useState(false)
  const isGif = mediaType === 'gif'

  if (!mediaUrl) return null

  const media = { mediaUrl, mediaType }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative mb-2 block w-full overflow-hidden rounded-xl border border-white/10 bg-black/35 text-left"
        aria-label={isGif ? 'Open GIF preview' : 'Open image preview'}
      >
        <img
          src={mediaUrl}
          alt={isGif ? 'Shared GIF' : 'Shared image'}
          loading="lazy"
          className="max-h-72 w-full min-w-52 object-cover transition duration-200 group-hover:scale-[1.015]"
        />
        <span className="absolute left-2 top-2 rounded-full border border-black/30 bg-black/70 px-2 py-1 text-[0.56rem] font-black uppercase tracking-[0.16em] text-white/85">
          {isGif ? 'GIF' : 'IMG'}
        </span>
        <span className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/70 text-white/80 opacity-0 transition group-hover:opacity-100">
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>
      {open ? <MediaLightbox media={media} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

export default MessageMedia