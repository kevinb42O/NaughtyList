import { LoaderCircle, Plus, Send, Sticker, X } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { imageAcceptValue, uploadChatImage } from '../utils/media.js'
import GifPickerModal from './GifPickerModal.jsx'

const composerMinHeight = 36
const composerMaxHeight = 128

function MediaPreview({ pendingMedia, onClear }) {
  if (!pendingMedia?.mediaUrl) return null

  return (
    <div className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-2 shadow-sm shadow-black/30">
      <img src={pendingMedia.mediaUrl} alt="Pending attachment" className="h-14 w-14 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-gray-500">Ready to send</p>
        <p className="truncate text-sm font-bold text-gray-200">{pendingMedia.mediaType === 'gif' ? 'GIF selected' : 'Image attached'}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-300 transition hover:border-indigo-400/40 hover:text-indigo-100"
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
  accessory = null,
  onTyping,
}) {
  const fileInputRef = useRef(null)
  const formRef = useRef(null)
  const lastTextAreaHeightRef = useRef(composerMinHeight)
  const textAreaRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [gifPickerOpen, setGifPickerOpen] = useState(false)
  const canSend = !disabled && !sending && !uploading && Boolean(value.trim() || pendingMedia?.mediaUrl)

  useLayoutEffect(() => {
    const textArea = textAreaRef.current
    if (!textArea) return

    if (!value) {
      if (lastTextAreaHeightRef.current !== composerMinHeight) {
        lastTextAreaHeightRef.current = composerMinHeight
        textArea.style.height = `${composerMinHeight}px`
      }
      textArea.scrollTop = 0
      return
    }

    const nextHeight = Math.min(Math.max(textArea.scrollHeight, composerMinHeight), composerMaxHeight)
    const shouldGrow = nextHeight > lastTextAreaHeightRef.current + 1
    const shouldInitialize = !textArea.style.height

    if (shouldGrow || shouldInitialize) {
      lastTextAreaHeightRef.current = nextHeight
      textArea.style.height = `${nextHeight}px`
    }
  }, [value])

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
      <form ref={formRef} onSubmit={onSubmit} className="chat-composer-form border-t border-white/10 bg-black/40 p-2.5 sm:p-3">
        <MediaPreview pendingMedia={pendingMedia} onClear={() => onPendingMediaChange(null)} />
        {uploading ? (
          <div className="mb-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-1 bg-indigo-300 transition-all" style={{ width: `${Math.max(8, uploadProgress)}%` }} />
          </div>
        ) : null}
        {accessory}
        <div className="chat-composer-bar flex min-h-12 items-center gap-1.5 rounded-full border border-white/10 bg-zinc-950/90 px-1.5 py-1.5 shadow-inner shadow-black/35">
          <input ref={fileInputRef} type="file" accept={imageAcceptValue} onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || sending || uploading}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/8 hover:text-gray-100 disabled:opacity-40"
            aria-label="Attach image"
            title="Attach image"
          >
            {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => setGifPickerOpen(true)}
            disabled={disabled || sending || uploading}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/8 hover:text-gray-100 disabled:opacity-40"
            aria-label="Choose GIF"
            title="Choose GIF"
          >
            <Sticker className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="chat-composer-input-shell flex min-w-0 flex-1 items-center rounded-full bg-white/[0.06] px-3">
            <textarea
              ref={textAreaRef}
              value={value}
              onChange={(event) => {
                onChange(event.target.value)
                if (event.target.value.trim()) {
                  onTyping?.()
                }
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
                  return
                }

                event.preventDefault()
                if (canSend) {
                  formRef.current?.requestSubmit()
                }
              }}
              className="chat-composer-textarea max-h-32 min-h-9 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent py-1.5 text-[0.95rem] leading-6 text-gray-100 outline-none placeholder:text-gray-500"
              placeholder={placeholder}
              maxLength={maxLength}
              disabled={disabled}
              autoComplete="off"
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-950/25 transition hover:bg-indigo-400 disabled:bg-white/10 disabled:text-gray-600 disabled:shadow-none"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
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
