// Utility functions for the messenger application
import { Message } from '@/types'

/**
 * Format time to display in chat messages
 */
export const formatTime = (date: Date | string): string => {
  return new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' bytes'
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  else return (bytes / 1048576).toFixed(1) + ' MB'
}

/**
 * Format last seen time for user status
 */
export const formatLastSeen = (date: Date | string): string => {
  const now = new Date()
  const lastSeen = new Date(date)
  const diffMs = now.getTime() - lastSeen.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'только что'
  if (diffMins < 60) return `${diffMins} мин назад`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч назад`
  return lastSeen.toLocaleDateString('ru-RU')
}

/**
 * Check if file type is an image
 */
export const isImageFile = (fileType: string | null | undefined): boolean => {
  if (!fileType) return false
  return fileType.startsWith('image/')
}

/**
 * Get preview text for last message in chat list
 */
export const getLastMessagePreview = (lastMessage: {
  content: string
  fileName: string | null
  fileType: string | null
} | null): string => {
  if (!lastMessage) return 'Нет сообщений'
  
  if (lastMessage.fileName) {
    if (lastMessage.fileType?.startsWith('image/')) {
      return '📷 Изображение'
    } else {
      return `📁 ${lastMessage.fileName}`
    }
  }
  
  return lastMessage.content || 'Пустое сообщение'
}

/**
 * Validate file for upload (size and type)
 */
export const validateFile = (file: File, maxSizeMB: number = 10): { isValid: boolean, error?: string } => {
  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      isValid: false,
      error: `Размер файла не должен превышать ${maxSizeMB}MB`
    }
  }
  
  return { isValid: true }
}

/**
 * Validate image file for avatar upload
 */
export const validateImageFile = (file: File, maxSizeMB: number = 5): { isValid: boolean, error?: string } => {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'Пожалуйста, выберите изображение'
    }
  }
  
  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      isValid: false,
      error: `Размер файла не должен превышать ${maxSizeMB}MB`
    }
  }
  
  return { isValid: true }
}

/**
 * Create a temporary message for optimistic UI updates
 */
export const createTempMessage = (
  content: string,
  senderId: string,
  senderUsername: string,
  receiverId: string,
  senderAvatar?: string | null,
  fileData?: {
    fileName: string
    fileUrl: string
    fileType: string
    fileSize: number
  }
): Message => {
  // Generate a more unique ID using timestamp + random number
  const uniqueId = 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  return {
    id: uniqueId,
    content,
    senderId,
    receiverId,
    isRead: false,
    createdAt: new Date(),
    sender: {
      id: senderId,
      username: senderUsername,
      avatar: senderAvatar || null
    },
    fileName: fileData?.fileName || null,
    fileUrl: fileData?.fileUrl || null,
    fileType: fileData?.fileType || null,
    fileSize: fileData?.fileSize || null
  }
}

/**
 * Clean up object URLs to prevent memory leaks
 */
export const cleanupObjectURL = (url: string): void => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

/**
 * Clean up multiple object URLs
 */
export const cleanupObjectURLs = (urls: (string | null | undefined)[]): void => {
  urls.forEach(url => {
    if (url) {
      cleanupObjectURL(url)
    }
  })
}

/**
 * Debounce function for search inputs
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Check if a string contains only whitespace
 */
export const isEmptyOrWhitespace = (str: string): boolean => {
  return !str || !str.trim()
}

/**
 * Generate user initials for avatar fallback
 */
export const getUserInitials = (username: string): string => {
  return username.charAt(0).toUpperCase()
}

/**
 * Handle clipboard paste for images
 */
export const handleClipboardPaste = (
  event: ClipboardEvent,
  callback: (file: File, url: string) => void
): boolean => {
  const items = event.clipboardData?.items
  if (!items) return false
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile()
      if (file) {
        const url = URL.createObjectURL(file)
        callback(file, url)
        event.preventDefault()
        return true
      }
    }
  }
  return false
}