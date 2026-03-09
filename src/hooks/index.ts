// Custom hooks for chat functionality
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getSocket } from '@/hooks/useSocket'
import { 
  ChatUser, 
  User, 
  GroupChat,
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
  const [users, setUsers] = useState<(ChatUser | GroupChat)[]>([])
  const [selectedUser, setSelectedUser] = useState<User | GroupChat | null>(null)
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
export const useMessages = (selectedUser: User | GroupChat | null): UseMessagesReturn => {
  const { user, isConnected } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const refreshMessages = useCallback(async () => {
    if (!selectedUser) {
      setMessages([])
      return
    }

    // Clear messages immediately for visual feedback
    setMessages([])
    
    try {
      // Determine if it's a group chat or direct chat
      let messageList: Message[];
      if ((selectedUser as GroupChat).isGroup) {
        // It's a group chat
        messageList = await ChatService.fetchMessages('', (selectedUser as GroupChat).id);
      } else {
        // It's a direct chat
        messageList = await ChatService.fetchMessages((selectedUser as User).id);
      }
      setMessages(messageList)
    } catch (error) {
      console.error('Error refreshing messages:', error)
      setMessages([])
    }
  }, [selectedUser])

  // Fetch messages when selected user changes
  useEffect(() => {
    refreshMessages()
  }, [refreshMessages])

  const sendMessage = useCallback((content: string) => {
    if (!selectedUser || !user || isEmptyOrWhitespace(content)) {
      return
    }

    const socket = getSocket()
    if (!socket || !isConnected) {
      alert('Нет подключения к серверу. Проверьте соединение.')
      return
    }

    const isGroupChat = (selectedUser as GroupChat).isGroup;
    
    // Create temporary message for optimistic UI update
    const tempMessage = createTempMessage(
      content,
      user.id,
      user.username,
      isGroupChat ? undefined : (selectedUser as User).id, // receiverId for direct messages only
      user.avatar
    )

    setMessages(prev => [...prev, tempMessage])

    try {
      if (isGroupChat) {
        // Send to group chat
        SocketService.sendGroupMessage(socket, content, (selectedUser as GroupChat).id);
      } else {
        // Send to direct chat
        SocketService.sendMessage(socket, content, (selectedUser as User).id);
      }
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

    const isGroupChat = (selectedUser as GroupChat).isGroup;
    
    // Create temporary message for optimistic UI update
    const tempMessage = createTempMessage(
      '',
      user.id,
      user.username,
      isGroupChat ? undefined : (selectedUser as User).id, // receiverId for direct messages only
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
      const uploadResult = await FileService.uploadFile(file);
      
      if (uploadResult) {
        // Send file message through socket
        if (isGroupChat) {
          SocketService.sendGroupFileMessage(socket, {
            content: '',
            chatId: (selectedUser as GroupChat).id,
            fileName: uploadResult.fileName,
            fileUrl: uploadResult.fileUrl,
            fileType: uploadResult.fileType,
            fileSize: uploadResult.fileSize,
          });
        } else {
          SocketService.sendFileMessage(socket, {
            content: '',
            receiverId: (selectedUser as User).id,
            fileName: uploadResult.fileName,
            fileUrl: uploadResult.fileUrl,
            fileType: uploadResult.fileType,
            fileSize: uploadResult.fileSize,
          });
        }
      } else {
        // Remove temp message on error
        setMessages(prev => {
          const updatedMessages = prev.filter(m => m.id !== tempMessage.id)
          // Clean up ObjectURL
          cleanupObjectURL(tempMessage.fileUrl!)
          return updatedMessages
        })
      }
    } catch (error) {
      console.error('File upload error:', error)
      setMessages(prev => {
        const updatedMessages = prev.filter(m => m.id !== tempMessage.id)
        // Clean up ObjectURL
        cleanupObjectURL(tempMessage.fileUrl!)
        return updatedMessages
      })
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

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const success = await ChatService.deleteMessage(messageId)
      if (success) {
        // Remove the message from the local state
        setMessages(prev => prev.filter(msg => msg.id !== messageId))
        return true
      }
      return false
    } catch (error) {
      console.error('Error deleting message:', error)
      return false
    }
  }, [])

  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const updatedMessage = await ChatService.editMessage(messageId, content)
      if (updatedMessage) {
        // Update the message in the local state
        setMessages(prev => 
          prev.map(msg => msg.id === messageId ? updatedMessage : msg)
        )
        return true
      }
      return false
    } catch (error) {
      console.error('Error editing message:', error)
      return false
    }
  }, [])

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user) return

    const handleMessageReceive = (message: Message) => {
      // Only process messages for the currently selected user
      if (selectedUser && (message.senderId === selectedUser.id || message.receiverId === selectedUser.id)) {
        setMessages(prev => {
          // Check if this is a response to a temporary message we sent
          const isTemporary = message.senderId === user.id && 
            prev.some(m => m.id.startsWith('temp-') && 
              ((m.content && m.content === message.content) || 
               (m.fileName && m.fileName === message.fileName)));
          
          if (isTemporary) {
            // Replace the temporary message with the actual one
            return prev.map(m => {
              if (m.id.startsWith('temp-') && 
                  ((m.content && m.content === message.content) || 
                   (m.fileName && m.fileName === message.fileName))) {
                // Clean up ObjectURL if it was a file message
                if (m.fileUrl && m.fileUrl.startsWith('blob:')) {
                  cleanupObjectURL(m.fileUrl)
                }
                return message
              }
              return m
            });
          } else {
            // Add new received message
            return [...prev, message];
          }
        });
      }
    };

    const cleanup = SocketService.setupMessageListeners(
      socket,
      handleMessageReceive,
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
  }, [user, selectedUser])

  return {
    messages,
    sendMessage,
    sendFileMessage,
    clearMessages,
    isUploading,
    refreshMessages,
    deleteMessage, // Add delete function to the return object
    editMessage    // Add edit function to the return object
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

export { useMobile } from './useMobile'
