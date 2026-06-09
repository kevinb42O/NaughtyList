import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { joinRoom } from '@trystero-p2p/supabase'
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  Wifi,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useIntel } from '../context/useIntel.js'
import ProfileAvatar from './ProfileAvatar.jsx'

const voiceRooms = [
  { name: 'Chat about anything', shortName: 'Open Comms', slug: 'chat-anything', description: 'Casual squad talk' },
  { name: 'B21', shortName: 'B21 Run', slug: 'b21', description: 'Building 21 callouts' },
  { name: 'PREMADE', shortName: 'Premade', slug: 'premade', description: 'Ready squad staging' },
]

const voiceRoomByName = new Map(voiceRooms.map((room) => [room.name, room]))

function playSynthSound(type) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    const audioCtx = new AudioContextClass()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    const now = audioCtx.currentTime

    osc.connect(gain)
    gain.connect(audioCtx.destination)

    if (type === 'join' || type === 'leave') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(type === 'join' ? 523.25 : 659.25, now)
      osc.frequency.setValueAtTime(type === 'join' ? 659.25 : 329.63, now + 0.08)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.16)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc.start(now)
      osc.stop(now + 0.36)
      return
    }

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(type === 'unmute' ? 880 : 440, now)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
    osc.start(now)
    osc.stop(now + 0.13)
  } catch {
    // Browser audio feedback is optional.
  }
}

function roomSlug(roomName) {
  return voiceRoomByName.get(roomName)?.slug || roomName.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function connectionCopy(status) {
  switch (status) {
    case 'requesting-mic':
      return 'Requesting microphone'
    case 'joining-room':
      return 'Joining room'
    case 'connecting-peers':
      return 'Connecting peers'
    case 'connected':
      return 'Live channel'
    case 'error':
      return 'Needs attention'
    default:
      return 'Ready'
  }
}

function voiceErrorMessage(error) {
  if (!error) return ''
  if (error.name === 'NotAllowedError') return 'Microphone permission is blocked. Allow mic access in your browser, then try again.'
  if (error.name === 'NotFoundError') return 'No microphone was found. Connect a mic or headset, then try again.'
  if (error.name === 'NotReadableError') return 'Your microphone is already in use by another app or tab.'
  if (window.isSecureContext === false) return 'Voice needs a secure browser context. Use HTTPS or localhost.'
  return error.message ? `Voice connection failed: ${error.message}` : 'Voice connection failed. Try again.'
}

function clampDragPosition(position) {
  if (typeof window === 'undefined') return position

  const bubbleSize = 56
  const rightAnchor = 16
  const bottomNavHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-bottom-nav-height')) || 0
  const bottomAnchor = bottomNavHeight + 19
  const margin = 12

  return {
    x: Math.min(window.innerWidth - rightAnchor - bubbleSize - margin, Math.max(margin - (window.innerWidth - rightAnchor - bubbleSize), position.x)),
    y: Math.min(window.innerHeight - bottomAnchor - bubbleSize - margin, Math.max(margin - (window.innerHeight - bottomAnchor - bubbleSize), position.y)),
  }
}

async function sendVoiceJoinBroadcast(payload) {
  await new Promise((resolve) => {
    let settled = false
    const channel = supabase.channel('online-users')
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      supabase.removeChannel(channel)
      resolve()
    }
    const timeoutId = window.setTimeout(finish, 2500)

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.send({ type: 'broadcast', event: 'voice_chat_joined', payload })
        } catch (error) {
          console.warn('[VoiceChat] Failed to broadcast join event', error)
        } finally {
          finish()
        }
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        finish()
      }
    })
  })
}

export default function VoiceChatWidget() {
  const { profile, isAuthenticated } = useIntel()
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(voiceRooms[0].name)
  const [connectionStatus, setConnectionStatus] = useState('idle')
  const [connectionError, setConnectionError] = useState('')
  const [roomOccupancy, setRoomOccupancy] = useState({})
  const [participants, setParticipants] = useState([])
  const [dominantSpeakerId, setDominantSpeakerId] = useState(null)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [hasMoved, setHasMoved] = useState(false)

  const roomRef = useRef(null)
  const localStreamRef = useRef(null)
  const audioContextRef = useRef(null)
  const analysersRef = useRef(new Map())
  const audioElementsRef = useRef(new Map())
  const audioRetryCleanupRef = useRef(new Map())
  const animationFrameRef = useRef(null)
  const profileActionRef = useRef(null)
  const muteActionRef = useRef(null)
  const presenceChannelRef = useRef(null)
  const startPosRef = useRef({ x: 0, y: 0 })
  const startPointerRef = useRef({ x: 0, y: 0 })

  const selectedRoomMeta = voiceRoomByName.get(selectedRoom) ?? voiceRooms[0]
  const totalOccupancy = useMemo(() => Object.values(roomOccupancy).reduce((sum, count) => sum + count, 0), [roomOccupancy])
  const loading = connectionStatus === 'requesting-mic' || connectionStatus === 'joining-room' || connectionStatus === 'connecting-peers'

  const cleanupVoiceSession = useCallback((options = {}) => {
    const { resetControls = true } = options

    if (roomRef.current) {
      roomRef.current.leave().catch((error) => {
        console.warn('[VoiceChat] Failed to leave room cleanly', error)
      })
      roomRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    audioRetryCleanupRef.current.forEach((removeRetry) => removeRetry())
    audioRetryCleanupRef.current.clear()
    audioElementsRef.current.forEach((audio) => {
      audio.pause()
      audio.srcObject = null
      audio.remove()
    })
    audioElementsRef.current.clear()
    analysersRef.current.clear()
    profileActionRef.current = null
    muteActionRef.current = null

    setIsConnected(false)
    setParticipants([])
    setDominantSpeakerId(null)

    if (resetControls) {
      setIsMuted(false)
      setIsDeafened(false)
      setConnectionStatus('idle')
      setConnectionError('')
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !profile?.id) {
      return undefined
    }

    const channel = supabase.channel('voice-rooms', {
      config: { presence: { key: profile.id } },
    })
    presenceChannelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const counts = {}
        Object.values(channel.presenceState()).forEach((presenceRows) => {
          const userRooms = new Set()
          presenceRows.forEach((presence) => {
            if (presence.room) userRooms.add(presence.room)
          })
          userRooms.forEach((room) => {
            counts[room] = (counts[room] || 0) + 1
          })
        })
        setRoomOccupancy(counts)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ room: null })
      })

    return () => {
      if (presenceChannelRef.current === channel) presenceChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated, profile?.id])

  useEffect(() => {
    const channel = presenceChannelRef.current
    if (!channel || channel.state !== 'joined') return

    channel.track({ room: isConnected ? selectedRoom : null }).catch((error) => {
      console.warn('[VoiceChat] Failed to update room presence', error)
    })
  }, [isConnected, selectedRoom])

  useEffect(() => {
    if (isOpen) return undefined

    const handleResize = () => setDragPos((position) => clampDragPosition(position))
    window.addEventListener('resize', handleResize)
    window.screen.orientation?.addEventListener?.('change', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.screen.orientation?.removeEventListener?.('change', handleResize)
    }
  }, [isOpen])

  useEffect(() => () => cleanupVoiceSession({ resetControls: false }), [cleanupVoiceSession])

  const handlePointerDown = useCallback((event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
    setHasMoved(false)
    startPointerRef.current = { x: event.clientX, y: event.clientY }
    startPosRef.current = { ...dragPos }
  }, [dragPos])

  const handlePointerMove = useCallback((event) => {
    if (!isDragging) return

    const dx = event.clientX - startPointerRef.current.x
    const dy = event.clientY - startPointerRef.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setHasMoved(true)

    setDragPos(clampDragPosition({
      x: startPosRef.current.x + dx,
      y: startPosRef.current.y + dy,
    }))
  }, [isDragging])

  const handlePointerUp = useCallback((event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setIsDragging(false)
  }, [])

  const retryPeerAudio = useCallback((audio, peerId) => {
    const retry = () => {
      audio.play().catch(() => {})
      audioRetryCleanupRef.current.get(peerId)?.()
    }
    const removeRetry = () => {
      document.removeEventListener('touchstart', retry)
      document.removeEventListener('click', retry)
      audioRetryCleanupRef.current.delete(peerId)
    }

    audioRetryCleanupRef.current.get(peerId)?.()
    audioRetryCleanupRef.current.set(peerId, removeRetry)
    document.addEventListener('touchstart', retry, { once: true })
    document.addEventListener('click', retry, { once: true })
  }, [])

  const monitorAudioLevels = useCallback(function monitorAudioLevelsTick() {
    let maxLevel = 0
    let currentDominant = null

    analysersRef.current.forEach((analyser, peerId) => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      if (average > 15 && average > maxLevel) {
        maxLevel = average
        currentDominant = peerId
      }
    })

    setDominantSpeakerId(currentDominant)
    animationFrameRef.current = requestAnimationFrame(monitorAudioLevelsTick)
  }, [])

  const notifyVoiceJoin = useCallback((roomName) => {
    const now = Date.now()
    const roomKey = roomSlug(roomName)
    const toastStorageKey = `last_voice_toast_${roomKey}`
    const pushStorageKey = `last_voice_push_${roomKey}`

    if (now - Number(localStorage.getItem(toastStorageKey) || 0) > 2 * 60 * 1000) {
      localStorage.setItem(toastStorageKey, now.toString())
      sendVoiceJoinBroadcast({ room: roomName, profile }).catch((error) => {
        console.warn('[VoiceChat] Failed to broadcast join event', error)
      })
    }

    if (now - Number(localStorage.getItem(pushStorageKey) || 0) > 15 * 60 * 1000) {
      localStorage.setItem(pushStorageKey, now.toString())
      supabase.functions.invoke('send-push', {
        body: { type: 'voice-chat', message: roomName },
      }).catch((error) => console.warn('[VoiceChat] Failed to trigger push notification', error))
    }
  }, [profile])

  const startEngine = useCallback(async (roomName) => {
    if (loading || isConnected) return

    setConnectionStatus('requesting-mic')
    setConnectionError('')
    cleanupVoiceSession({ resetControls: false })

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Your browser does not support microphone access.')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      localStreamRef.current = stream

      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) throw new Error('Your browser does not support the Web Audio API.')
      if (!audioContextRef.current) audioContextRef.current = new AudioContextClass()
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume()

      setConnectionStatus('joining-room')
      const room = joinRoom({
        appId: import.meta.env.VITE_SUPABASE_URL,
        relayConfig: { supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        turnConfig: [
          { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
        ],
      }, `21rats-voice-${roomSlug(roomName)}`, {
        onJoinError: ({ error: joinError }) => {
          console.warn('[VoiceChat] Join error', joinError)
          setConnectionStatus('error')
          setConnectionError(voiceErrorMessage(new Error(joinError || 'Could not join voice room.')))
        },
      })
      roomRef.current = room

      const profileAction = room.makeAction('profile')
      const muteAction = room.makeAction('mute')
      profileActionRef.current = profileAction
      muteActionRef.current = muteAction

      const profilePayload = {
        id: profile?.id,
        display_name: profile?.display_name || 'Operator',
        avatar_icon: profile?.avatar_icon || 'radio',
        avatar_image_url: profile?.avatar_image_url || '',
        role: profile?.role || 'member',
        supporter_tier: profile?.supporter_tier,
        supporter_frame: profile?.supporter_frame,
      }
      setParticipants([{ ...profilePayload, id: 'local', profileId: profile?.id, isMe: true, muted: false }])

      const localSource = audioContextRef.current.createMediaStreamSource(stream)
      const localAnalyser = audioContextRef.current.createAnalyser()
      localAnalyser.fftSize = 256
      localSource.connect(localAnalyser)
      analysersRef.current.set('local', localAnalyser)
      monitorAudioLevels()

      room.onPeerStream = (peerStream, peerId) => {
        let audio = audioElementsRef.current.get(peerId)
        if (!audio) {
          audio = new Audio()
          audio.id = `peer-audio-${peerId}`
          audio.style.display = 'none'
          audio.setAttribute('playsinline', 'true')
          document.body.appendChild(audio)
          audioElementsRef.current.set(peerId, audio)
        }

        audio.srcObject = peerStream
        audio.volume = isDeafened ? 0 : 1
        audio.play().catch((error) => {
          console.warn('[VoiceChat] Autoplay prevented for peer audio', error)
          retryPeerAudio(audio, peerId)
        })

        try {
          const peerSource = audioContextRef.current.createMediaStreamSource(peerStream)
          const peerAnalyser = audioContextRef.current.createAnalyser()
          peerAnalyser.fftSize = 256
          peerSource.connect(peerAnalyser)
          analysersRef.current.set(peerId, peerAnalyser)
        } catch (error) {
          console.warn('[VoiceChat] Could not connect peer stream to analyser', error)
        }
      }

      room.onPeerJoin = (peerId) => {
        playSynthSound('join')
        Promise.allSettled(room.addStream(stream, { target: peerId }))
          .then((results) => {
            const rejected = results.find((result) => result.status === 'rejected')
            if (rejected?.status === 'rejected') {
              console.warn('[VoiceChat] Error adding stream to peer', rejected.reason)
            }
          })
          .catch((error) => {
            console.warn('[VoiceChat] Error adding stream to peer', error)
          })

        profileAction.send(profilePayload, { target: peerId }).catch((error) => {
          console.warn('[VoiceChat] Error sending peer profile payload', error)
        })
        muteAction.send(isMuted, { target: peerId }).catch((error) => {
          console.warn('[VoiceChat] Error sending peer mute payload', error)
        })
      }

      room.onPeerLeave = (peerId) => {
        playSynthSound('leave')
        setParticipants((currentParticipants) => currentParticipants.filter((participant) => participant.id !== peerId))
        const audio = audioElementsRef.current.get(peerId)
        if (audio) {
          audio.pause()
          audio.srcObject = null
          audio.remove()
        }
        audioElementsRef.current.delete(peerId)
        audioRetryCleanupRef.current.get(peerId)?.()
        analysersRef.current.delete(peerId)
      }

      profileAction.onMessage = (peerData, { peerId }) => {
        setParticipants((currentParticipants) => {
          const existing = currentParticipants.find((participant) => participant.id === peerId)
          const nextPeer = { ...existing, ...peerData, id: peerId, isMe: false, muted: existing?.muted ?? false }
          return existing
            ? currentParticipants.map((participant) => (participant.id === peerId ? nextPeer : participant))
            : [...currentParticipants, nextPeer]
        })
      }

      muteAction.onMessage = (isPeerMuted, { peerId }) => {
        setParticipants((currentParticipants) => currentParticipants.map((participant) => (
          participant.id === peerId ? { ...participant, muted: isPeerMuted } : participant
        )))
      }

      setConnectionStatus('connecting-peers')
      Promise.allSettled(room.addStream(stream))
        .then((results) => {
          const rejected = results.find((result) => result.status === 'rejected')
          if (rejected?.status === 'rejected') {
            console.warn('[VoiceChat] Error adding local stream to room', rejected.reason)
          }
        })
        .catch((error) => {
          console.warn('[VoiceChat] Error adding local stream to room', error)
        })

      playSynthSound('join')
      setIsConnected(true)
      setIsMuted(false)
      setIsDeafened(false)
      setConnectionStatus('connected')
      notifyVoiceJoin(roomName)
    } catch (error) {
      console.error('[VoiceChat] Voice engine error', error)
      cleanupVoiceSession({ resetControls: false })
      setConnectionStatus('error')
      setConnectionError(voiceErrorMessage(error))
    }
  }, [cleanupVoiceSession, isConnected, isDeafened, isMuted, loading, monitorAudioLevels, notifyVoiceJoin, profile, retryPeerAudio])

  const disconnectVoice = useCallback(() => {
    if (!isConnected && connectionStatus !== 'error') return
    playSynthSound('leave')
    cleanupVoiceSession()
  }, [cleanupVoiceSession, connectionStatus, isConnected])

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    muteActionRef.current?.send(nextMuted)
    setParticipants((currentParticipants) => currentParticipants.map((participant) => (
      participant.isMe ? { ...participant, muted: nextMuted } : participant
    )))
    playSynthSound(nextMuted ? 'mute' : 'unmute')
  }, [isMuted])

  const toggleDeafen = useCallback(() => {
    const nextDeafened = !isDeafened
    setIsDeafened(nextDeafened)
    playSynthSound(nextDeafened ? 'mute' : 'unmute')

    audioElementsRef.current.forEach((audio) => {
      audio.volume = nextDeafened ? 0 : 1
    })

    if (nextDeafened && !isMuted) {
      setIsMuted(true)
      localStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
      muteActionRef.current?.send(true)
      setParticipants((currentParticipants) => currentParticipants.map((participant) => (
        participant.isMe ? { ...participant, muted: true } : participant
      )))
    }
  }, [isDeafened, isMuted])

  if (!isAuthenticated) return null

  return (
    <>
      {isOpen ? (
        <button type="button" aria-label="Close squad comms" className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm sm:hidden" onClick={() => setIsOpen(false)} />
      ) : null}

      <div
        className={`fixed right-4 z-50 font-sans select-none sm:bottom-6 sm:right-6 ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{
          bottom: 'calc(var(--mobile-bottom-nav-height, 0px) + 1.2rem)',
          transform: !isOpen ? `translate3d(${dragPos.x}px, ${dragPos.y}px, 0)` : 'none',
          transition: isDragging || isOpen ? 'none' : 'transform 0.18s ease-out',
        }}
      >
        {!isOpen ? (
          <button
            type="button"
            aria-label={isConnected ? `Open squad comms, connected to ${selectedRoom}` : 'Open squad comms'}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={() => {
              if (!hasMoved) setIsOpen(true)
            }}
            className={`relative flex h-14 w-14 items-center justify-center rounded-full border shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 motion-reduce:transition-none ${
              isConnected
                ? 'border-emerald-500/50 bg-emerald-500/15 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                : totalOccupancy > 0
                  ? 'border-cyan-500/40 bg-cyan-900/40 shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:border-cyan-400/60'
                  : 'border-amber-400/40 bg-zinc-900/90 shadow-[0_0_15px_rgba(251,191,36,0.15)] hover:border-amber-400/60'
            }`}
            style={{ touchAction: 'none' }}
          >
            {isConnected ? (
              <span className="relative flex h-full w-full flex-col items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-25 motion-safe:animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <Phone className="z-10 h-4 w-4 text-emerald-300" aria-hidden="true" />
                <span className="z-10 mt-0.5 text-[0.45rem] font-black uppercase tracking-widest text-emerald-200">{roomOccupancy[selectedRoom] || participants.length || 1} in</span>
              </span>
            ) : totalOccupancy > 0 ? (
              <span className="relative flex h-full w-full flex-col items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-20 motion-safe:animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <span className="z-10 text-[0.8rem] font-black leading-none text-cyan-300">{totalOccupancy}</span>
                <span className="z-10 mt-0.5 text-[0.4rem] font-black uppercase tracking-[0.18em] text-cyan-400">Active</span>
              </span>
            ) : (
              <Radio className="h-5 w-5 text-amber-400 motion-safe:animate-pulse" aria-hidden="true" />
            )}
          </button>
        ) : null}

        {isOpen ? (
          <section aria-label="Squad comms" className="w-[min(calc(100vw-2rem),22rem)] rounded-2xl border border-white/10 bg-zinc-950/95 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${isConnected ? 'border-emerald-500/30 bg-emerald-500/12' : connectionStatus === 'error' ? 'border-red-500/35 bg-red-500/12' : 'border-red-500/25 bg-red-500/12'}`}>
                  {connectionStatus === 'error' ? <AlertTriangle className="h-4 w-4 text-red-300" aria-hidden="true" /> : <Sparkles className="h-4 w-4 text-red-400" aria-hidden="true" />}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-[0.78rem] font-black uppercase tracking-[0.14em] text-white">Squad Comms</h3>
                  <p className="truncate text-[0.56rem] font-bold uppercase tracking-[0.1em] text-gray-500">{connectionCopy(connectionStatus)}</p>
                </div>
              </div>

              <button type="button" aria-label="Collapse squad comms" onClick={() => setIsOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80">
                <ChevronDown className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-white/5 bg-white/[0.025] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.56rem] font-black uppercase tracking-[0.2em] text-cyan-400">Secure Channels</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-black/30 px-2 py-1 text-[0.5rem] font-black uppercase tracking-[0.12em] text-gray-500">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {totalOccupancy} live
                </span>
              </div>

              {!isConnected ? (
                <div className="mt-3 space-y-2">
                  {voiceRooms.map((room) => {
                    const count = roomOccupancy[room.name] || 0
                    const selected = selectedRoom === room.name

                    return (
                      <button
                        type="button"
                        key={room.name}
                        onClick={() => setSelectedRoom(room.name)}
                        className={`flex min-h-13 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 ${selected ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100' : 'border-white/6 bg-zinc-900/55 text-gray-400 hover:border-white/12 hover:bg-zinc-800/80'}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[0.68rem] font-black uppercase tracking-[0.1em]">{room.shortName}</span>
                          <span className="block truncate text-[0.56rem] font-bold uppercase tracking-[0.08em] text-gray-500">{room.description}</span>
                        </span>
                        <span className={`inline-flex min-w-8 shrink-0 items-center justify-center rounded-full border px-2 py-1 text-[0.55rem] font-black ${count ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-white/8 bg-black/20 text-gray-600'}`}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {connectionError ? (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-100" role="status">
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.1em]">Voice unavailable</p>
                      <p className="mt-1 text-[0.62rem] font-semibold leading-snug text-red-100/80">{connectionError}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!isConnected ? (
                <button type="button" disabled={loading} onClick={() => startEngine(selectedRoom)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/12 py-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-cyan-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/20 active:scale-97 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" aria-hidden="true" /> : connectionStatus === 'error' ? <RefreshCw className="h-4 w-4 text-cyan-400" aria-hidden="true" /> : <Phone className="h-4 w-4 text-cyan-400" aria-hidden="true" />}
                  {loading ? connectionCopy(connectionStatus) : connectionStatus === 'error' ? 'Try again' : `Connect ${selectedRoomMeta.shortName}`}
                </button>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-white/6 bg-black/40 px-3 py-2">
                    <span className="truncate text-[0.62rem] font-black uppercase tracking-[0.08em] text-gray-200">{selectedRoomMeta.shortName}</span>
                    <span className="inline-flex items-center gap-1 text-[0.52rem] font-bold uppercase tracking-[0.12em] text-emerald-300"><Wifi className="h-3 w-3" aria-hidden="true" />Live</span>
                  </div>

                  <div className="max-h-[10.5rem] space-y-2 overflow-y-auto pr-1">
                    {participants.length === 1 ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/35 px-3 py-3 text-center">
                        <ShieldCheck className="mx-auto h-4 w-4 text-emerald-300" aria-hidden="true" />
                        <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-gray-300">Only you in channel</p>
                        <p className="mt-1 text-[0.56rem] font-bold uppercase tracking-[0.08em] text-gray-600">Waiting for squad</p>
                      </div>
                    ) : null}

                    {participants.map((participant) => {
                      const isSpeaking = dominantSpeakerId === participant.id && !participant.muted

                      return (
                        <div key={participant.id} className={`flex min-h-12 items-center justify-between rounded-xl border p-1.5 transition ${isSpeaking ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/6 bg-zinc-900/45 hover:bg-zinc-800/75'}`}>
                          <div className="flex min-w-0 items-center gap-2">
                            <div className={`relative h-8 w-8 shrink-0 rounded-full ${isSpeaking ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-900' : 'ring-1 ring-white/10'}`}>
                              <ProfileAvatar profile={participant} size="sm" className="h-full w-full" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[0.68rem] font-black uppercase tracking-[0.06em] text-white">{participant.display_name}</p>
                              <p className="truncate text-[0.5rem] font-bold uppercase tracking-widest text-gray-500">{participant.isMe ? 'You' : participant.role || 'Operator'}</p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5 px-1">
                            {isSpeaking ? (
                              <div className="flex h-3 items-end gap-0.5 px-1 motion-reduce:hidden" aria-label="Speaking">
                                <span className="w-0.5 bg-emerald-400 animate-[voiceBar1_0.6s_ease-in-out_infinite]" style={{ height: '30%' }} />
                                <span className="w-0.5 bg-emerald-400 animate-[voiceBar2_0.8s_ease-in-out_infinite]" style={{ height: '70%' }} />
                                <span className="w-0.5 bg-emerald-400 animate-[voiceBar3_0.5s_ease-in-out_infinite]" style={{ height: '40%' }} />
                              </div>
                            ) : null}
                            {participant.muted ? <MicOff className="h-3.5 w-3.5 text-indigo-400" aria-label="Muted" /> : <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 opacity-70" aria-label="Mic on" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-white/6 pt-3">
                    <button type="button" aria-pressed={isMuted} aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'} onClick={toggleMute} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 ${isMuted ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200' : 'border-white/8 bg-zinc-900/90 text-gray-300 hover:bg-zinc-800'}`}>
                      {isMuted ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4 text-emerald-400" aria-hidden="true" />}
                      <span className="text-[0.5rem] font-black uppercase tracking-[0.08em]">{isMuted ? 'Muted' : 'Mic On'}</span>
                    </button>

                    <button type="button" aria-pressed={isDeafened} aria-label={isDeafened ? 'Turn sound on' : 'Deafen voice chat'} onClick={toggleDeafen} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 ${isDeafened ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200' : 'border-white/8 bg-zinc-900/90 text-gray-300 hover:bg-zinc-800'}`}>
                      {isDeafened ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4 text-cyan-400" aria-hidden="true" />}
                      <span className="text-[0.5rem] font-black uppercase tracking-[0.08em]">{isDeafened ? 'Deafened' : 'Sound On'}</span>
                    </button>

                    <button type="button" onClick={disconnectVoice} className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-indigo-500/50 bg-indigo-500/12 text-[0.56rem] font-black uppercase tracking-[0.14em] text-indigo-200 transition hover:bg-indigo-500/22 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/80">
                      <PhoneOff className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[0.52rem] font-bold uppercase tracking-[0.08em] text-gray-600">
              <Sparkles className="h-3 w-3 text-indigo-500/50" aria-hidden="true" />
              <span>21RATS WebRTC Node</span>
            </div>
          </section>
        ) : null}
      </div>

      <style>{`
        @keyframes voiceBar1 {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
        @keyframes voiceBar2 {
          0%, 100% { height: 60%; }
          50% { height: 20%; }
        }
        @keyframes voiceBar3 {
          0%, 100% { height: 40%; }
          50% { height: 80%; }
        }
      `}</style>
    </>
  )
}
