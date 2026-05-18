import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const tenorBaseUrl = 'https://tenor.googleapis.com/v2'
const giphyBaseUrl = 'https://api.giphy.com/v1/gifs'

function normalizeTenorGif(result) {
  const mediaFormats = result?.media_formats ?? {}
  const full = mediaFormats.gif?.url || mediaFormats.mediumgif?.url || mediaFormats.tinygif?.url
  const preview = mediaFormats.tinygif?.url || mediaFormats.nanogif?.url || full

  if (!full) return null

  return {
    id: result.id,
    title: result.content_description || result.title || 'GIF',
    previewUrl: preview,
    mediaUrl: full,
  }
}

function normalizeGiphyGif(result) {
  const full = result?.images?.original?.url || result?.images?.downsized?.url
  const preview = result?.images?.fixed_width_small?.url || result?.images?.preview_gif?.url || full

  if (!full) return null

  return {
    id: result.id,
    title: result.title || 'GIF',
    previewUrl: preview,
    mediaUrl: full,
  }
}

function GifPickerModal({ onClose, onSelect }) {
  const giphyApiKey = import.meta.env.VITE_GIPHY_API_KEY
  const tenorApiKey = import.meta.env.VITE_TENOR_API_KEY
  const provider = giphyApiKey ? 'giphy' : 'tenor'
  const apiKey = giphyApiKey || tenorApiKey
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const trimmedQuery = query.trim()
  const missingApiKey = !apiKey

  const endpoint = useMemo(() => {
    if (!apiKey) return ''

    if (provider === 'giphy') {
      const params = new URLSearchParams({
        api_key: apiKey,
        limit: '24',
        rating: 'pg-13',
        lang: 'en',
      })

      if (trimmedQuery) {
        params.set('q', trimmedQuery)
        return `${giphyBaseUrl}/search?${params.toString()}`
      }

      return `${giphyBaseUrl}/trending?${params.toString()}`
    }

    const params = new URLSearchParams({
      key: apiKey,
      client_key: 'naughtylist',
      limit: '24',
      media_filter: 'gif,tinygif,nanogif',
    })

    if (trimmedQuery) {
      params.set('q', trimmedQuery)
      return `${tenorBaseUrl}/search?${params.toString()}`
    }

    return `${tenorBaseUrl}/featured?${params.toString()}`
  }, [apiKey, provider, trimmedQuery])

  useEffect(() => {
    if (missingApiKey) {
      return undefined
    }

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      setLoading(true)
      setError('')

      fetch(endpoint)
        .then((response) => {
          if (!response.ok) throw new Error('GIF search failed.')
          return response.json()
        })
        .then((data) => {
          if (cancelled) return
          const incomingResults = provider === 'giphy' ? data.data : data.results
          const normalizeGif = provider === 'giphy' ? normalizeGiphyGif : normalizeTenorGif
          setResults((incomingResults ?? []).map(normalizeGif).filter(Boolean))
        })
        .catch((gifError) => {
          if (!cancelled) setError(gifError.message)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, trimmedQuery ? 280 : 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [endpoint, missingApiKey, provider, trimmedQuery])

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/78 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[88vh] w-full overflow-hidden rounded-t-[1.35rem] border border-white/10 bg-zinc-950 shadow-2xl shadow-black sm:max-w-3xl sm:rounded-[1.35rem]">
        <div className="flex items-center gap-2 border-b border-white/10 bg-black/35 p-3">
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-3">
            <Search className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-10 min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-100 outline-none placeholder:text-gray-600"
              placeholder="Search GIFs"
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-200 transition hover:border-red-400/40 hover:text-red-100"
            aria-label="Close GIF picker"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-3">
          {missingApiKey || error ? (
            <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-bold text-red-100">
              {missingApiKey ? 'GIF search needs a GIPHY or Tenor API key.' : error}
            </p>
          ) : null}
          {!missingApiKey && !error && loading ? (
            <p className="rounded-2xl border border-white/10 bg-black/35 p-4 text-sm font-bold text-gray-500">Loading GIFs...</p>
          ) : null}
          {!missingApiKey && !error && !loading && results.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {results.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => onSelect({ mediaUrl: gif.mediaUrl, mediaType: 'gif' })}
                  className="group aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/35 transition hover:border-red-400/45"
                  aria-label={`Select ${gif.title}`}
                >
                  <img src={gif.previewUrl} alt={gif.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                </button>
              ))}
            </div>
          ) : null}
          {!missingApiKey && !error && !loading && !results.length ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-black/35 p-4 text-sm font-bold text-gray-500">No GIFs found.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default GifPickerModal