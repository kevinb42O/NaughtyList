import { X, Mic, MicOff, Volume2, VolumeX, PhoneOff, Users } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useIntel } from '../context/useIntel.js'
import VoiceProfileCard from './VoiceProfileCard.jsx'

export default function VoiceRoomModal({
  isOpen,
  onClose,
  roomName,
  participants,
  dominantSpeakerId,
  isMuted,
  isDeafened,
  localMutes,
  toggleMute,
  toggleDeafen,
  toggleLocalMute,
  disconnectVoice,
}) {
  const { profiles } = useIntel()

  // Map participants to full profiles if available
  const fullParticipants = useMemo(() => {
    return participants.map((participant) => {
      const fullProfile = profiles.find((p) => p.id === participant.profileId)
      return {
        participant,
        profile: fullProfile || null,
      }
    })
  }, [participants, profiles])

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Calculate an optimal grid size based on participant count
  const gridColumnsClass = 
    participants.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
    participants.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto' :
    participants.length <= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto' :
    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto'

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950/95 backdrop-blur-xl transition-all duration-300">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <Users className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-white">{roomName}</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {participants.length} Active {participants.length === 1 ? 'Operator' : 'Operators'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          aria-label="Close full view"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Main Grid Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className={`grid gap-6 ${gridColumnsClass}`}>
          {fullParticipants.map(({ participant, profile }) => (
            <VoiceProfileCard
              key={participant.id}
              participant={participant}
              profile={profile}
              isSpeaking={dominantSpeakerId === participant.id && !participant.muted}
              isLocallyMuted={localMutes?.has(participant.id)}
              onToggleLocalMute={() => toggleLocalMute(participant.id)}
            />
          ))}
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="flex shrink-0 items-center justify-center gap-4 border-t border-white/10 bg-black/60 p-6">
        <button
          type="button"
          aria-pressed={isMuted}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          onClick={toggleMute}
          className={`flex h-14 w-14 items-center justify-center rounded-full border transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
            isMuted
              ? 'border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'border-white/10 bg-zinc-800 text-gray-200 hover:bg-zinc-700'
          }`}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        <button
          type="button"
          aria-pressed={isDeafened}
          aria-label={isDeafened ? 'Turn sound on' : 'Deafen voice chat'}
          onClick={toggleDeafen}
          className={`flex h-14 w-14 items-center justify-center rounded-full border transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
            isDeafened
              ? 'border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'border-white/10 bg-zinc-800 text-gray-200 hover:bg-zinc-700'
          }`}
        >
          {isDeafened ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </button>

        <div className="h-8 w-px bg-white/10 mx-2" />

        <button
          type="button"
          onClick={() => {
            disconnectVoice()
            onClose()
          }}
          className="flex h-14 items-center justify-center gap-3 rounded-full border border-red-500/30 bg-red-500/20 px-8 text-[0.7rem] font-black uppercase tracking-[0.16em] text-red-400 transition hover:bg-red-500/30 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <PhoneOff className="h-5 w-5" />
          Disconnect
        </button>
      </footer>
    </div>
  )
}
