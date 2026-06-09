import React from 'react'

const URL_REGEX = /(https?:\/\/[^\s]+)/g

function getYoutubeId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
  return match ? match[1] : null
}

function getFacebookVideoUrl(url) {
  if (url.includes('facebook.com') && (url.includes('/videos/') || url.includes('/watch'))) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=560`
  }
  return null
}

export default function RichText({ content, wasDeleted }) {
  if (wasDeleted) {
    return <span className="italic text-gray-400">Message removed.</span>
  }

  if (!content) return null

  const parts = content.split(URL_REGEX)
  const elements = []
  const embeds = []

  parts.forEach((part, index) => {
    if (part.match(URL_REGEX)) {
      const url = part
      const youtubeId = getYoutubeId(url)
      const facebookEmbed = getFacebookVideoUrl(url)

      if (youtubeId) {
        embeds.push(
          <div key={`yt-${index}`} className="mt-3 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-lg">
            <div className="relative aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          </div>
        )
      } else if (facebookEmbed) {
        embeds.push(
          <div key={`fb-${index}`} className="mt-3 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-lg">
             <div className="relative aspect-video">
              <iframe
                src={facebookEmbed}
                title="Facebook video player"
                allow="encrypted-media"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
             </div>
          </div>
        )
      }

      elements.push(
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-white underline decoration-white/30 underline-offset-2 transition hover:decoration-white"
        >
          {url}
        </a>
      )
    } else {
      elements.push(<React.Fragment key={index}>{part}</React.Fragment>)
    }
  })

  return (
    <div className="flex flex-col">
      <span className="whitespace-pre-wrap break-words">{elements}</span>
      {embeds.length > 0 ? <div className="mt-2 flex flex-col gap-2">{embeds}</div> : null}
    </div>
  )
}
