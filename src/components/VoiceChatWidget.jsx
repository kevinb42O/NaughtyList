import { useEffect, useRef, useState, useCallback } from 'react'
import { joinRoom } from '@trystero-p2p/supabase'
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
import { supabase } from '../lib/supabase.js'
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
      osc.frequency.setValueAtTime(523.25, now)
      osc.frequency.setValueAtTime(659.25, now + 0.08)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.16)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc.start(now)
      osc.stop(now + 0.36)
    } else if (type === 'leave') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(659.25, now)
      osc.frequency.setValueAtTime(329.63, now + 0.08)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.16)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc.start(now)
      osc.stop(now + 0.36)
    } else if (type === 'mute') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(440, now)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.1, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      osc.start(now)
      osc.stop(now + 0.13)
    } else if (type === 'unmute') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(880, now)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.1, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      osc.start(now)
      osc.stop(now + 0.13)
    }
  } catch {
    // Audio context blocked or unsupported
  }
}

export default function VoiceChatWidget() {
  const { profile, isAuthenticated } = useIntel()
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState('Chat about anything')
  const [loading, setLoading] = useState(false)

  const [participants, setParticipants] = useState([])
  const [dominantSpeakerId, setDominantSpeakerId] = useState(null)

  const roomRef = useRef(null)
  const localStreamRef = useRef(null)
  const audioContextRef = useRef(null)
  const analysersRef = useRef(new Map())
  const audioElementsRef = useRef(new Map())
  const animationFrameRef = useRef(null)
  const profileActionRef = useRef(null)
  const muteActionRef = useRef(null)

  const voiceRooms = ['Chat about anything', 'B21', 'PREMADE']

  const startEngine = async (roomName) => {
    if (loading) return
    setLoading(true)

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      localStreamRef.current = stream
      console.log('[VoiceChat] Mic acquired, tracks:', stream.getAudioTracks().length)

      // 2. Resume AudioContext (required on mobile after user gesture)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      // 3. Join the Trystero mesh room via Supabase signaling
      const roomMap = { 'Chat about anything': 'chat-anything', 'B21': 'b21', 'PREMADE': 'premade' }
      const roomSlug = roomMap[roomName] || roomName.toLowerCase().replace(/[^a-z0-9]/g, '')
      const fullRoomId = `21rats-voice-${roomSlug}`

      console.log('[VoiceChat] Joining room via Supabase:', fullRoomId)

      const room = joinRoom({
        appId: import.meta.env.VITE_SUPABASE_URL,
        relayConfig: {
          supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        turnConfig: [
          { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
        ]
      }, fullRoomId)
      roomRef.current = room

      // 4. Create data action channels FIRST
      const profileAction = room.makeAction('profile')
      const muteAction = room.makeAction('mute')
      profileActionRef.current = profileAction
      muteActionRef.current = muteAction

      // Local participant (shown immediately)
      const localParticipant = {
        id: 'local',
        profileId: profile?.id,
        display_name: profile?.display_name || 'Operator',
        avatar_icon: profile?.avatar_icon || 'ghost',
        role: profile?.role || 'member',
        isMe: true,
        muted: false
      }
      setParticipants([localParticipant])

      // 5. Set up audio analyser for local mic
      const localSource = audioContextRef.current.createMediaStreamSource(stream)
      const localAnalyser = audioContextRef.current.createAnalyser()
      localAnalyser.fftSize = 256
      localSource.connect(localAnalyser)
      analysersRef.current.set('local', localAnalyser)

      // Start audio level monitoring loop for speaker detection
      const tick = () => {
        let maxLevel = 0
        let currentDominant = null
        analysersRef.current.forEach((an, peerId) => {
          const dataArray = new Uint8Array(an.frequencyBinCount)
          an.getByteFrequencyData(dataArray)
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
          if (avg > 15 && avg > maxLevel) {
            maxLevel = avg
            currentDominant = peerId
          }
        })
        setDominantSpeakerId(currentDominant)
        animationFrameRef.current = requestAnimationFrame(tick)
      }
      tick()

      // 6. Handle incoming peer audio streams
      room.onPeerStream = (peerStream, peerId) => {
        console.log('[VoiceChat] Received audio stream from peer:', peerId)
        
        let audio = audioElementsRef.current.get(peerId)
        if (!audio) {
          audio = new Audio()
          audio.id = `peer-audio-${peerId}`
          audio.style.display = 'none'
          audio.setAttribute('playsinline', 'true') // CRITICAL for iOS Safari
          document.body.appendChild(audio)
          audioElementsRef.current.set(peerId, audio)
        }

        audio.srcObject = peerStream
        audio.volume = isDeafened ? 0 : 1

        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[VoiceChat] Autoplay prevented for', peerId, err)
            const retry = () => {
              audio.play().catch(() => {})
              document.removeEventListener('touchstart', retry)
              document.removeEventListener('click', retry)
            }
            document.addEventListener('touchstart', retry, { once: true })
            document.addEventListener('click', retry, { once: true })
          })
        }

        // Add analyser for peer speaker detection glow
        if (audioContextRef.current) {
          try {
            const peerSource = audioContextRef.current.createMediaStreamSource(peerStream)
            const peerAnalyser = audioContextRef.current.createAnalyser()
            peerAnalyser.fftSize = 256
            peerSource.connect(peerAnalyser)
            analysersRef.current.set(peerId, peerAnalyser)
          } catch (e) {
            console.warn('[VoiceChat] Could not connect peer stream to analyser', e)
          }
        }
      }

      // Handle peer join — send our profile and our audio stream directly to them!
      room.onPeerJoin = (peerId) => {
        console.log('[VoiceChat] Peer joined:', peerId)
        playSynthSound('join')
        
        // CRITICAL: Trystero requires us to explicitly send our stream to the new peer
        try {
          room.addStream(stream, { target: peerId })
        } catch (err) {
          console.warn('[VoiceChat] Error adding stream to peer:', err)
        }

        profileAction.send({
          id: profile?.id,
          display_name: profile?.display_name || 'Operator',
          avatar_icon: profile?.avatar_icon || 'ghost',
          role: profile?.role || 'member'
        }, { target: peerId })
      }

      // Handle peer leave
      room.onPeerLeave = (peerId) => {
        console.log('[VoiceChat] Peer left:', peerId)
        playSynthSound('leave')
        setParticipants(prev => prev.filter(p => p.id !== peerId))
        
        if (audioElementsRef.current.has(peerId)) {
          const audio = audioElementsRef.current.get(peerId)
          if (audio) {
            audio.srcObject = null
            audio.remove()
          }
          audioElementsRef.current.delete(peerId)
        }
        analysersRef.current.delete(peerId)
      }

      // Receive profile data from peers
      profileAction.onMessage = (peerData, { peerId }) => {
        console.log('[VoiceChat] Received profile from peer:', peerId, peerData)
        setParticipants(prev => {
          const exists = prev.find(p => p.id === peerId)
          if (exists) {
            return prev.map(p => p.id === peerId ? { ...p, ...peerData, id: peerId, isMe: false } : p)
          }
          return [...prev, { ...peerData, id: peerId, isMe: false, muted: false }]
        })
      }

      // Receive mute status from peers
      muteAction.onMessage = (isPeerMuted, { peerId }) => {
        setParticipants(prev => prev.map(p => p.id === peerId ? { ...p, muted: isPeerMuted } : p))
      }

      playSynthSound('join')
      setIsConnected(true)
      setLoading(false)
      console.log('[VoiceChat] Connected and streaming')

      // Broadcast globally that we joined voice chat for in-app toasts
      supabase.channel('online-users').send({
        type: 'broadcast',
        event: 'voice_chat_joined',
        payload: {
          room: selectedRoom,
          profile: profile
        }
      }).catch(err => console.warn('[VoiceChat] Failed to broadcast join event', err))

      // Trigger actual Web Push Notification via Edge Function
      supabase.functions.invoke('send-push', {
        body: {
          type: 'voice-chat',
          message: selectedRoom
        }
      }).catch(err => console.warn('[VoiceChat] Failed to trigger push notification', err))

    } catch (err) {
      console.error('Voice engine error:', err)
      setLoading(false)
      if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
        alert('Microphone access was denied or no mic found. Please allow mic access in your browser settings.')
      } else {
        alert(`Voice connection failed: ${err.message}`)
      }
    }
  }

  const disconnectVoice = useCallback(() => {
    playSynthSound('leave')

    if (roomRef.current) {
      roomRef.current.leave()
      roomRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    audioElementsRef.current.forEach(audio => {
      audio.srcObject = null
      audio.remove() // CRITICAL: prevent DOM leak
    })
    audioElementsRef.current.clear()
    analysersRef.current.clear()
    profileActionRef.current = null
    muteActionRef.current = null

    setIsConnected(false)
    setIsMuted(false)
    setIsDeafened(false)
    setParticipants([])
    setDominantSpeakerId(null)
  }, [playSynthSound])

  const toggleMute = () => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !nextMuted })
    }

    if (muteActionRef.current) {
      muteActionRef.current.send(nextMuted)
    }

    setParticipants(prev => prev.map(p => p.isMe ? { ...p, muted: nextMuted } : p))
    playSynthSound(nextMuted ? 'mute' : 'unmute')
  }

  const toggleDeafen = () => {
    const nextDeafened = !isDeafened
    setIsDeafened(nextDeafened)
    playSynthSound(nextDeafened ? 'mute' : 'unmute')

    audioElementsRef.current.forEach(audio => {
      audio.volume = nextDeafened ? 0 : 1
    })

    if (nextDeafened && !isMuted) {
      toggleMute()
    }
  }

  useEffect(() => {
    const audioEls = audioElementsRef.current
    return () => {
      if (roomRef.current) {
        roomRef.current.leave()
        roomRef.current = null
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      audioEls.forEach(audio => { audio.srcObject = null })
    }
  }, [])

  if (!isAuthenticated) return null

  return (
    <div
      className="fixed right-4 z-40 sm:bottom-6 sm:right-6 font-sans select-none"
      style={{ bottom: 'calc(var(--mobile-bottom-nav-height, 0px) + 1.2rem)' }}
    >
      {/* Floating button when closed */}
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

      {/* Main panel */}
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

          {/* Voice channels */}
          <div className="mt-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
            <div className="mb-2">
              <span className="text-[0.56rem] font-black uppercase tracking-[0.2em] text-cyan-400">
                In-App Secure Channels
              </span>
            </div>

            {/* Room selector */}
            {!isConnected && !loading && (
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

            {/* Connect / Active controls */}
            {!isConnected ? (
              <button
                disabled={loading}
                onClick={() => startEngine(selectedRoom)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/12 py-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-cyan-200 transition hover:bg-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] active:scale-97 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4 text-cyan-400 animate-bounce" />
                )}
                {loading ? 'Connecting...' : `Connect ${selectedRoom.split(' ')[0]}`}
              </button>
            ) : (
              <div className="space-y-3">
                {/* Channel info */}
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
                    Live
                  </span>
                </div>

                {/* Participants */}
                <div className="max-h-[9rem] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {participants.map((user) => {
                    const isSpeaking = dominantSpeakerId === user.id && !user.muted

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
                          {isSpeaking && (
                            <div className="flex items-end gap-0.5 h-3 px-1 mr-1">
                              <span className="w-0.5 bg-emerald-400 animate-[bar1_0.6s_ease-in-out_infinite]" style={{ height: '30%' }}></span>
                              <span className="w-0.5 bg-emerald-400 animate-[bar2_0.8s_ease-in-out_infinite]" style={{ height: '70%' }}></span>
                              <span className="w-0.5 bg-emerald-400 animate-[bar3_0.5s_ease-in-out_infinite]" style={{ height: '40%' }}></span>
                            </div>
                          )}
                          {user.muted ? (
                            <MicOff className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 opacity-60"></div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Control strip */}
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

          {/* Footer */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[0.52rem] font-bold text-gray-600 uppercase tracking-[0.08em]">
            <Sparkles className="h-3 w-3 text-red-500/50" />
            <span>21RATS Native WebRTC Node</span>
          </div>
        </div>
      )}

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
