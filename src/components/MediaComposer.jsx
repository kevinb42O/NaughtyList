import { LoaderCircle, Mic, Plus, Send, Square, Sticker, Trash2, X, Image as ImageIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { imageAcceptValue, uploadChatAudio, uploadChatImage } from '../utils/media.js'
import GifPickerModal from './GifPickerModal.jsx'

const composerMinHeight = 36
const composerMaxHeight = 128

function MediaPreview({ pendingMedia, onClear }) {
  if (!pendingMedia?.mediaUrl) return null

  return (
    <div className={`mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-2 shadow-sm shadow-black/30 ${pendingMedia.mediaType === 'audio' ? 'flex-col sm:flex-row items-stretch sm:items-center' : ''}`}>
      {pendingMedia.mediaType === 'audio' ? (
        <audio controls src={pendingMedia.mediaUrl} className="w-full max-w-[280px] h-10 outline-none filter drop-shadow-md [&::-webkit-media-controls-panel]:bg-white/10 [&::-webkit-media-controls-play-button]:bg-white/80 [&::-webkit-media-controls-current-time-display]:text-white [&::-webkit-media-controls-time-remaining-display]:text-white" preload="auto" />
      ) : (
        <img src={pendingMedia.mediaUrl} alt="Pending attachment" className="h-14 w-14 rounded-xl object-cover" />
      )}
      
      {pendingMedia.mediaType !== 'audio' ? (
        <div className="min-w-0 flex-1">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-gray-500">Ready to send</p>
          <p className="truncate text-sm font-bold text-gray-200">{pendingMedia.mediaType === 'gif' ? 'GIF selected' : 'Image attached'}</p>
        </div>
      ) : (
        <div className="flex-1 hidden sm:block" />
      )}
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 self-end sm:self-auto"
        aria-label="Delete attachment"
        title="Delete attachment"
      >
        {pendingMedia.mediaType === 'audio' ? <Trash2 className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const waveformContainerRef = useRef(null)
  const canSend = !disabled && !sending && !uploading && !isRecording && Boolean(value.trim() || pendingMedia?.mediaUrl)

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

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

  async function processFile(file) {
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

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    processFile(file)
  }

  async function handlePaste(event) {
    if (uploading) return
    const items = event.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          event.preventDefault()
          processFile(file)
          break
        }
      }
    }
  }

  async function handleRecordStart() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {})
        }
        setIsRecording(false)
        setRecordingDuration(0)

        if (audioChunksRef.current.length > 0) {
          const mimeType = mediaRecorder.mimeType || 'audio/webm'
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
          const audioFile = new File([audioBlob], `voice-message-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`, { type: mimeType })
          
          setUploading(true)
          setUploadProgress(0)
          onError?.('')

          try {
            const media = await uploadChatAudio(supabase, audioFile, setUploadProgress)
            onPendingMediaChange(media)
          } catch (uploadError) {
            onError?.(uploadError.message)
          } finally {
            setUploading(false)
            window.setTimeout(() => setUploadProgress(0), 400)
          }
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingDuration(0)
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        audioContextRef.current = new AudioContextClass()
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 64
        const source = audioContextRef.current.createMediaStreamSource(stream)
        source.connect(analyserRef.current)

        const drawWaveform = () => {
          if (!analyserRef.current || !waveformContainerRef.current) return
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)
          
          const bars = waveformContainerRef.current.children
          for (let i = 0; i < bars.length && i < dataArray.length; i++) {
            const value = dataArray[i]
            const height = Math.max(15, (value / 255) * 100)
            bars[i].style.height = `${height}%`
            if (value > 120) {
              bars[i].style.backgroundColor = 'rgba(52, 211, 153, 1)'
              bars[i].style.boxShadow = '0 0 6px rgba(52, 211, 153, 0.5)'
            } else {
              bars[i].style.backgroundColor = 'rgba(52, 211, 153, 0.4)'
              bars[i].style.boxShadow = 'none'
            }
          }
          animationFrameRef.current = requestAnimationFrame(drawWaveform)
        }
        drawWaveform()
      } catch (err) {
        console.warn('Audio visualization not supported', err)
      }
    } catch (error) {
      onError?.('Microphone access denied or unavailable.')
    }
  }

  function handleRecordStop() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  function handleRecordCancel() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      audioChunksRef.current = [] // clear chunks so onstop does nothing
      mediaRecorderRef.current.stop()
    }
  }

  function formatDuration(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <>
      <form ref={formRef} onSubmit={onSubmit} className="chat-composer-form border-t border-white/10 bg-black/40 p-2.5 sm:p-3">
        <MediaPreview pendingMedia={pendingMedia} onClear={() => onPendingMediaChange(null)} />
        {uploading ? (
          <div className="mb-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-1 bg-white/10 transition-all" style={{ width: `${Math.max(8, uploadProgress)}%` }} />
          </div>
        ) : null}
        {accessory}
        <div className="chat-composer-bar flex min-h-12 items-center gap-1.5 rounded-full border border-white/10 bg-zinc-950/90 px-1.5 py-1.5 shadow-inner shadow-black/35">
          {isRecording ? (
            <div className="flex flex-1 items-center gap-3 px-3">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              <span className="text-sm font-bold text-red-400">{formatDuration(recordingDuration)}</span>
              <div ref={waveformContainerRef} className="flex h-6 flex-1 items-center justify-center gap-[2px] px-2 sm:px-4">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded-full bg-emerald-400/40 transition-all duration-75" style={{ height: '15%' }} />
                ))}
              </div>
              <button
                type="button"
                onClick={handleRecordCancel}
                className="text-xs font-black uppercase tracking-[0.1em] text-gray-500 hover:text-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <input ref={fileInputRef} type="file" accept={imageAcceptValue} onChange={handleFileChange} className="hidden" />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  disabled={disabled || sending || uploading}
                  className="relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                  aria-label="Add attachment"
                  title="Add attachment"
                >
                  {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className={`h-5 w-5 transition-transform duration-200 ${menuOpen ? 'rotate-45 text-white' : ''}`} aria-hidden="true" />}
                </button>
                
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                    <div className="absolute bottom-full left-0 z-10 mb-2 flex w-48 origin-bottom-left flex-col gap-1 rounded-2xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); fileInputRef.current?.click(); }}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-200 transition hover:bg-white/10"
                      >
                        <ImageIcon className="h-4.5 w-4.5 text-blue-400" />
                        Photo / Video
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); setGifPickerOpen(true); }}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-200 transition hover:bg-white/10"
                      >
                        <Sticker className="h-4.5 w-4.5 text-pink-400" />
                        GIF
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); handleRecordStart(); }}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-200 transition hover:bg-white/10"
                      >
                        <Mic className="h-4.5 w-4.5 text-red-400" />
                        Voice Message
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="chat-composer-input-shell flex min-w-0 flex-1 items-center rounded-full bg-white/[0.06] px-3">
                <textarea
                  ref={textAreaRef}
                  value={value}
                  onChange={(event) => {
                    onChange(event.target.value)
                    if (menuOpen) setMenuOpen(false)
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
                  onPaste={handlePaste}
                />
              </div>
            </>
          )}

          {isRecording ? (
            <button
              type="button"
              onClick={handleRecordStop}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white shadow-lg shadow-white/5 transition hover:bg-white/10"
              aria-label="Stop and attach recording"
            >
              <Square className="h-4 w-4 fill-white" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white shadow-lg shadow-white/5 transition hover:bg-white/10 disabled:bg-white/5 disabled:text-gray-600 disabled:shadow-none"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
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
