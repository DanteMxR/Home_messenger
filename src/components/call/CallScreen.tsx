'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getUserInitials } from '@/utils'
import { CallControls } from './CallControls'
import { CallState, CallType } from '@/hooks/useCall'

interface CallScreenProps {
  callState: CallState
  localStream: React.RefObject<MediaStream | null>
  onToggleMute: () => void
  onToggleVideo: () => void
  onEndCall: () => void
}

export const CallScreen: React.FC<CallScreenProps> = ({
  callState,
  localStream,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [elapsed, setElapsed] = useState(0)

  // Set up local video
  useEffect(() => {
    if (localVideoRef.current && localStream.current) {
      localVideoRef.current.srcObject = localStream.current
    }
  }, [localStream, callState.isVideoOff])

  // Set up remote video
  useEffect(() => {
    const participant = callState.participants.find(p => p.stream)
    if (remoteVideoRef.current && participant?.stream) {
      remoteVideoRef.current.srcObject = participant.stream
    }
  }, [callState.participants])

  // Timer
  useEffect(() => {
    if (callState.status !== 'connected' || !callState.startTime) return

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - callState.startTime!) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [callState.status, callState.startTime])

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const isVideoCall = callState.type === 'video'
  const participantName = callState.participants[0]?.username || callState.caller?.username || ''
  const participantAvatar = callState.participants[0]?.avatar || callState.caller?.avatar
  const hasRemoteStream = callState.participants.some(p => p.stream)

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900 text-white">
      {/* Main area */}
      <div className="relative flex flex-1 items-center justify-center">
        {/* Remote video / avatar */}
        {isVideoCall && hasRemoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-28 w-28">
              {participantAvatar ? (
                <AvatarImage src={participantAvatar} alt={participantName} />
              ) : (
                <AvatarFallback className="bg-gray-700 text-3xl text-white">
                  {getUserInitials(participantName)}
                </AvatarFallback>
              )}
            </Avatar>
            <h2 className="text-2xl font-semibold">{participantName}</h2>
            <p className="text-sm text-gray-400">
              {callState.status === 'calling'
                ? 'Вызов...'
                : callState.status === 'connected'
                  ? formatElapsed(elapsed)
                  : 'Подключение...'}
            </p>
          </div>
        )}

        {/* Local video (small PiP) */}
        {isVideoCall && !callState.isVideoOff && (
          <div className="absolute bottom-24 right-4 h-40 w-28 overflow-hidden rounded-xl border-2 border-white/20 shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>
        )}

        {/* Group call: show grid of participants */}
        {callState.isGroupCall && callState.participants.length > 1 && (
          <div className="absolute inset-0 grid grid-cols-2 gap-1 p-2">
            {callState.participants.map(p => (
              <div key={p.userId} className="relative flex items-center justify-center rounded-lg bg-gray-800">
                {p.stream && isVideoCall ? (
                  <VideoTile stream={p.stream} />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-16 w-16">
                      {p.avatar ? (
                        <AvatarImage src={p.avatar} alt={p.username} />
                      ) : (
                        <AvatarFallback className="bg-gray-700 text-white">
                          {getUserInitials(p.username)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-sm">{p.username}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex-shrink-0 bg-gray-900/80 px-4 py-6 backdrop-blur-sm">
        <CallControls
          isMuted={callState.isMuted}
          isVideoOff={callState.isVideoOff}
          showVideoToggle={true}
          onToggleMute={onToggleMute}
          onToggleVideo={onToggleVideo}
          onEndCall={onEndCall}
        />
      </div>
    </div>
  )
}

// Helper component for video tiles in group calls
const VideoTile: React.FC<{ stream: MediaStream }> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="h-full w-full object-cover"
    />
  )
}
