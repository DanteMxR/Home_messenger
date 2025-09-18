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
  Clock,
  Paperclip,
  File,
  Image,
  Download,
  Trash2
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
  // File attachment fields
  fileName?: string | null
  fileUrl?: string | null
  fileType?: string | null
  fileSize?: number | null
}

export default function ChatPage() {
  const { user, logout, isConnected } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const messageInputRef = useRef<HTMLInputElement>(null)
  // New state for clipboard image preview
  const [clipboardImage, setClipboardImage] = useState<{file: File, url: string} | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  
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

  // Clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!selectedUser || !user) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            // Create a URL for the image preview
            const url = URL.createObjectURL(file);
            setClipboardImage({ file, url });
            // Prevent default paste behavior
            e.preventDefault();
            return;
          }
        }
      }
    };

    const messageInput = messageInputRef.current;
    if (messageInput) {
      messageInput.addEventListener('paste', handlePaste);
      return () => {
        messageInput.removeEventListener('paste', handlePaste);
        // Clean up clipboard image URL if it exists
        if (clipboardImage) {
          URL.revokeObjectURL(clipboardImage.url);
        }
      };
    }
  }, [selectedUser, user, clipboardImage]);

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

  const sendFileMessage = async (file: File) => {
    if (!selectedUser || !user) {
      console.log('sendFileMessage: Missing required data')
      return
    }
    
    if (!socket) {
      console.log('sendFileMessage: No socket connection')
      return
    }
    
    if (!isConnected) {
      console.log('sendFileMessage: Socket not connected')
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('receiverId', selectedUser.id)
      formData.append('content', '') // Empty content for file messages

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        console.log('File uploaded successfully:', data.message)
        
        // Emit file message through socket
        socket.emit('file:send', {
          content: data.message.content,
          receiverId: selectedUser.id,
          fileName: data.message.fileName,
          fileUrl: data.message.fileUrl,
          fileType: data.message.fileType,
          fileSize: data.message.fileSize,
        })
      } else {
        const errorData = await response.json()
        console.error('File upload failed:', errorData.error)
      }
    } catch (error) {
      console.error('File upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      sendFileMessage(files[0])
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const sendClipboardImage = () => {
    if (clipboardImage && selectedUser && user) {
      sendFileMessage(clipboardImage.file);
      // Clean up the preview
      URL.revokeObjectURL(clipboardImage.url);
      setClipboardImage(null);
    }
  };

  const cancelClipboardImage = () => {
    if (clipboardImage) {
      URL.revokeObjectURL(clipboardImage.url);
      setClipboardImage(null);
    }
  };

  const clearMessages = async () => {
    if (!selectedUser || !user) return;
    
    try {
      // Send request to clear messages with this user
      const response = await fetch(`/api/messages/clear?userId=${selectedUser.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Clear messages from state
        setMessages([]);
      } else {
        console.error('Failed to clear messages');
      }
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
    
    setShowClearConfirm(false);
  };

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / 1048576).toFixed(1) + ' MB'
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

  const isImageFile = (fileType: string | null | undefined) => {
    if (!fileType) return false
    return fileType.startsWith('image/')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
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
          <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
            <Avatar>
              <AvatarFallback>{user?.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{user?.username}</p>
              <p className="text-sm text-gray-500">Пользователь</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
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
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
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
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
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
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Очистить
                </Button>
              </div>
            </div>

            {/* Confirmation dialog for clearing messages */}
            {showClearConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">Очистить историю сообщений</h3>
                  <p className="text-gray-600 mb-6">
                    Вы уверены, что хотите очистить всю историю сообщений с пользователем {selectedUser?.username}?
                    Это действие нельзя отменить.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowClearConfirm(false)}
                    >
                      Отмена
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={clearMessages}
                    >
                      Очистить
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4 max-w-full">
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
                        } ${message.fileName && message.fileUrl && isImageFile(message.fileType) ? '!max-w-full' : ''}`}
                      >
                        {/* File attachment */}
                        {message.fileName && message.fileUrl ? (
                          <div className="mb-2">
                            {isImageFile(message.fileType) ? (
                              // Image preview
                              <div className="mb-2 flex justify-center">
                                <img 
                                  src={message.fileUrl} 
                                  alt={message.fileName} 
                                  className="max-w-full max-h-64 rounded object-contain"
                                />
                              </div>
                            ) : (
                              // File attachment
                              <div className="flex items-center p-2 bg-gray-100 rounded mb-2">
                                <File className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{message.fileName}</p>
                                  <p className="text-xs text-gray-500">{formatFileSize(message.fileSize || 0)}</p>
                                </div>
                                <a href={message.fileUrl} download={message.fileName} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 text-gray-500 hover:text-gray-700 flex-shrink-0" />
                                </a>
                              </div>
                            )}
                          </div>
                        ) : null}
                        
                        {/* Text message */}
                        {message.content ? (
                          <p className="text-sm">{message.content}</p>
                        ) : null}
                        
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
            </div>

            {/* Message input */}
            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
              {/* Clipboard image preview */}
              {clipboardImage && (
                <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Предварительный просмотр изображения</span>
                    <div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={cancelClipboardImage}
                        className="mr-2"
                      >
                        Отмена
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={sendClipboardImage}
                        disabled={isUploading}
                      >
                        Отправить
                      </Button>
                    </div>
                  </div>
                  <img 
                    src={clipboardImage.url} 
                    alt="Clipboard preview" 
                    className="max-h-32 max-w-full rounded object-contain"
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading || !!clipboardImage}
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={triggerFileSelect}
                  disabled={isUploading || !!clipboardImage}
                  className="flex-shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  ref={messageInputRef}
                  placeholder="Введите сообщение... (Ctrl+V для предварительного просмотра изображения)"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  disabled={isUploading || !!clipboardImage}
                />
                <Button onClick={sendMessage} disabled={!messageText.trim() || isUploading || !!clipboardImage} className="flex-shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {isUploading && (
                <p className="text-sm text-gray-500 mt-2">Загрузка файла...</p>
              )}
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