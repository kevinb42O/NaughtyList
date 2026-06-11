import { useEffect, useState } from 'react'
import { LinkIcon } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

export default function LinkPreview({ url }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchPreview() {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-link-preview', {
          body: { url },
        })

        if (cancelled) return

        if (fnError || data?.error) {
          setError(true)
        } else {
          setPreview(data)
        }
      } catch (e) {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPreview()

    return () => {
      cancelled = true
    }
  }, [url])

  if (loading) {
    return (
      <div className="mt-2 flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 animate-pulse">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-white/5" />
        <div className="min-w-0 flex-1">
          <div className="h-3 w-2/3 rounded-full bg-white/10" />
          <div className="mt-2 h-2 w-1/2 rounded-full bg-white/5" />
        </div>
      </div>
    )
  }

  if (error || !preview || (!preview.title && !preview.image && !preview.description)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline decoration-white/30 underline-offset-2 transition hover:decoration-white">
        {url}
      </a>
    )
  }

  let hostname = url
  try {
    hostname = new URL(preview.url || url).hostname.replace(/^www\./, '')
  } catch (e) {}

  return (
    <a href={preview.url || url} target="_blank" rel="noopener noreferrer" className="mt-2 group flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-lg transition hover:border-white/20 hover:bg-black/50">
      {preview.image ? (
        <div className="relative aspect-[2/1] w-full overflow-hidden bg-black/50 border-b border-white/5">
          <img src={preview.image} alt={preview.title || 'Link preview'} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        </div>
      ) : null}
      <div className="flex flex-col p-3">
        <h4 className="line-clamp-1 text-sm font-bold text-white">{preview.title || url}</h4>
        {preview.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">{preview.description}</p>
        ) : null}
        <div className="mt-2 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-gray-500">
          <LinkIcon className="h-3 w-3" />
          <span className="truncate">{hostname}</span>
        </div>
      </div>
    </a>
  )
}
