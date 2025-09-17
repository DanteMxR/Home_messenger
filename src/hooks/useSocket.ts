import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

// Global socket instance to prevent multiple connections
let globalSocket: Socket | null = null

export const useSocket = (token?: string) => {
  const [isConnected, setIsConnected] = useState(false)
  const tokenRef = useRef<string | undefined>(undefined)
  const isInitializing = useRef(false)

  useEffect(() => {
    if (!token) {
      console.log('useSocket: No token provided')
      // Disconnect existing socket if no token
      if (globalSocket) {
        globalSocket.disconnect()
        globalSocket = null
        setIsConnected(false)
      }
      return
    }

    // If token hasn't changed and socket exists, don't recreate
    if (tokenRef.current === token && globalSocket && globalSocket.connected) {
      console.log('useSocket: Using existing connected socket')
      setIsConnected(true)
      return
    }

    // Prevent multiple simultaneous initializations
    if (isInitializing.current) {
      console.log('useSocket: Already initializing, skipping')
      return
    }

    isInitializing.current = true
    tokenRef.current = token

    // Disconnect existing socket before creating new one
    if (globalSocket) {
      console.log('useSocket: Disconnecting existing socket')
      globalSocket.disconnect()
      globalSocket = null
    }

    console.log('useSocket: Initializing new socket connection')
    
    // Create new socket connection
    globalSocket = io({
      path: '/api/socketio',
      auth: {
        token
      },
      autoConnect: true,
      forceNew: true // Force new connection to avoid conflicts
    })

    globalSocket.on('connect', () => {
      console.log('Socket connected successfully')
      setIsConnected(true)
      isInitializing.current = false
    })

    globalSocket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
      isInitializing.current = false
    })

    globalSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
      isInitializing.current = false
    })

    // Cleanup function
    return () => {
      if (globalSocket) {
        console.log('useSocket: Cleanup - disconnecting socket')
        globalSocket.disconnect()
        globalSocket = null
        setIsConnected(false)
      }
      isInitializing.current = false
    }
  }, [token])

  return {
    socket: globalSocket,
    isConnected
  }
}

export const getSocket = () => globalSocket