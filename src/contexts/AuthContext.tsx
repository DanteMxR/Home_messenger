'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSocket } from '@/hooks/useSocket'

interface User {
  id: string
  username: string
  avatar?: string | null
  isOnline: boolean
  lastSeen: Date
  createdAt: Date
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
  error: string | null
  isConnected: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [socketToken, setSocketToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { isConnected } = useSocket(socketToken || undefined)

  useEffect(() => {
    checkAuth()
  }, [])

  const fetchSocketToken = async () => {
    try {
      console.log('Fetching socket token...')
      const response = await fetch('/api/auth/socket-token')
      console.log('Socket token response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Socket token received successfully')
        setSocketToken(data.token)
        return data.token
      } else {
        console.log('Failed to get socket token:', response.status)
        setSocketToken(null)
        return null
      }
    } catch (error) {
      console.error('Failed to fetch socket token:', error)
      setSocketToken(null)
      return null
    }
  }

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setToken('authenticated') // We use httpOnly cookies, so no actual token in client
        await fetchSocketToken() // Get socket token for real-time features
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа')
      }

      setUser(data.user)
      setToken('authenticated')
      await fetchSocketToken() // Get socket token for real-time features
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка входа')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (username: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка регистрации')
      }

      setUser(data.user)
      setToken('authenticated')
      await fetchSocketToken() // Get socket token for real-time features
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка регистрации')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setToken(null)
      setSocketToken(null)
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    error,
    isConnected,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}