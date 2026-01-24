// Shared TypeScript interfaces and types for the messenger application

export interface User {
  id: string
  username: string
  avatar?: string | null
  isOnline: boolean
  lastSeen: Date
  createdAt?: Date
}

export interface Message {
  id: string
  content: string
  senderId: string
  receiverId?: string
  chatId?: string
  isRead: boolean
  createdAt: Date
  updatedAt?: Date
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
export interface ChatUser extends User {
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

export interface GroupChat {
  id: string
  name: string
  isGroup: boolean
  createdAt: Date
  updatedAt: Date
  members: User[]
  lastMessage: {
    id: string
    content: string
    senderId: string
    senderUsername: string
    createdAt: Date
    fileName: string | null
    fileType: string | null
  } | null
  unreadCount: number
  // For compatibility with ChatUser interface
  username?: string
  avatar?: string | null
  isOnline?: boolean
  lastSeen?: Date
}

export interface Settings {
  username: string
  notifications: boolean
  darkMode: boolean
  soundEnabled: boolean
}

export interface ClipboardImagePreview {
  file: File
  url: string
}

// Socket event types
export interface SocketMessageData {
  content: string
  receiverId: string
  chatId?: string
}

export interface SocketFileData extends SocketMessageData {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface ChatListResponse {
  chats: (ChatUser | GroupChat)[]
}

export interface MessagesResponse {
  messages: Message[]
}

export interface AuthUser {
  id: string
  username: string
  avatar?: string | null
  isOnline: boolean
  lastSeen: Date
  createdAt: Date
}

export interface LoginResponse {
  user: AuthUser
  token?: string
}

// File upload types
export interface FileUploadData {
  file: File
  receiverId: string
  content?: string
}

export interface FileUploadResponse {
  message: Message
  fileUrl: string
}

// Utility types
export type Theme = 'light' | 'dark'
export type MessageType = 'text' | 'file' | 'image'

// Component state types for better organization
export interface ChatPageState {
  selectedUser: User | null
  users: ChatUser[]
  messages: Message[]
  messageText: string
  searchTerm: string
  isUploading: boolean
  clipboardImage: ClipboardImagePreview | null
  showClearConfirm: boolean
  showEmojiPicker: boolean
  showSettings: boolean
  settings: Settings
  isUploadingAvatar: boolean
  avatarPreview: string | null
}

// Hook return types
export interface UseChatReturn {
  users: (ChatUser | GroupChat)[]
  selectedUser: User | GroupChat | null
  searchTerm: string
  setSelectedUser: (user: User | GroupChat | null) => void
  setSearchTerm: (term: string) => void
  fetchChats: () => Promise<void>
  markMessagesAsRead: (senderId: string) => Promise<void>
}

export interface UseMessagesReturn {
  messages: Message[]
  sendMessage: (content: string) => void
  sendFileMessage: (file: File) => void
  clearMessages: () => Promise<void>
  isUploading: boolean
  refreshMessages: () => Promise<void>
  deleteMessage: (messageId: string) => Promise<boolean>
  editMessage: (messageId: string, content: string) => Promise<boolean>
}

export interface UseSettingsReturn {
  settings: Settings
  showSettings: boolean
  isUploadingAvatar: boolean
  avatarPreview: string | null
  setShowSettings: (show: boolean) => void
  handleSettingsChange: (key: keyof Settings, value: any) => void
  saveSettings: () => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
  removeAvatar: () => Promise<void>
}