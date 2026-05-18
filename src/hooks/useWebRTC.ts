'use client'

import { useRef, useCallback } from 'react'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:5.35.125.104:3478',
      username: 'turnuser',
      credential: 'turnpassword123'
    }
  ]
}

interface PeerConnectionEntry {
  pc: RTCPeerConnection
  remoteStream: MediaStream
}

export const useWebRTC = () => {
  const peersRef = useRef<Map<string, PeerConnectionEntry>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)

  const getLocalStream = useCallback(async (audio: boolean, video: boolean): Promise<MediaStream> => {
    if (localStreamRef.current) {
      // Update existing stream tracks
      const stream = localStreamRef.current
      if (video) {
        const hasVideo = stream.getVideoTracks().length > 0
        if (!hasVideo) {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
          videoStream.getVideoTracks().forEach(track => stream.addTrack(track))
        }
      }
      return stream
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio, video })
    localStreamRef.current = stream
    return stream
  }, [])

  const createPeerConnection = useCallback((
    userId: string,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onRemoteStream: (userId: string, stream: MediaStream) => void
  ): RTCPeerConnection => {
    // Close existing connection for this user
    const existing = peersRef.current.get(userId)
    if (existing) {
      existing.pc.close()
    }

    const pc = new RTCPeerConnection(ICE_SERVERS)
    const remoteStream = new MediaStream()

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate)
      }
    }

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach(track => {
        remoteStream.addTrack(track)
      })
      onRemoteStream(userId, remoteStream)
    }

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    peersRef.current.set(userId, { pc, remoteStream })
    return pc
  }, [])

  const createOffer = useCallback(async (userId: string): Promise<RTCSessionDescriptionInit | null> => {
    const entry = peersRef.current.get(userId)
    if (!entry) return null

    const offer = await entry.pc.createOffer()
    await entry.pc.setLocalDescription(offer)
    return offer
  }, [])

  const createAnswer = useCallback(async (userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> => {
    const entry = peersRef.current.get(userId)
    if (!entry) return null

    await entry.pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await entry.pc.createAnswer()
    await entry.pc.setLocalDescription(answer)
    return answer
  }, [])

  const setRemoteAnswer = useCallback(async (userId: string, answer: RTCSessionDescriptionInit) => {
    const entry = peersRef.current.get(userId)
    if (!entry) return

    await entry.pc.setRemoteDescription(new RTCSessionDescription(answer))
  }, [])

  const addIceCandidate = useCallback(async (userId: string, candidate: RTCIceCandidateInit) => {
    const entry = peersRef.current.get(userId)
    if (!entry) return

    try {
      await entry.pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('Error adding ICE candidate:', error)
    }
  }, [])

  const addVideoTrack = useCallback(async (): Promise<void> => {
    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
    const videoTrack = videoStream.getVideoTracks()[0]
    if (!videoTrack) return

    if (localStreamRef.current) {
      localStreamRef.current.addTrack(videoTrack)
    }

    // Add track to all existing peer connections so they can renegotiate
    peersRef.current.forEach(({ pc }) => {
      if (localStreamRef.current) {
        pc.addTrack(videoTrack, localStreamRef.current)
      }
    })
  }, [])

  const toggleAudio = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = enabled
      })
    }
  }, [])

  const toggleVideo = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = enabled
      })
    }
  }, [])

  const cleanup = useCallback(() => {
    peersRef.current.forEach(({ pc }) => pc.close())
    peersRef.current.clear()

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
  }, [])

  const getRemoteStream = useCallback((userId: string): MediaStream | null => {
    return peersRef.current.get(userId)?.remoteStream || null
  }, [])

  return {
    getLocalStream,
    createPeerConnection,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    addVideoTrack,
    toggleAudio,
    toggleVideo,
    cleanup,
    getRemoteStream,
    localStreamRef,
  }
}
