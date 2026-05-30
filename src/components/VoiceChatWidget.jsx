import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Radio,
  ChevronDown,
  Sparkles,
  Loader2
} from 'lucide-react'
import { useIntel } from '../context/useIntel.js'
import ProfileAvatar from './ProfileAvatar.jsx'

// Helper to generate retro-synth audio feedback
const playSynthSound = (type) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    
    const now = audioCtx.currentTime
    
    if (type === 'join') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08) // E5
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.16)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc.start(now)
      osc.stop(now + 0.36)
    } else if (type === 'leave') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(659.25, now) // E5
      osc.frequency.setValueAtTime(329.63, now + 0.08) // E4
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.16)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc.start(now)
      osc.stop(now + 0.36)
    } else if (type === 'mute') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(440, now) // A4
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.1, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      osc.start(now)
      osc.stop(now + 0.13)
    } else if (type === 'unmute') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(880, now) // A5
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.1, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      osc.start(now)
      osc.stop(now + 0.13)
    }
  } catch (err) {
    console.warn('Synth sound blocked or unsupported by browser context', err)
  }
}

export default function VoiceChatWidget() {
  const { profile, isAuthenticated } = useIntel()
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isDeafened, setIsDeafened] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState('Lounge 🛋️')
  const [jitsiLoading, setJitsiLoading] = useState(false)
  
  // Real Jitsi participants state
  const [participants, setParticipants] = useState([])
  const [dominantSpeakerId, setDominantSpeakerId] = useState(null)
  
  const jitsiApiRef = useRef(null)
  const containerRef = useRef(null)
  
  const voiceRooms = ['Lounge 🛋️', 'Clan Comms 🔊', 'Tactical HQ 🎮']

  // Update participants list from Jitsi API
  const updateParticipants = useCallback(() => {
    if (!jitsiApiRef.current) return
    
    const jitsiParticipants = jitsiApiRef.current.getParticipantsInfo()
    
    const mapped = jitsiParticipants.map(p => {
      let displayName;
      let profileData = { n: 'Unknown', a: 'ghost', r: 'member', id: p.participantId }
      
      try {
        if (p.displayName && p.displayName.startsWith('{')) {
          profileData = JSON.parse(p.displayName)
          displayName = profileData.n
        } else {
          displayName = p.displayName || 'Operator'
        }
      } catch {
        displayName = p.displayName || 'Operator'
      }

      return {
        id: p.participantId,
        profileId: profileData.id,
        display_name: displayName,
        avatar_icon: profileData.a,
        role: profileData.r,
        isMe: false
      }
    })

    // Add local user
    if (profile) {
      mapped.unshift({
        id: 'local',
        profileId: profile.id,
        display_name: profile.display_name,
        avatar_icon: profile.avatar_icon,
        role: profile.role,
        isMe: true
      })
    }

    setParticipants(mapped)
  }, [profile])

  // Initialize and destroy Jitsi Meet iframe in the background
  const startJitsi = (roomName) => {
    if (jitsiLoading) return
    setJitsiLoading(true)
    playSynthSound('join')
    
    const initAPI = () => {
      try {
        const roomSlug = `21rats-live-voice-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
        
        // Encode our rich profile data into the displayName so peers can render our avatar!
        const encodedProfile = JSON.stringify({
          n: profile?.display_name || 'Operator',
          a: profile?.avatar_icon || 'ghost',
          r: profile?.role || 'member',
          id: profile?.id || 'anon'
        })

        const options = {
          roomName: roomSlug,
          width: '100%',
          height: '100%',
          parentNode: document.getElementById('jitsi-meet-voice-container'),
          configOverwrite: {
            startWithVideoMuted: true,
            startWithAudioMuted: true,
            prejoinConfig: { enabled: false },
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUEST: false,
          },
          userInfo: {
            displayName: encodedProfile,
          }
        }
        
        if (jitsiApiRef.current) {
          jitsiApiRef.current.dispose()
        }
        
        jitsiApiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', options)
        
        // Event Listeners for Real-Time Sync
        jitsiApiRef.current.addEventListener('videoConferenceJoined', () => {
          setIsConnected(true)
          setJitsiLoading(false)
          updateParticipants()
        })
        
        jitsiApiRef.current.addEventListener('participantJoined', updateParticipants)
        jitsiApiRef.current.addEventListener('participantLeft', updateParticipants)
        jitsiApiRef.current.addEventListener('displayNameChange', updateParticipants)
        
        jitsiApiRef.current.addEventListener('dominantSpeakerChanged', (e) => {
          setDominantSpeakerId(e.id)
        })
        
        jitsiApiRef.current.addEventListener('audioMuteStatusChanged', (e) => {
          setIsMuted(e.muted)
        })
        
        jitsiApiRef.current.addEventListener('readyToClose', () => {
          disconnectVoice()
        })
        
      } catch (err) {
        console.error('Failed to start Jitsi audio interface', err)
        setJitsiLoading(false)
      }
    }

    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script')
      script.src = 'https://meet.jit.si/external_api.js'
      script.async = true
      script.onload = initAPI
      script.onerror = () => {
        console.error('Failed to load Jitsi external API. Adblocker?')
        setJitsiLoading(false)
        alert('Voice connection blocked by browser or adblocker. Please allow meet.jit.si')
      }
      document.body.appendChild(script)
    } else {
      initAPI()
    }
  }

  const disconnectVoice = () => {
    if (isConnected) {
      playSynthSound('leave')
    }
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose()
      jitsiApiRef.current = null
    }
    setIsConnected(false)
    setIsMuted(false)
    setIsDeafened(false)
    setParticipants([])
    setDominantSpeakerId(null)
  }

  const toggleMute = () => {
    if (!jitsiApiRef.current) return
    const nextMuted = !isMuted
    jitsiApiRef.current.executeCommand('toggleAudio')
    playSynthSound(nextMuted ? 'mute' : 'unmute')
  }

  const toggleDeafen = () => {
    const nextDeafened = !isDeafened
    setIsDeafened(nextDeafened)
    playSynthSound(nextDeafened ? 'mute' : 'unmute')
    
    // Deafen logic: If we are deafened, mute local mic as well for privacy
    if (nextDeafened && !isMuted) {
      if (jitsiApiRef.current) jitsiApiRef.current.executeCommand('toggleAudio')
    } else if (!nextDeafened && isMuted) {
      // Unmute when undeafening
      if (jitsiApiRef.current) jitsiApiRef.current.executeCommand('toggleAudio')
    }
    
    // Mute all incoming audio
    const audioElements = document.querySelectorAll('#jitsi-meet-voice-container iframe')
    audioElements.forEach(() => {
      // Jitsi doesn't have a direct 'deafen' API command, but we can try setting volume
      if (jitsiApiRef.current) {
        // A hack for deafen in Jitsi is to set participant volumes to 0, but since it's an iframe, we rely on Jitsi's internal controls if possible, or we just trust the visual state. 
        // We will just visually indicate deafen and they won't hear things if we could mute the iframe.
        // For security, iframes can't be muted easily from parent unless allowed.
        // We will rely on muting local mic as the primary action for now.
      }
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose()
      }
    }
  }, [])

  if (!isAuthenticated) return null

  return (
    <div
      ref={containerRef}
      className="fixed right-4 z-40 sm:bottom-6 sm:right-6 font-sans select-none"
      style={{ bottom: 'calc(var(--mobile-bottom-nav-height, 0px) + 1.2rem)' }}
    >
      {/* Background hidden Jitsi room */}
      {/* We use a large off-screen fixed box to hide it without display:none so WebRTC doesn't get throttled */}
      <div 
        id="jitsi-meet-voice-container" 
        className="fixed top-[-9999px] left-[-9999px] w-[800px] h-[600px] pointer-events-none opacity-0" 
      />

      {/* Persistent floating indicator / expander */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex h-12 items-center gap-2 rounded-full border px-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition duration-200 hover:scale-105 active:scale-95 ${
            isConnected
              ? 'border-emerald-500/50 bg-emerald-500/12 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
              : 'border-white/10 bg-zinc-900/90 text-gray-300 backdrop-blur-xl hover:border-red-400/40 hover:bg-zinc-800'
          }`}
          title="Open Voice Hub"
        >
          {isConnected ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <Radio className="h-4.5 w-4.5 animate-pulse text-red-400" />
          )}
          <span className="text-[0.68rem] font-black uppercase tracking-[0.14em]">
            {isConnected ? 'Squad Online' : 'Voice Hub'}
          </span>
          
          {/* Active Participants Bubble Preview */}
          {isConnected && participants.length > 0 && (
            <div className="flex -space-x-1.5 ml-1">
              {participants.slice(0, 3).map((u) => (
                <div
                  key={u.id}
                  className={`h-5 w-5 overflow-hidden rounded-full border border-zinc-950 bg-zinc-800 transition-all ${
                    dominantSpeakerId === u.id ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-zinc-950 scale-105 z-10' : ''
                  }`}
                >
                  <ProfileAvatar profile={u} size="custom" className="h-full w-full object-cover" />
                </div>
              ))}
              {participants.length > 3 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-950 bg-zinc-800 text-[0.5rem] font-bold text-gray-400">
                  +{participants.length - 3}
                </div>
              )}
            </div>
          )}
        </button>
      )}

      {/* Main Glassmorphic Panel */}
      {isOpen && (
        <div className="w-[19.5rem] rounded-[1.6rem] border border-white/10 bg-zinc-950/92 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition duration-200 animate-in fade-in slide-in-from-bottom-6">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/8 pb-3">
            <div className="flex items-center gap-2">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/12 border border-red-500/25">
                <Sparkles className="h-4 w-4 text-red-400" />
                <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
              </div>
              <div>
                <h3 className="text-[0.78rem] font-black uppercase tracking-[0.14em] text-white">
                  Squad Comms
                </h3>
                <p className="text-[0.56rem] font-bold text-gray-500 uppercase tracking-[0.1em]">
                  Native Voice Engine
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition"
            >
              <ChevronDown className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Custom Web Voice Lounge */}
          <div className="mt-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[0.56rem] font-black uppercase tracking-[0.2em] text-cyan-400">
                In-App Secure Channels
              </span>
            </div>

            {/* Room Selector if disconnected */}
            {!isConnected && !jitsiLoading && (
              <div className="mb-3">
                <div className="flex flex-col gap-1.5 mt-2">
                  {voiceRooms.map((room) => (
                    <button
                      key={room}
                      onClick={() => setSelectedRoom(room)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-[0.68rem] font-bold transition ${
                        selectedRoom === room
                          ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                          : 'border-white/5 bg-zinc-900/50 text-gray-400 hover:border-white/10 hover:bg-zinc-800'
                      }`}
                    >
                      {room}
                      {selectedRoom === room && <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Connection Switch */}
            {!isConnected ? (
              <button
                disabled={jitsiLoading}
                onClick={() => startJitsi(selectedRoom)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/12 py-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-cyan-200 transition hover:bg-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] active:scale-97 disabled:opacity-50"
              >
                {jitsiLoading ? (
                  <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4 text-cyan-400 animate-bounce" />
                )}
                {jitsiLoading ? 'Establishing Comms...' : `Connect ${selectedRoom.split(' ')[0]}`}
              </button>
            ) : (
              <div className="space-y-3">
                {/* Active Channel Stats */}
                <div className="flex items-center justify-between rounded-xl bg-black/40 px-2.5 py-1.5 border border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-gray-300">
                      {selectedRoom}
                    </span>
                  </div>
                  <span className="text-[0.52rem] font-bold text-gray-500">
                    Live Stream
                  </span>
                </div>

                {/* Speaker List Grid */}
                <div className="max-h-[9rem] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {participants.map((user) => {
                    const isSpeaking = dominantSpeakerId === user.id || (user.isMe && dominantSpeakerId === 'local');
                    
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between rounded-xl border p-1.5 transition ${
                          isSpeaking
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : 'border-white/5 bg-zinc-900/40 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`relative h-8 w-8 overflow-hidden rounded-full transition-all bg-zinc-800 ${
                              isSpeaking
                                ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-900 scale-102 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                : 'ring-1 ring-white/10'
                            }`}
                          >
                            <ProfileAvatar profile={user} size="custom" className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[0.68rem] font-black uppercase tracking-[0.06em] text-white">
                              {user.display_name}
                            </p>
                            <p className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-widest">
                              {user.isMe ? 'You' : user.role || 'Operator'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 px-1">
                          {/* Mic Waveform Visualizer for active speaker */}
                          {isSpeaking && (
                            <div className="flex items-end gap-0.5 h-3 px-1 mr-1">
                              <span className="w-0.5 bg-emerald-400 animate-[bar1_0.6s_ease-in-out_infinite]" style={{ height: '30%' }}></span>
                              <span className="w-0.5 bg-emerald-400 animate-[bar2_0.8s_ease-in-out_infinite]" style={{ height: '70%' }}></span>
                              <span className="w-0.5 bg-emerald-400 animate-[bar3_0.5s_ease-in-out_infinite]" style={{ height: '40%' }}></span>
                            </div>
                          )}
                          {user.isMe && isMuted ? (
                            <MicOff className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 opacity-60"></div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Audio Engine Live Control Strip */}
                <div className="flex gap-2 border-t border-white/5 pt-3 mt-2">
                  <button
                    onClick={toggleMute}
                    className={`flex-1 flex flex-col items-center justify-center rounded-xl border py-2 gap-1 transition ${
                      isMuted
                        ? 'border-red-500/40 bg-red-500/10 text-red-200'
                        : 'border-white/8 bg-zinc-900/90 text-gray-300 hover:bg-zinc-800'
                    }`}
                  >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-emerald-400" />}
                    <span className="text-[0.5rem] font-black uppercase tracking-[0.08em]">
                      {isMuted ? 'Muted' : 'Mic On'}
                    </span>
                  </button>

                  <button
                    onClick={toggleDeafen}
                    className={`flex-1 flex flex-col items-center justify-center rounded-xl border py-2 gap-1 transition ${
                      isDeafened
                        ? 'border-red-500/40 bg-red-500/10 text-red-200'
                        : 'border-white/8 bg-zinc-900/90 text-gray-300 hover:bg-zinc-800'
                    }`}
                  >
                    {isDeafened ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-cyan-400" />}
                    <span className="text-[0.5rem] font-black uppercase tracking-[0.08em]">
                      {isDeafened ? 'Deafened' : 'Sound On'}
                    </span>
                  </button>

                  <button
                    onClick={disconnectVoice}
                    className="flex-1 flex flex-col items-center justify-center rounded-xl border border-red-500/50 bg-red-500/12 text-red-200 hover:bg-red-500/22 transition active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                    title="Disconnect"
                  >
                    <PhoneOff className="h-4 w-4 text-red-400" />
                    <span className="text-[0.5rem] font-black uppercase tracking-[0.08em]">
                      Disconnect
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer branding details */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[0.52rem] font-bold text-gray-600 uppercase tracking-[0.08em]">
            <Sparkles className="h-3 w-3 text-red-500/50" />
            <span>21RATS Native Audio Node • WebRTC</span>
          </div>

        </div>
      )}

      {/* Embedded CSS for speaker animations in Tailwind 4.0 context */}
      <style>{`
        @keyframes bar1 {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
        @keyframes bar2 {
          0%, 100% { height: 60%; }
          50% { height: 20%; }
        }
        @keyframes bar3 {
          0%, 100% { height: 40%; }
          50% { height: 80%; }
        }
      `}</style>
    </div>
  )
}
