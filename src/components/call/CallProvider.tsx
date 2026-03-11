'use client'

import React, { createContext, useContext } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCall, CallState, CallType } from '@/hooks/useCall'
import { IncomingCallDialog } from './IncomingCallDialog'
import { CallScreen } from './CallScreen'

interface CallContextValue {
  callState: CallState
  initiateCall: (
    targetId: string,
    targetUsername: string,
    targetAvatar: string | null | undefined,
    type: CallType,
    isGroup?: boolean,
    chatId?: string
  ) => Promise<void>
  endCall: () => void
}

const CallContext = createContext<CallContextValue | null>(null)

export const useCallContext = () => {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCallContext must be used within CallProvider')
  return ctx
}

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const {
    callState,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    localStream,
  } = useCall(user?.id)

  return (
    <CallContext.Provider value={{ callState, initiateCall, endCall }}>
      {children}

      {/* Incoming call dialog */}
      {callState.status === 'incoming' && callState.caller && (
        <IncomingCallDialog
          callerUsername={callState.caller.username}
          callerAvatar={callState.caller.avatar}
          callType={callState.type}
          onAcceptAudio={() => acceptCall(false)}
          onAcceptVideo={() => acceptCall(true)}
          onDecline={declineCall}
        />
      )}

      {/* Active call screen */}
      {(callState.status === 'calling' || callState.status === 'connected') && (
        <CallScreen
          callState={callState}
          localStream={localStream}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
        />
      )}
    </CallContext.Provider>
  )
}
