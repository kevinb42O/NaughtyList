import { Trash2, X } from 'lucide-react'

export default function MediaPreview({ pendingMedia, onClear }) {
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
