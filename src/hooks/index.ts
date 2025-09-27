// Custom hooks for chat functionality
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getSocket } from '@/hooks/useSocket'
import { 
  ChatUser, 
  User, 
  Message, 
  Settings, 
  ClipboardImagePreview,
  UseChatReturn,
  UseMessagesReturn,
  UseSettingsReturn
} from '@/types'
import { 
  ChatService, 
  FileService, 
  UserService, 
  SocketService,
  SettingsService 
} from '@/services'
import { 
  createTempMessage, 
  cleanupObjectURL, 
  validateFile, 
  validateImageFile,
  isEmptyOrWhitespace 
} from '@/utils'

/**
 * Hook for managing chat list and user selection
 */
export const useChat = (): UseChatReturn => {
  const { user, isConnected } = useAuth()
  const [users, setUsers] = useState<ChatUser[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchChats = useCallback(async () => {
    if (!user) return
    const chats = await ChatService.fetchChats(searchTerm)
    setUsers(chats)
  }, [user, searchTerm])

  const markMessagesAsRead = useCallback(async (senderId: string) => {
    const socket = getSocket()
    
    try {
      if (socket && isConnected) {
        SocketService.markMessagesAsRead(socket, senderId)
      } else {
        await ChatService.markMessagesAsRead(senderId)
      }
      await fetchChats() // Refresh chat list
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }, [isConnected, fetchChats])

  // Load chats when user or search term changes
  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  return {
    users,
    selectedUser,
    searchTerm,
    setSelectedUser,
    setSearchTerm,
    fetchChats,
    markMessagesAsRead
  }
}

/**
 * Hook for managing messages and message sending
 */
export const useMessages = (selectedUser: User | null): UseMessagesReturn => {
  const { user, isConnected } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Fetch messages when selected user changes
  useEffect(() => {
    if (!selectedUser) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      const messageList = await ChatService.fetchMessages(selectedUser.id)
      setMessages(messageList)
    }

    loadMessages()
  }, [selectedUser])

  const sendMessage = useCallback((content: string) => {
    if (!selectedUser || !user || isEmptyOrWhitespace(content)) {
      return
    }

    const socket = getSocket()
    if (!socket || !isConnected) {
      alert('Нет подключения к серверу. Проверьте соединение.')
      return
    }

    // Create temporary message for optimistic UI update
    const tempMessage = createTempMessage(
      content,
      user.id,
      user.username,
      selectedUser.id,
      user.avatar
    )

    setMessages(prev => [...prev, tempMessage])

    try {
      SocketService.sendMessage(socket, content, selectedUser.id)
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
    }
  }, [selectedUser, user, isConnected])

  const sendFileMessage = useCallback(async (file: File) => {
    if (!selectedUser || !user) return

    const socket = getSocket()
    if (!socket || !isConnected) {
      alert('Нет подключения к серверу. Проверьте соединение.')
      return
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.isValid) {
      alert(validation.error)
      return
    }

    // Create temporary message for optimistic UI update
    const tempMessage = createTempMessage(
      '',
      user.id,
      user.username,
      selectedUser.id,
      user.avatar,
      {
        fileName: file.name,
        fileUrl: URL.createObjectURL(file),
        fileType: file.type,
        fileSize: file.size
      }
    )

    setMessages(prev => [...prev, tempMessage])
    setIsUploading(true)
    
    try {
      const uploadResult = await FileService.uploadFile(file, selectedUser.id, '')
      
      if (uploadResult) {
        // Send file message through socket
        SocketService.sendFileMessage(socket, {
          content: uploadResult.message.content,
          receiverId: selectedUser.id,
          fileName: uploadResult.message.fileName!,
          fileUrl: uploadResult.message.fileUrl!,
          fileType: uploadResult.message.fileType!,
          fileSize: uploadResult.message.fileSize!,
        })
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
      }
    } catch (error) {
      console.error('File upload error:', error)
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
    } finally {
      setIsUploading(false)
    }
  }, [selectedUser, user, isConnected])

  const clearMessages = useCallback(async () => {
    if (!selectedUser) return

    const success = await ChatService.clearMessages(selectedUser.id)
    if (success) {
      setMessages([])
    }
  }, [selectedUser])

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user) return

    const cleanup = SocketService.setupMessageListeners(
      socket,
      (message: Message) => {
        setMessages(prev => {
          // Check if this is a response to a temporary message we sent
          const isTemporary = message.senderId === user.id && 
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
      },
      () => {
        // Messages marked as read - handled by parent component
      },
      () => {
        // User online - handled by parent component
      },
      () => {
        // User offline - handled by parent component
      }
    )

    return cleanup
  }, [user])

  return {
    messages,
    sendMessage,
    sendFileMessage,
    clearMessages,
    isUploading
  }
}

/**
 * Hook for managing user settings
 */
export const useSettings = (): UseSettingsReturn => {
  const { user, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [showSettings, setShowSettings] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings>({
    username: user?.username || '',
    notifications: true,
    darkMode: theme === 'dark',
    soundEnabled: true,
  })

  // Update settings when user or theme changes
  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        username: user.username
      }))
    }
  }, [user])

  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      darkMode: theme === 'dark'
    }))
  }, [theme])

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = SettingsService.getSettings()
    setSettings(prev => ({ ...prev, ...savedSettings }))
  }, [])

  const handleSettingsChange = useCallback((key: keyof Settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Handle dark mode change immediately
    if (key === 'darkMode') {
      setTheme(value ? 'dark' : 'light')
    }
  }, [setTheme])

  const saveSettings = useCallback(async () => {
    try {
      // Apply theme setting
      setTheme(settings.darkMode ? 'dark' : 'light')
      
      // Update username if changed
      if (settings.username !== user?.username) {
        await UserService.updateProfile({ username: settings.username })
        await refreshUser()
      }
      
      // Save other settings locally
      SettingsService.saveSettings(settings)
      
      setShowSettings(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    }
  }, [settings, user, refreshUser, setTheme])

  const uploadAvatar = useCallback(async (file: File) => {
    // Validate image
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      throw new Error(validation.error)
    }
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    
    setIsUploadingAvatar(true)
    try {
      await FileService.uploadAvatar(file)
      await refreshUser()
      setAvatarPreview(null)
    } finally {
      setIsUploadingAvatar(false)
    }
  }, [refreshUser])

  const removeAvatar = useCallback(async () => {
    setIsUploadingAvatar(true)
    try {
      await FileService.removeAvatar()
      await refreshUser()
    } finally {
      setIsUploadingAvatar(false)
    }
  }, [refreshUser])

  return {
    settings,
    showSettings,
    isUploadingAvatar,
    avatarPreview,
    setShowSettings,
    handleSettingsChange,
    saveSettings,
    uploadAvatar,
    removeAvatar
  }
}

/**
 * Hook for managing clipboard image paste functionality
 */
export const useClipboardImage = (onImagePaste?: (file: File, url: string) => void) => {
  const [clipboardImage, setClipboardImage] = useState<ClipboardImagePreview | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          if (file) {
            const url = URL.createObjectURL(file)
            const imageData = { file, url }
            setClipboardImage(imageData)
            onImagePaste?.(file, url)
            e.preventDefault()
            return
          }
        }
      }
    }

    const inputElement = inputRef.current
    if (inputElement) {
      inputElement.addEventListener('paste', handlePaste)
      return () => {
        inputElement.removeEventListener('paste', handlePaste)
        if (clipboardImage) {
          cleanupObjectURL(clipboardImage.url)
        }
      }
    }
  }, [onImagePaste, clipboardImage])

  const cancelClipboardImage = useCallback(() => {
    if (clipboardImage) {
      cleanupObjectURL(clipboardImage.url)
      setClipboardImage(null)
    }
  }, [clipboardImage])

  const confirmClipboardImage = useCallback(() => {
    if (clipboardImage) {
      cleanupObjectURL(clipboardImage.url)
      setClipboardImage(null)
    }
  }, [clipboardImage])

  return {
    clipboardImage,
    inputRef,
    cancelClipboardImage,
    confirmClipboardImage,
    setClipboardImage
  }
}