'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AudioRecorderProps {
  onSend: (blob: Blob, duration: number) => void
  disabled?: boolean
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSend, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
      }

      mediaRecorder.start(100)
      startTimeRef.current = Date.now()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Не удалось получить доступ к микрофону')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsRecording(false)
  }, [])

  const cancelRecording = useCallback(() => {
    stopRecording()
    setAudioBlob(null)
    setRecordingTime(0)
    cleanup()
  }, [stopRecording, cleanup])

  const sendRecording = useCallback(() => {
    if (audioBlob) {
      const duration = (Date.now() - startTimeRef.current) / 1000
      onSend(audioBlob, Math.max(recordingTime, Math.round(duration)))
      setAudioBlob(null)
      setRecordingTime(0)
    }
  }, [audioBlob, recordingTime, onSend])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Recording in progress
  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          className="size-9 rounded-full text-red-500 hover:bg-red-500/10 hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-500">{formatTime(recordingTime)}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={stopRecording}
          className="size-9 rounded-full border border-border bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/80"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Review recorded audio before sending
  if (audioBlob) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          className="size-9 rounded-full text-red-500 hover:bg-red-500/10 hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
          <span className="text-sm font-medium text-foreground">
            {formatTime(recordingTime)}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={sendRecording}
          className="size-9 rounded-full border border-border bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/80"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Default mic button
  return (
    <Button
      variant="ghost"
      size="icon"
      onMouseDown={startRecording}
      onTouchStart={startRecording}
      disabled={disabled}
      className="size-9 rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground dark:hover:bg-white/8"
    >
      <Mic className="h-4 w-4" />
    </Button>
  )
}
