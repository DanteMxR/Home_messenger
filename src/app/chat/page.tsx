'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getSocket } from '@/hooks/useSocket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
  Trash2,
  Smile,
  Settings,
  ChevronDown,
  Upload,
  Camera
} from 'lucide-react'

// Add emoji picker imports
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

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

// Enhanced chat interface with last message and unread count
interface ChatUser extends User {
  lastMessage: {
    id: string
    content: string
    senderId: string
    createdAt: Date
    fileName: string | null
    fileType: string | null
  } | null
  unreadCount: number
}

export default function ChatPage() {
  const { user, logout, isConnected, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [users, setUsers] = useState<ChatUser[]>([])
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
  // New state for emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  // Settings dialog state
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({
    username: user?.username || '',
    notifications: true,
    darkMode: theme === 'dark',
    soundEnabled: true,
  })
  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  
  // Get socket from global instance since it's managed by AuthContext
  const socket = getSocket()

  // Load users with chat info
  useEffect(() => {
    if (user) {
      fetchChats()
    }
  }, [user, searchTerm])

  // Load messages when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id)
      // Mark messages as read when opening chat
      markMessagesAsRead(selectedUser.id)
    }
  }, [selectedUser])

  // Socket listeners
  useEffect(() => {
    if (socket) {
      socket.on('message:receive', (message: Message) => {
        setMessages(prev => {
          // Check if this is a response to a temporary message we sent
          const isTemporary = message.senderId === user?.id && 
            prev.some(m => m.id.startsWith('temp-') && m.content === message.content);
          
          if (isTemporary) {
            // Replace the temporary message with the actual one
            return prev.map(m => 
              m.id.startsWith('temp-') && m.content === message.content 
                ? message 
                : m
            );
          } else {
            // Add new received message
            return [...prev, message];
          }
        });
        // Refresh chat list to update last message and unread count
        fetchChats();
      })

      socket.on('messages:read', () => {
        // Refresh chat list when messages are marked as read
        fetchChats();
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
        socket.off('messages:read')
        socket.off('user:online')
        socket.off('user:offline')
      }
    }
  }, [socket, user])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Update settings when user changes
  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        username: user.username
      }))
    }
  }, [user])

  // Sync settings with theme context
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      darkMode: theme === 'dark'
    }))
  }, [theme])

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
  }, [selectedUser, user, clipboardImage])

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any remaining object URLs to prevent memory leaks
      messages.forEach(message => {
        if (message.fileUrl && message.fileUrl.startsWith('blob:')) {
          URL.revokeObjectURL(message.fileUrl);
        }
      });
      if (clipboardImage) {
        URL.revokeObjectURL(clipboardImage.url);
      }
    };
  }, [messages, clipboardImage]);

  // Click outside handler to close emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && !(event.target as Element).closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker])

  const fetchChats = async () => {
    try {
      const response = await fetch(`/api/chats?search=${searchTerm}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.chats)
      }
    } catch (error) {
      console.error('Error fetching chats:', error)
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

  const markMessagesAsRead = async (senderId: string) => {
    try {
      // Use socket to mark messages as read
      if (socket && socket.connected) {
        socket.emit('messages:mark-as-read', { senderId })
      } else {
        // Fallback to API call
        await fetch('/api/messages/mark-as-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ senderId }),
        })
      }
      // Refresh chat list to update unread counts
      fetchChats()
    } catch (error) {
      console.error('Error marking messages as read:', error)
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
      // Show error to user
      alert('Нет подключения к серверу. Проверьте соединение.')
      return
    }

    // Create a temporary message object to show immediately
    const tempMessage: Message = {
      id: 'temp-' + Date.now(),
      content: messageText,
      senderId: user!.id,
      receiverId: selectedUser.id,
      isRead: false,
      createdAt: new Date(),
      sender: {
        id: user!.id,
        username: user!.username,
        avatar: user!.avatar || null
      }
    }

    // Immediately add to local state for instant feedback
    setMessages(prev => [...prev, tempMessage])

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

    // Create a temporary message object to show immediately
    const tempMessage: Message = {
      id: 'temp-' + Date.now(),
      content: '',
      senderId: user.id,
      receiverId: selectedUser.id,
      isRead: false,
      createdAt: new Date(),
      sender: {
        id: user.id,
        username: user.username,
        avatar: user.avatar || null
      },
      fileName: file.name,
      fileUrl: URL.createObjectURL(file), // Preview URL
      fileType: file.type,
      fileSize: file.size
    }

    // Immediately add to local state for instant feedback
    setMessages(prev => [...prev, tempMessage])
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
        // Remove the temporary message if upload fails
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
      }
    } catch (error) {
      console.error('File upload error:', error)
      // Remove the temporary message if upload fails
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
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

  const addEmoji = (emoji: { native: string }) => {
    setMessageText(prev => prev + emoji.native);
    // Don't close the picker automatically - let it close only when user clicks outside
    // setShowEmojiPicker(false);
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

  const handleSettingsChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Handle dark mode change immediately
    if (key === 'darkMode') {
      setTheme(value ? 'dark' : 'light')
    }
  }

  const saveSettings = async () => {
    try {
      // Apply theme setting to ThemeContext
      setTheme(settings.darkMode ? 'dark' : 'light')
      
      // Update username if changed
      if (settings.username !== user?.username) {
        const response = await fetch('/api/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: settings.username }),
        })
        
        if (response.ok) {
          await refreshUser()
        } else {
          const errorData = await response.json()
          console.error('Failed to update username:', errorData.error)
          return
        }
      }
      
      // Here you would typically save other settings to backend
      console.log('Saving settings:', settings)
      // For now, just close the dialog
      setShowSettings(false)
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение')
        return
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB')
        return
      }
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Upload avatar
      uploadAvatar(file)
    }
  }

  const uploadAvatar = async (file: File) => {
    setIsUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      
      const response = await fetch('/api/avatar', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        await refreshUser()
        setAvatarPreview(null)
      } else {
        const errorData = await response.json()
        console.error('Avatar upload failed:', errorData.error)
        alert('Ошибка загрузки аватара: ' + errorData.error)
        setAvatarPreview(null)
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      alert('Ошибка загрузки аватара')
      setAvatarPreview(null)
    } finally {
      setIsUploadingAvatar(false)
      // Reset file input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    }
  }

  const removeAvatar = async () => {
    setIsUploadingAvatar(true)
    try {
      const response = await fetch('/api/avatar', {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await refreshUser()
      } else {
        const errorData = await response.json()
        console.error('Avatar removal failed:', errorData.error)
        alert('Ошибка удаления аватара: ' + errorData.error)
      }
    } catch (error) {
      console.error('Avatar removal error:', error)
      alert('Ошибка удаления аватара')
    } finally {
      setIsUploadingAvatar(false)
    }
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

  // Function to get preview text for last message
  const getLastMessagePreview = (chatUser: ChatUser) => {
    if (!chatUser.lastMessage) return 'Нет сообщений'
    
    if (chatUser.lastMessage.fileName) {
      if (chatUser.lastMessage.fileType?.startsWith('image/')) {
        return '📷 Изображение'
      } else {
        return `📁 ${chatUser.lastMessage.fileName}`
      }
    }
    
    return chatUser.lastMessage.content || 'Пустое сообщение'
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-card border-r border-border flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold flex items-center text-foreground">
              <MessageCircle className="mr-2 h-6 w-6 text-primary" />
              Мессенджер
            </h1>
            <div className="flex items-center space-x-2">
              <Badge variant={isConnected ? "default" : "destructive"} className="text-xs py-1 px-2">
                {isConnected ? 'Онлайн' : 'Оффлайн'}
              </Badge>
            </div>
          </div>
          
          {/* User info */}
          <div className="flex items-center space-x-3 mb-4 flex-shrink-0 bg-muted p-3 rounded-xl border border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-3 w-full hover:bg-accent rounded-lg p-2 transition-colors">
                  <Avatar className="h-12 w-12">
                    {user?.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.username} />
                    ) : (
                      <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                        {user?.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-foreground">{user?.username}</p>
                    <p className="text-sm text-muted-foreground">Пользователь</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Настройки</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск пользователей..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-2 rounded-lg border-0 focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
        </div>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Настройки аккаунта</DialogTitle>
              <DialogDescription>
                Измените настройки своего аккаунта и уведомлений.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Avatar Upload Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    {avatarPreview ? (
                      <AvatarImage src={avatarPreview} alt="Avatar preview" />
                    ) : user?.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.username} />
                    ) : (
                      <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                        {user?.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarSelect}
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingAvatar}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    {"Загрузить"}
                  </Button>
                  {user?.avatar && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={removeAvatar}
                      disabled={isUploadingAvatar}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {"Удалить"}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Максимальный размер: 5MB<br/>
                  Поддерживаемые форматы: JPG, PNG, GIF
                </p>
              </div>
              
              <div className="border-t pt-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Имя пользователя
                  </Label>
                  <Input
                    id="username"
                    value={settings.username}
                    onChange={(e) => handleSettingsChange('username', e.target.value)}
                    className="col-span-3"
                    placeholder="Введите имя пользователя"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="text-sm font-medium">
                  Уведомления
                </Label>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={(checked) => handleSettingsChange('notifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="darkMode" className="text-sm font-medium">
                  Темная тема
                </Label>
                <Switch
                  id="darkMode"
                  checked={settings.darkMode}
                  onCheckedChange={(checked) => handleSettingsChange('darkMode', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="soundEnabled" className="text-sm font-medium">
                  Звуковые уведомления
                </Label>
                <Switch
                  id="soundEnabled"
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => handleSettingsChange('soundEnabled', checked)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Отмена
              </Button>
              <Button onClick={saveSettings}>
                Сохранить изменения
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Users list */}
        <div className="flex-1 overflow-hidden">
          <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Контакты
          </div>
          <ScrollArea className="h-full px-2">
            <div className="pb-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`mb-1 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                    selectedUser?.id === user.id 
                      ? 'bg-accent border border-border shadow-sm' 
                      : 'hover:bg-accent/50 border border-transparent'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-12 w-12">
                        {user.avatar ? (
                          <AvatarImage src={user.avatar} alt={user.username} />
                        ) : (
                          <AvatarFallback className="font-medium bg-muted text-muted-foreground">{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        )}
                      </Avatar>
                      <Circle 
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                          user.isOnline ? 'text-green-500 fill-green-500 shadow-sm' : 'text-muted-foreground fill-muted-foreground'
                        }`} 
                      />
                      {user.unreadCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full shadow-sm animate-pulse"
                        >
                          {user.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-foreground truncate">{user.username}</p>
                        {user.lastMessage && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatTime(user.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className={`text-sm truncate ${user.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {getLastMessagePreview(user)}
                        </p>
                        {user.isOnline ? (
                          <span className="text-xs text-green-600 ml-2 flex items-center">
                            <Circle className="h-1.5 w-1.5 fill-current mr-1" />
                            В сети
                          </span>
                        ) : null}
                      </div>
                      {!user.isOnline && user.lastMessage && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatLastSeen(user.lastSeen)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
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
            <div className="bg-card border-b border-border p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar>
                      {selectedUser.avatar ? (
                        <AvatarImage src={selectedUser.avatar} alt={selectedUser.username} />
                      ) : (
                        <AvatarFallback>{selectedUser.username.charAt(0).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                    <Circle 
                      className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                        selectedUser.isOnline ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'
                      }`} 
                    />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">{selectedUser.username}</h2>
                    <p className="text-sm text-muted-foreground">
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
                <div className="bg-card rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4 text-foreground">Очистить историю сообщений</h3>
                  <p className="text-muted-foreground mb-6">
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
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
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
                              <div className="flex items-center p-2 bg-accent rounded mb-2">
                                <File className="h-5 w-5 mr-2 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate text-foreground">{message.fileName}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(message.fileSize || 0)}</p>
                                </div>
                                <a href={message.fileUrl} download={message.fileName} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 text-muted-foreground hover:text-foreground flex-shrink-0" />
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
                            message.senderId === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
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
            <div className="bg-card border-t border-border p-4 flex-shrink-0 relative">
              {/* Clipboard image preview */}
              {clipboardImage && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">Предварительный просмотр изображения</span>
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
                <Input
                  ref={messageInputRef}
                  placeholder="Введите сообщение..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  disabled={isUploading || !!clipboardImage}
                />
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
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="flex-shrink-0"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                  <Button onClick={sendMessage} disabled={!messageText.trim() || isUploading || !!clipboardImage} className="flex-shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Emoji picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 z-10 emoji-picker-container">
                  <div>
                    <Picker 
                      data={data} 
                      onEmojiSelect={addEmoji} 
                      theme="light"
                      perLine={8}
                      emojiSize={24}
                      emojiButtonSize={32}
                      navPosition="bottom"
                      previewPosition="none"
                      skinTonePosition="none"
                    />
                  </div>
                </div>
              )}
              
              {isUploading && (
                <p className="text-sm text-muted-foreground mt-2">Загрузка файла...</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Выберите пользователя
              </h3>
              <p className="text-muted-foreground">
                Выберите пользователя из списка слева, чтобы начать общение
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}