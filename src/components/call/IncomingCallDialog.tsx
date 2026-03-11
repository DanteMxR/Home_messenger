'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Phone, Video, PhoneOff } from 'lucide-react'
import { getUserInitials } from '@/utils'
import { CallType } from '@/hooks/useCall'

interface IncomingCallDialogProps {
  callerUsername: string
  callerAvatar?: string | null
  callType: CallType
  onAcceptAudio: () => void
  onAcceptVideo: () => void
  onDecline: () => void
}

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  callerUsername,
  callerAvatar,
  callType,
  onAcceptAudio,
  onAcceptVideo,
  onDecline,
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 shadow-2xl">
        {/* Pulsing avatar */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
          <div className="absolute inset-0 animate-pulse rounded-full bg-green-500/10" />
          <Avatar className="relative h-20 w-20">
            {callerAvatar ? (
              <AvatarImage src={callerAvatar} alt={callerUsername} />
            ) : (
              <AvatarFallback className="text-2xl">{getUserInitials(callerUsername)}</AvatarFallback>
            )}
          </Avatar>
        </div>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">{callerUsername}</h3>
          <p className="text-sm text-muted-foreground">
            {callType === 'video' ? 'Видеозвонок...' : 'Аудиозвонок...'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Decline */}
          <Button
            variant="destructive"
            size="icon"
            onClick={onDecline}
            className="h-14 w-14 rounded-full"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

          {/* Accept audio */}
          <Button
            size="icon"
            onClick={onAcceptAudio}
            className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600"
          >
            <Phone className="h-6 w-6" />
          </Button>

          {/* Accept video */}
          <Button
            size="icon"
            onClick={onAcceptVideo}
            className="h-14 w-14 rounded-full bg-blue-500 hover:bg-blue-600"
          >
            <Video className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
