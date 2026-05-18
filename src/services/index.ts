// Service layer for API calls and business logic
import {
  ChatUser,
  GroupChat,
  Message,
  Settings,
  ApiResponse,
  ChatListResponse,
  MessagesResponse,
  FileUploadResponse,
  AuthUser
} from '@/types'
import type { Socket } from 'socket.io-client'

/**
 * Chat service for managing chat-related API calls
 */
export class ChatService {
  /**
   * Fetch chats with optional search
   */
  static async fetchChats(searchTerm: string = ''): Promise<(ChatUser | GroupChat)[]> {
    try {
      const response = await fetch(`/api/chats?search=${encodeURIComponent(searchTerm)}`)
      if (response.ok) {
        const data: ChatListResponse = await response.json()
        return data.chats
      }
      throw new Error('Failed to fetch chats')
    } catch (error) {
      console.error('Error fetching chats:', error)
      return []
    }
  }

  /**
   * Fetch messages for a specific user or group chat
   */
  static async fetchMessages(receiverId: string = '', chatId: string = ''): Promise<Message[]> {
    try {
      let url = '/api/messages?';
      if (receiverId) {
        url += `receiverId=${receiverId}`;
      } else if (chatId) {
        url += `chatId=${chatId}`;
      } else {
        throw new Error('Either receiverId or chatId must be provided');
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data: MessagesResponse = await response.json()
        return data.messages
      }
      throw new Error('Failed to fetch messages')
    } catch (error) {
      console.error('Error fetching messages:', error)
      return []
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(senderId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/messages/mark-as-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ senderId }),
      })
      return response.ok
    } catch (error) {
      console.error('Error marking messages as read:', error)
      return false
    }
  }

  /**
   * Clear message history with a user
   */
  static async clearMessages(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/messages/clear?userId=${userId}`, {
        method: 'DELETE',
      })
      return response.ok
    } catch (error) {
      console.error('Error clearing messages:', error)
      return false
    }
  }

  /**
   * Delete a specific message
   */
  static async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/messages/delete?messageId=${messageId}`, {
        method: 'DELETE',
      })
      return response.ok
    } catch (error) {
      console.error('Error deleting message:', error)
      return false
    }
  }

  /**
   * Delete a group chat (owner deletes for all, member leaves)
   */
  static async deleteGroupChat(chatId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/group-chats/delete?chatId=${chatId}`, {
        method: 'DELETE',
      })
      return response.ok
    } catch (error) {
      console.error('Error deleting group chat:', error)
      return false
    }
  }

  /**
   * Delete a direct chat (clears all messages)
   */
  static async deleteDirectChat(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/messages/clear?userId=${userId}`, {
        method: 'DELETE',
      })
      return response.ok
    } catch (error) {
      console.error('Error deleting direct chat:', error)
      return false
    }
  }

  /**
   * Edit a specific message
   */
  static async editMessage(messageId: string, content: string): Promise<Message | null> {
    try {
      const response = await fetch('/api/messages/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, content }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.message
      }
      return null
    } catch (error) {
      console.error('Error editing message:', error)
      return null
    }
  }
}

/**
 * File service for handling file uploads
 */
export class FileService {
  /**
   * Upload a file with message data
   */
  static async uploadFile(
    file: File
  ): Promise<FileUploadResponse | null> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        return await response.json()
      }
      
      const errorData = await response.json()
      throw new Error(errorData.error || 'File upload failed')
    } catch (error) {
      console.error('File upload error:', error)
      return null
    }
  }

  /**
   * Upload avatar image
   */
  static async uploadAvatar(file: File): Promise<boolean> {
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      
      const response = await fetch('/api/avatar', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Avatar upload failed')
      }
      
      return true
    } catch (error) {
      console.error('Avatar upload error:', error)
      throw error
    }
  }

  /**
   * Remove user avatar
   */
  static async removeAvatar(): Promise<boolean> {
    try {
      const response = await fetch('/api/avatar', {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Avatar removal failed')
      }
      
      return true
    } catch (error) {
      console.error('Avatar removal error:', error)
      throw error
    }
  }
}

/**
 * User service for user-related operations
 */
export class UserService {
  /**
   * Update user profile
   */
  static async updateProfile(data: Partial<{ username: string }>): Promise<boolean> {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Profile update failed')
      }
      
      return true
    } catch (error) {
      console.error('Profile update error:', error)
      throw error
    }
  }

  /**
   * Get current user info
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        return data.user
      }
      return null
    } catch (error) {
      console.error('Error fetching current user:', error)
      return null
    }
  }
}

/**
 * Socket service for managing socket events
 */
export class SocketService {
  /**
   * Send a text message via socket
   */
  static sendMessage(socket: Socket, content: string, receiverId: string): void {
    if (!socket?.connected) {
      throw new Error('Socket not connected')
    }
    
    socket.emit('message:send', {
      content,
      receiverId,
    })
  }

  static sendGroupMessage(socket: Socket, content: string, chatId: string): void {
    if (!socket?.connected) {
      throw new Error('Socket not connected')
    }
    
    socket.emit('message:send', {
      content,
      chatId,
    })
  }

  /**
   * Send a file message via socket
   */
  static sendFileMessage(
    socket: Socket, 
    messageData: {
      content: string
      receiverId: string
      fileName: string
      fileUrl: string
      fileType: string
      fileSize: number
    }
  ): void {
    if (!socket?.connected) {
      throw new Error('Socket not connected')
    }
    
    socket.emit('file:send', messageData)
  }

  static sendGroupFileMessage(
    socket: Socket,
    messageData: {
      content: string
      chatId: string
      fileName: string
      fileUrl: string
      fileType: string
      fileSize: number
      audioDuration?: number
    }
  ): void {
    if (!socket?.connected) {
      throw new Error('Socket not connected')
    }

    socket.emit('file:send', messageData)
  }

  /**
   * Send an audio message via socket (direct)
   */
  static sendAudioMessage(
    socket: Socket,
    messageData: {
      content: string
      receiverId: string
      fileName: string
      fileUrl: string
      fileType: string
      fileSize: number
      audioDuration: number
    }
  ): void {
    if (!socket?.connected) {
      throw new Error('Socket not connected')
    }
    socket.emit('file:send', messageData)
  }

  /**
   * Send an audio message to group via socket
   */
  static sendGroupAudioMessage(
    socket: Socket,
    messageData: {
      content: string
      chatId: string
      fileName: string
      fileUrl: string
      fileType: string
      fileSize: number
      audioDuration: number
    }
  ): void {
    if (!socket?.connected) {
      throw new Error('Socket not connected')
    }
    socket.emit('file:send', messageData)
  }

  /**
   * Mark messages as read via socket
   */
  static markMessagesAsRead(socket: Socket, senderId: string): void {
    if (socket?.connected) {
      socket.emit('messages:mark-as-read', { senderId })
    }
  }

  /**
   * Setup socket event listeners
   */
  static setupMessageListeners(
    socket: Socket,
    onMessageReceive: (message: Message) => void,
    onMessagesRead: () => void,
    onUserOnline: (data: { userId: string, username: string }) => void,
    onUserOffline: (data: { userId: string, username: string }) => void
  ): () => void {
    if (!socket) return () => {}

    socket.on('message:receive', onMessageReceive)
    socket.on('messages:read', onMessagesRead)
    socket.on('user:online', onUserOnline)
    socket.on('user:offline', onUserOffline)

    // Return cleanup function
    return () => {
      socket.off('message:receive', onMessageReceive)
      socket.off('messages:read', onMessagesRead)
      socket.off('user:online', onUserOnline)
      socket.off('user:offline', onUserOffline)
    }
  }
}

/**
 * Settings service (for future backend integration)
 */
export class SettingsService {
  private static readonly STORAGE_KEY = 'messenger-settings'

  /**
   * Save settings to localStorage (temporary solution)
   */
  static saveSettings(settings: Partial<Settings>): void {
    try {
      const existingSettings = this.getSettings()
      const updatedSettings = { ...existingSettings, ...settings }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSettings))
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  /**
   * Load settings from localStorage
   */
  static getSettings(): Partial<Settings> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Error loading settings:', error)
      return {}
    }
  }

  /**
   * Clear all settings
   */
  static clearSettings(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing settings:', error)
    }
  }
}