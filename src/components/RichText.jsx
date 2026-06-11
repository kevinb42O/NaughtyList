import React from 'react'
import { Copy, ShieldAlert, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

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

function SharedAccountWidget({ accountId, userLevel, shadowbanStatus }) {
  const isMaxLevel = Number(userLevel) >= 1250
  const isShadowbanned = shadowbanStatus === 'shadowbanned'
  const isClear = shadowbanStatus === 'clear'

  function getAvatarForLevel(level) {
    if (level >= 850) return '/avatars/skull.png'
    if (level >= 250) return '/avatars/soldier.png'
    return '/avatars/shield.png'
  }
  const avatarSrc = getAvatarForLevel(userLevel)

  function handleCopy() {
    navigator.clipboard.writeText(accountId)
    toast.success('ID copied!', { duration: 2000 })
  }

  return (
    <div className="mt-3 w-full max-w-[280px] rounded-2xl overflow-hidden bg-zinc-950/80 border p-3 flex gap-3 relative shadow-lg"
         style={{
           borderColor: isMaxLevel ? 'rgba(255, 215, 0, 0.4)' : isShadowbanned ? 'rgba(249, 115, 22, 0.3)' : isClear ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.1)'
         }}>
      {isMaxLevel && (
        <div
          className="pointer-events-none absolute inset-[-2px] rounded-2xl z-[-1]"
          style={{
            background: 'linear-gradient(90deg, #ffd700, #ff4500, #ff003c, #ff4500, #ffd700)',
            backgroundSize: '200% 200%',
            animation: 'shadowlistGoldSpin 2.5s ease-in-out infinite',
            filter: 'blur(6px)',
          }}
        />
      )}
      <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 border border-white/10 relative z-10">
        <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col min-w-0 justify-center z-10">
        <p className="text-sm font-black uppercase tracking-wider text-white truncate pr-6">{accountId}</p>
        <p className="text-[0.65rem] font-bold uppercase text-gray-400 mt-0.5">Level {userLevel}</p>
        <div className="flex items-center gap-1 mt-1.5">
           {isShadowbanned ? <ShieldAlert className="h-3 w-3 text-orange-400" /> : isClear ? <ShieldCheck className="h-3 w-3 text-green-400" /> : <ShieldAlert className="h-3 w-3 text-gray-500" />}
           <span className="text-[0.6rem] font-bold uppercase" style={{ color: isShadowbanned ? '#fb923c' : isClear ? '#4ade80' : '#9ca3af' }}>{shadowbanStatus}</span>
        </div>
      </div>
      <button onClick={handleCopy} className="absolute top-3 right-3 text-gray-500 hover:text-white transition z-10 bg-black/40 rounded-full p-1" title="Copy Activision ID">
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export default function RichText({ content, wasDeleted }) {
  if (wasDeleted) {
    return <span className="italic text-gray-400">Message removed.</span>
  }

  if (!content) return null

  const SHADOWLIST_TOKEN_REGEX = /(\[shadowlist:.*?:.*?:\w+\])/g
  const tokenParts = content.split(SHADOWLIST_TOKEN_REGEX)

  const elements = []
  const embeds = []

  tokenParts.forEach((tokenPart, tokenIndex) => {
    if (!tokenPart) return

    const shadowlistMatch = tokenPart.match(/^\[shadowlist:(.*?):(\d+):(\w+)\]$/)
    if (shadowlistMatch) {
      const accountId = decodeURIComponent(shadowlistMatch[1])
      const userLevel = parseInt(shadowlistMatch[2], 10) || 1
      const shadowbanStatus = shadowlistMatch[3]

      embeds.push(
        <SharedAccountWidget key={`sh-${tokenIndex}`} accountId={accountId} userLevel={userLevel} shadowbanStatus={shadowbanStatus} />
      )
      return
    }

    const parts = tokenPart.split(URL_REGEX)
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
        elements.push(<React.Fragment key={`${tokenIndex}-${index}`}>{part}</React.Fragment>)
      }
    })
  })

  return (
    <div className="flex flex-col">
      <span className="whitespace-pre-wrap break-words">{elements}</span>
      {embeds.length > 0 ? <div className="mt-2 flex flex-col gap-2">{embeds}</div> : null}
    </div>
  )
}
