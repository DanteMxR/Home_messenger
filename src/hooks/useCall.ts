'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { getSocket } from '@/hooks/useSocket'
import { useWebRTC } from './useWebRTC'

export type CallType = 'audio' | 'video'
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended'

export interface CallParticipant {
  userId: string
  username: string
  avatar?: string | null
  stream?: MediaStream | null
}

export interface CallState {
  callId: string | null
  status: CallStatus
  type: CallType
  isGroupCall: boolean
  chatId?: string
  participants: CallParticipant[]
  caller: CallParticipant | null
  isMuted: boolean
  isVideoOff: boolean
  startTime: number | null
}

const initialCallState: CallState = {
  callId: null,
  status: 'idle',
  type: 'audio',
  isGroupCall: false,
  participants: [],
  caller: null,
  isMuted: false,
  isVideoOff: false,
  startTime: null,
}

export const useCall = (currentUserId: string | undefined) => {
  const [callState, setCallState] = useState<CallState>(initialCallState)
  const callStateRef = useRef(callState)
  callStateRef.current = callState

  const webRTC = useWebRTC()
  const ringtoneRef = useRef<AudioContext | null>(null)
  const ringtoneOscRef = useRef<OscillatorNode | null>(null)

  const playRingtone = useCallback(() => {
    try {
      const ctx = new AudioContext()
      ringtoneRef.current = ctx
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 440
      gain.gain.value = 0.1

      // Create pulsing ringtone
      const now = ctx.currentTime
      for (let i = 0; i < 30; i++) {
        gain.gain.setValueAtTime(0.1, now + i * 2)
        gain.gain.setValueAtTime(0, now + i * 2 + 1)
      }

      osc.start()
      ringtoneOscRef.current = osc
    } catch (e) {
      console.error('Ringtone error:', e)
    }
  }, [])

  const stopRingtone = useCallback(() => {
    if (ringtoneOscRef.current) {
      ringtoneOscRef.current.stop()
      ringtoneOscRef.current = null
    }
    if (ringtoneRef.current) {
      ringtoneRef.current.close()
      ringtoneRef.current = null
    }
  }, [])

  // Initiate a call
  const initiateCall = useCallback(async (
    targetId: string,
    targetUsername: string,
    targetAvatar: string | null | undefined,
    type: CallType,
    isGroup: boolean = false,
    chatId?: string
  ) => {
    const socket = getSocket()
    if (!socket || !currentUserId) return

    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    try {
      const stream = await webRTC.getLocalStream(true, type === 'video')

      setCallState({
        callId,
        status: 'calling',
        type,
        isGroupCall: isGroup,
        chatId,
        participants: [{
          userId: targetId,
          username: targetUsername,
          avatar: targetAvatar,
        }],
        caller: null,
        isMuted: false,
        isVideoOff: type === 'audio',
        startTime: null,
      })

      socket.emit('call:initiate', {
        callId,
        targetId: isGroup ? undefined : targetId,
        chatId: isGroup ? chatId : undefined,
        type,
        isGroup,
      })

      playRingtone()
    } catch (error) {
      console.error('Error initiating call:', error)
      alert('Не удалось получить доступ к микрофону/камере')
    }
  }, [currentUserId, webRTC, playRingtone])

  // Accept a call
  const acceptCall = useCallback(async (withVideo: boolean = false) => {
    const socket = getSocket()
    const state = callStateRef.current
    if (!socket || !state.callId || !currentUserId) return

    stopRingtone()

    try {
      const callType = withVideo ? 'video' : state.type
      const stream = await webRTC.getLocalStream(true, callType === 'video')

      socket.emit('call:accept', {
        callId: state.callId,
        type: callType,
      })

      setCallState(prev => ({
        ...prev,
        status: 'connected',
        type: callType,
        isVideoOff: callType === 'audio',
        startTime: Date.now(),
      }))
    } catch (error) {
      console.error('Error accepting call:', error)
      alert('Не удалось получить доступ к микрофону/камере')
    }
  }, [currentUserId, webRTC, stopRingtone])

  // Decline a call
  const declineCall = useCallback(() => {
    const socket = getSocket()
    const state = callStateRef.current
    if (!socket || !state.callId) return

    stopRingtone()

    socket.emit('call:decline', { callId: state.callId })
    webRTC.cleanup()
    setCallState(initialCallState)
  }, [webRTC, stopRingtone])

  // End a call
  const endCall = useCallback(() => {
    const socket = getSocket()
    const state = callStateRef.current
    if (!socket || !state.callId) return

    stopRingtone()

    socket.emit('call:end', { callId: state.callId })
    webRTC.cleanup()
    setCallState(initialCallState)
  }, [webRTC, stopRingtone])

  // Toggle mute
  const toggleMute = useCallback(() => {
    setCallState(prev => {
      const newMuted = !prev.isMuted
      webRTC.toggleAudio(!newMuted)

      const socket = getSocket()
      if (socket && prev.callId) {
        socket.emit('call:toggle-media', {
          callId: prev.callId,
          mediaType: 'audio',
          enabled: !newMuted,
        })
      }

      return { ...prev, isMuted: newMuted }
    })
  }, [webRTC])

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const state = callStateRef.current
    const newVideoOff = !state.isVideoOff

    if (!newVideoOff) {
      // Enabling video
      const hasVideoTrack = (webRTC.localStreamRef.current?.getVideoTracks().length ?? 0) > 0
      if (!hasVideoTrack) {
        try {
          await webRTC.addVideoTrack()
          // Renegotiate with all peers so they receive our video
          const socket = getSocket()
          if (socket && state.callId) {
            for (const participant of state.participants) {
              const offer = await webRTC.createOffer(participant.userId)
              if (offer) {
                socket.emit('call:offer', {
                  callId: state.callId,
                  sdp: offer,
                  targetUserId: participant.userId,
                })
              }
            }
          }
        } catch {
          console.error('Failed to access camera')
          return
        }
      } else {
        webRTC.toggleVideo(true)
      }
    } else {
      webRTC.toggleVideo(false)
    }

    const socket = getSocket()
    if (socket && state.callId) {
      socket.emit('call:toggle-media', {
        callId: state.callId,
        mediaType: 'video',
        enabled: !newVideoOff,
      })
    }

    setCallState(prev => ({ ...prev, isVideoOff: newVideoOff }))
  }, [webRTC])

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !currentUserId) return

    // Incoming call
    const handleIncomingCall = (data: {
      callId: string
      callerId: string
      callerUsername: string
      callerAvatar?: string | null
      type: CallType
      isGroup: boolean
      chatId?: string
    }) => {
      // Ignore if already in a call
      if (callStateRef.current.status !== 'idle') {
        socket.emit('call:decline', { callId: data.callId })
        return
      }

      playRingtone()

      setCallState({
        callId: data.callId,
        status: 'incoming',
        type: data.type,
        isGroupCall: data.isGroup,
        chatId: data.chatId,
        participants: [],
        caller: {
          userId: data.callerId,
          username: data.callerUsername,
          avatar: data.callerAvatar,
        },
        isMuted: false,
        isVideoOff: data.type === 'audio',
        startTime: null,
      })
    }

    // Call accepted
    const handleCallAccepted = async (data: { callId: string, userId: string, type: CallType }) => {
      const state = callStateRef.current
      if (state.callId !== data.callId) return

      stopRingtone()

      // Create peer connection and exchange SDP
      const pc = webRTC.createPeerConnection(
        data.userId,
        (candidate) => {
          socket.emit('call:ice-candidate', {
            callId: data.callId,
            candidate,
            targetUserId: data.userId,
          })
        },
        (userId, stream) => {
          setCallState(prev => ({
            ...prev,
            participants: prev.participants.map(p =>
              p.userId === userId ? { ...p, stream } : p
            ),
          }))
        }
      )

      const offer = await webRTC.createOffer(data.userId)
      if (offer) {
        socket.emit('call:offer', {
          callId: data.callId,
          sdp: offer,
          targetUserId: data.userId,
        })
      }

      setCallState(prev => ({
        ...prev,
        status: 'connected',
        startTime: Date.now(),
      }))
    }

    // Call declined
    const handleCallDeclined = (data: { callId: string }) => {
      if (callStateRef.current.callId !== data.callId) return
      stopRingtone()
      webRTC.cleanup()
      setCallState(initialCallState)
    }

    // Call ended
    const handleCallEnded = (data: { callId: string }) => {
      if (callStateRef.current.callId !== data.callId) return
      stopRingtone()
      webRTC.cleanup()
      setCallState(initialCallState)
    }

    // SDP offer received
    const handleOffer = async (data: { callId: string, sdp: RTCSessionDescriptionInit, fromUserId: string }) => {
      if (callStateRef.current.callId !== data.callId) return

      const pc = webRTC.createPeerConnection(
        data.fromUserId,
        (candidate) => {
          socket.emit('call:ice-candidate', {
            callId: data.callId,
            candidate,
            targetUserId: data.fromUserId,
          })
        },
        (userId, stream) => {
          setCallState(prev => ({
            ...prev,
            participants: prev.participants.map(p =>
              p.userId === userId ? { ...p, stream } : p
            ).concat(
              prev.participants.some(p => p.userId === userId)
                ? []
                : [{ userId, username: '', stream }]
            ),
          }))
        }
      )

      const answer = await webRTC.createAnswer(data.fromUserId, data.sdp)
      if (answer) {
        socket.emit('call:answer', {
          callId: data.callId,
          sdp: answer,
          targetUserId: data.fromUserId,
        })
      }
    }

    // SDP answer received
    const handleAnswer = async (data: { callId: string, sdp: RTCSessionDescriptionInit, fromUserId: string }) => {
      if (callStateRef.current.callId !== data.callId) return
      await webRTC.setRemoteAnswer(data.fromUserId, data.sdp)
    }

    // ICE candidate received
    const handleIceCandidate = async (data: { callId: string, candidate: RTCIceCandidateInit, fromUserId: string }) => {
      if (callStateRef.current.callId !== data.callId) return
      await webRTC.addIceCandidate(data.fromUserId, data.candidate)
    }

    socket.on('call:incoming', handleIncomingCall)
    socket.on('call:accepted', handleCallAccepted)
    socket.on('call:declined', handleCallDeclined)
    socket.on('call:ended', handleCallEnded)
    socket.on('call:offer', handleOffer)
    socket.on('call:answer', handleAnswer)
    socket.on('call:ice-candidate', handleIceCandidate)

    return () => {
      socket.off('call:incoming', handleIncomingCall)
      socket.off('call:accepted', handleCallAccepted)
      socket.off('call:declined', handleCallDeclined)
      socket.off('call:ended', handleCallEnded)
      socket.off('call:offer', handleOffer)
      socket.off('call:answer', handleAnswer)
      socket.off('call:ice-candidate', handleIceCandidate)
    }
  }, [currentUserId, webRTC, playRingtone, stopRingtone])

  return {
    callState,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    localStream: webRTC.localStreamRef,
  }
}
