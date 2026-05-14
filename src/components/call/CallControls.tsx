'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'

interface CallControlsProps {
  isMuted: boolean
  isVideoOff: boolean
  showVideoToggle: boolean
  onToggleMute: () => void
  onToggleVideo: () => void
  onEndCall: () => void
}

export const CallControls: React.FC<CallControlsProps> = ({
  isMuted,
  isVideoOff,
  showVideoToggle,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}) => {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Mute toggle */}
      <button
        onClick={onToggleMute}
        className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
          isMuted
            ? 'border-red-500/60 bg-red-500/30 text-red-400 hover:bg-red-500/40'
            : 'border-white/25 bg-white/15 text-white hover:bg-white/25'
        }`}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>

      {/* Video toggle */}
      {showVideoToggle && (
        <button
          onClick={onToggleVideo}
          className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
            isVideoOff
              ? 'border-red-500/60 bg-red-500/30 text-red-400 hover:bg-red-500/40'
              : 'border-white/25 bg-white/15 text-white hover:bg-white/25'
          }`}
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>
      )}

      {/* End call */}
      <button
        onClick={onEndCall}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700"
      >
        <PhoneOff className="h-6 w-6" />
      </button>
    </div>
  )
}
