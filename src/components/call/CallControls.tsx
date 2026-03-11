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
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleMute}
        className={`h-12 w-12 rounded-full ${
          isMuted ? 'bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30' : 'hover:bg-accent'
        }`}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>

      {/* Video toggle */}
      {showVideoToggle && (
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleVideo}
          className={`h-12 w-12 rounded-full ${
            isVideoOff ? 'bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30' : 'hover:bg-accent'
          }`}
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>
      )}

      {/* End call */}
      <Button
        variant="destructive"
        size="icon"
        onClick={onEndCall}
        className="h-14 w-14 rounded-full"
      >
        <PhoneOff className="h-6 w-6" />
      </Button>
    </div>
  )
}
