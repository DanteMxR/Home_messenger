'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getSocket } from '@/hooks/useSocket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Send, 
  Search, 
  LogOut, 
  MessageCircle, 
  Users,
  Circle,
  Clock
} from 'lucide-react'

interface User {
  id: string
  username: string
  avatar?: string | null
  isOnline: boolean
  lastSeen: Date
}

interface Message {
  id: string
  content: string
  senderId: string
  receiverId?: string
  chatId?: string
  isRead: boolean
  createdAt: Date
  sender: {
    id: string
    username: string
    avatar?: string | null
  }
}

export default function ChatPage() {
  const { user, logout, isConnected } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Get socket from global instance since it's managed by AuthContext
  const socket = getSocket()

  // Load users
  useEffect(() => {
    if (user) {
      fetchUsers()
    }
  }, [user])

  // Load messages when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id)
    }
  }, [selectedUser])

  // Socket listeners
  useEffect(() => {
    if (socket) {
      socket.on('message:receive', (message: Message) => {
        setMessages(prev => [...prev, message])
      })

      socket.on('user:online', (data: { userId: string, username: string }) => {
        setUsers(prev => prev.map(u => 
          u.id === data.userId ? { ...u, isOnline: true } : u
        ))
      })

      socket.on('user:offline', (data: { userId: string, username: string }) => {
        setUsers(prev => prev.map(u => 
          u.id === data.userId ? { ...u, isOnline: false, lastSeen: new Date() } : u
        ))
      })

      return () => {
        socket.off('message:receive')
        socket.off('user:online')
        socket.off('user:offline')
      }
    }
  }, [socket])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/users?search=${searchTerm}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchMessages = async (receiverId: string) => {
    try {
      const response = await fetch(`/api/messages?receiverId=${receiverId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = () => {
    if (!messageText.trim() || !selectedUser) {
      console.log('sendMessage: Missing required data')
      return
    }
    
    if (!socket) {
      console.log('sendMessage: No socket connection')
      return
    }
    
    if (!isConnected) {
      console.log('sendMessage: Socket not connected')
      return
    }

    console.log('sendMessage: Sending message to', selectedUser.username)
    socket.emit('message:send', {
      content: messageText,
      receiverId: selectedUser.id,
    })

    setMessageText('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatLastSeen = (date: Date) => {
    const now = new Date()
    const lastSeen = new Date(date)
    const diffMs = now.getTime() - lastSeen.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин назад`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч назад`
    return lastSeen.toLocaleDateString('ru-RU')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold flex items-center">
              <MessageCircle className="mr-2 h-5 w-5 text-blue-600" />
              Мессенджер
            </h1>
            <div className="flex items-center space-x-2">
              <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                {isConnected ? 'Онлайн' : 'Оффлайн'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="p-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* User info */}
          <div className="flex items-center space-x-3 mb-4">
            <Avatar>
              <AvatarFallback>{user?.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{user?.username}</p>
              <p className="text-sm text-gray-500">Пользователь</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск пользователей..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Users list */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {users.map((user) => (
              <Card
                key={user.id}
                className={`mb-2 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <Circle 
                        className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                          user.isOnline ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'
                        }`} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.username}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.isOnline ? (
                          <span className="text-green-600">В сети</span>
                        ) : (
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {formatLastSeen(user.lastSeen)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar>
                    <AvatarFallback>{selectedUser.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Circle 
                    className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                      selectedUser.isOnline ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'
                    }`} 
                  />
                </div>
                <div>
                  <h2 className="font-semibold">{selectedUser.username}</h2>
                  <p className="text-sm text-gray-500">
                    {selectedUser.isOnline ? 'В сети' : `Был(а) в сети ${formatLastSeen(selectedUser.lastSeen)}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === user?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Введите сообщение..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!messageText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Выберите пользователя
              </h3>
              <p className="text-gray-500">
                Выберите пользователя из списка слева, чтобы начать общение
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}