import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const BAR_COUNT = 40

function VoiceMessagePlayer({ mediaUrl }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [peaks, setPeaks] = useState(Array(BAR_COUNT).fill(0.1))
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const audioRef = useRef(null)
  const audioContextRef = useRef(null)

  useEffect(() => {
    let isCancelled = false

    async function loadAudioWaveform() {
      if (!mediaUrl) return
      try {
        const response = await fetch(mediaUrl)
        if (!response.ok) throw new Error('Network response was not ok')
        const arrayBuffer = await response.arrayBuffer()

        // Create AudioContext specifically for decoding
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        audioContextRef.current = new AudioContextClass()

        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
        if (isCancelled) return

        setDuration(audioBuffer.duration)

        // Downsample logic to get BAR_COUNT peaks
        const channelData = audioBuffer.getChannelData(0) // use first channel
        const blockSize = Math.floor(channelData.length / BAR_COUNT)
        const newPeaks = []

        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0
          const start = i * blockSize
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[start + j])
          }
          newPeaks.push(sum / blockSize)
        }

        // Normalize peaks between 0.1 and 1.0
        const maxPeak = Math.max(...newPeaks)
        const normalizedPeaks = newPeaks.map((peak) => Math.max(0.1, peak / maxPeak))

        setPeaks(normalizedPeaks)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to generate waveform:', err)
        setError(true)
        setIsLoading(false)
      }
    }

    loadAudioWaveform()

    return () => {
      isCancelled = true
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [mediaUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      if (duration > 0) {
        setProgress(audio.currentTime / duration)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      audio.currentTime = 0
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [duration])

  const togglePlayback = (event) => {
    event.stopPropagation()
    const audio = audioRef.current
    if (!audio || isLoading) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  const handleSeek = (event) => {
    event.stopPropagation()
    if (!audioRef.current || duration === 0) return

    const rect = event.currentTarget.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const newProgress = Math.max(0, Math.min(1, clickX / rect.width))
    
    audioRef.current.currentTime = newProgress * duration
    setProgress(newProgress)
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="relative mb-2 flex w-full max-w-[260px] items-center gap-3 rounded-[1.2rem] border border-white/10 bg-black/40 p-2 shadow-inner shadow-black/20 backdrop-blur-md">
      <audio 
        ref={audioRef} 
        src={mediaUrl} 
        preload="metadata" 
        className="hidden" 
        onLoadedMetadata={(e) => {
          if (e.target.duration && e.target.duration !== Infinity) {
            setDuration(e.target.duration)
          }
        }}
      />

      <button
        type="button"
        onClick={togglePlayback}
        disabled={isLoading}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] transition hover:bg-emerald-400 hover:shadow-[0_0_16px_rgba(16,185,129,0.5)] disabled:opacity-50 disabled:shadow-none"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="h-4.5 w-4.5 fill-current" /> : <Play className="ml-1 h-4.5 w-4.5 fill-current" />}
      </button>

      <div className="flex flex-1 flex-col justify-center">
        <div 
          className="flex h-7 w-full cursor-pointer items-center justify-between gap-[2px] py-1"
          onClick={handleSeek}
        >
          {peaks.map((amplitude, i) => {
            const isActive = i / BAR_COUNT <= progress
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  isActive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]' : 'bg-white/20'
                }`}
                style={{ height: `${amplitude * 100}%` }}
              />
            )
          })}
        </div>
        <div className="mt-0.5 flex items-center justify-between px-1">
          <span className="text-[0.6rem] font-bold text-gray-400">
            {formatTime(isPlaying ? progress * duration : duration)}
          </span>
          {isLoading && <span className="text-[0.6rem] font-bold text-emerald-400/70">Loading...</span>}
          {error && <span className="text-[0.6rem] font-bold text-red-400/70">Error</span>}
        </div>
      </div>
    </div>
  )
}

export default VoiceMessagePlayer
