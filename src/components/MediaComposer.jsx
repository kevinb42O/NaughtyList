import { Image, LoaderCircle, Send, Sticker, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { allowedImageTypes, uploadChatImage } from '../utils/media.js'
import GifPickerModal from './GifPickerModal.jsx'

function MediaPreview({ pendingMedia, onClear }) {
  if (!pendingMedia?.mediaUrl) return null

  return (
    <div className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 p-2">
      <img src={pendingMedia.mediaUrl} alt="Pending attachment" className="h-16 w-16 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-gray-500">Attachment Ready</p>
        <p className="truncate text-sm font-bold text-gray-200">{pendingMedia.mediaType === 'gif' ? 'GIF selected' : 'Image uploaded'}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-300 transition hover:border-red-400/40 hover:text-red-100"
        aria-label="Remove attachment"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

function MediaComposer({
  value,
  onChange,
  onSubmit,
  pendingMedia,
  onPendingMediaChange,
  onError,
  placeholder,
  maxLength,
  disabled = false,
  sending = false,
}) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [gifPickerOpen, setGifPickerOpen] = useState(false)
  const canSend = !disabled && !sending && !uploading && Boolean(value.trim() || pendingMedia?.mediaUrl)

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setUploading(true)
    setUploadProgress(0)
    onError?.('')

    try {
      const media = await uploadChatImage(supabase, file, setUploadProgress)
      onPendingMediaChange(media)
    } catch (uploadError) {
      onError?.(uploadError.message)
    } finally {
      setUploading(false)
      window.setTimeout(() => setUploadProgress(0), 400)
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="border-t border-white/10 bg-black/40 p-3 sm:p-4">
        <MediaPreview pendingMedia={pendingMedia} onClear={() => onPendingMediaChange(null)} />
        {uploading ? (
          <div className="mb-2 overflow-hidden rounded-full border border-white/10 bg-black/35">
            <div className="h-2 bg-red-400 transition-all" style={{ width: `${Math.max(8, uploadProgress)}%` }} />
          </div>
        ) : null}
        <div className="grid gap-2 rounded-[1.25rem] border border-white/10 bg-zinc-950/80 p-1.5 shadow-inner shadow-black/40 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto]">
          <input ref={fileInputRef} type="file" accept={allowedImageTypes.join(',')} onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || sending || uploading}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-gray-300 transition hover:border-red-400/40 hover:text-red-100 disabled:opacity-45"
            aria-label="Attach image"
            title="Attach image"
          >
            {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Image className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => setGifPickerOpen(true)}
            disabled={disabled || sending || uploading}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-gray-300 transition hover:border-red-400/40 hover:text-red-100 disabled:opacity-45"
            aria-label="Choose GIF"
            title="Choose GIF"
          >
            <Sticker className="h-4 w-4" aria-hidden="true" />
          </button>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-h-11 rounded-2xl border-0 bg-transparent px-3 text-[0.95rem] text-gray-100 outline-none placeholder:text-gray-600"
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-400/40 bg-red-500/18 px-4 text-sm font-black uppercase tracking-[0.12em] text-red-50 transition hover:bg-red-500/28 disabled:opacity-45"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send
          </button>
        </div>
      </form>
      {gifPickerOpen ? (
        <GifPickerModal
          onClose={() => setGifPickerOpen(false)}
          onSelect={(media) => {
            onPendingMediaChange(media)
            setGifPickerOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

export default MediaComposer