import { MicOff, VolumeX } from 'lucide-react'
import ProfileAvatar from './ProfileAvatar.jsx'
import ProfileDisplayName from './ProfileDisplayName.jsx'
import RoleBadge from './RoleBadge.jsx'
import StreakBadge from './StreakBadge.jsx'
import SupporterBadge from './SupporterBadge.jsx'
import { profileLevel } from '../utils/gamification.js'
import { displayProfileName } from '../utils/profiles.js'

export default function VoiceProfileCard({ profile, participant, isSpeaking, isLocallyMuted, onToggleLocalMute }) {
  // Use the profile if available, fallback to participant payload
  const displayProfile = profile || participant
  const level = profileLevel(displayProfile)
  const avatarUrl = displayProfile?.avatar_image_url || participant?.avatar_image_url || ''
  const isMuted = participant?.muted

  const cardStyle = avatarUrl
    ? {
        backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.6) 40%, rgba(0, 0, 0, 0.3) 100%), url("${avatarUrl}")`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }
    : {
        background: 'linear-gradient(to bottom right, rgba(20, 20, 25, 0.9), rgba(10, 10, 12, 0.95))',
      }

  return (
    <article
      className={`relative flex flex-col justify-end overflow-hidden rounded-2xl p-4 transition-all duration-200 ${
        isSpeaking
          ? 'ring-4 ring-emerald-500 ring-offset-4 ring-offset-zinc-950 scale-[1.02] shadow-[0_0_30px_rgba(16,185,129,0.3)]'
          : 'ring-1 ring-white/10 hover:ring-white/20'
      }`}
      style={{ ...cardStyle, aspectRatio: '3/4' }}
      aria-label={`${displayProfileName(displayProfile)} ${isSpeaking ? 'speaking' : ''} ${isMuted ? 'muted' : ''}`}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {isMuted && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-red-400">
            <MicOff className="h-4 w-4" aria-label="Microphone muted" />
          </div>
        )}
        {!participant?.isMe && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleLocalMute()
            }}
            aria-pressed={isLocallyMuted}
            aria-label={isLocallyMuted ? "Unmute user locally" : "Mute user locally"}
            className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
              isLocallyMuted 
                ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30' 
                : 'bg-black/60 border-white/10 text-gray-400 hover:text-white hover:bg-black/80'
            }`}
          >
            <VolumeX className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="z-10 flex flex-col items-center text-center">
        <div className={`relative mb-3 transition-transform duration-300 ${isSpeaking ? 'scale-110' : 'scale-100'}`}>
          <ProfileAvatar 
            profile={displayProfile} 
            size="2xl" 
            className={`shadow-2xl ${isSpeaking ? 'ring-4 ring-emerald-400' : 'ring-2 ring-white/20'}`} 
          />
        </div>
        
        <h2 className="mb-1.5 truncate w-full text-lg font-black uppercase tracking-wider text-white drop-shadow-md">
          <ProfileDisplayName profile={displayProfile} />
        </h2>
        
        <div className="flex flex-wrap justify-center items-center gap-1.5 drop-shadow-md">
          <RoleBadge role={displayProfile.role} compact />
          <StreakBadge compact profile={displayProfile} />
          <SupporterBadge compact profile={displayProfile} />
          {level > 0 && (
            <span className="inline-flex min-h-6 items-center rounded-full border border-cyan-400/30 bg-cyan-400/20 px-2 text-[0.55rem] font-black uppercase tracking-widest text-cyan-100 backdrop-blur-sm">
              LV {level}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
