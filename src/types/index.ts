// Utility types
export type Theme = 'light' | 'dark'
export type MessageType = 'text' | 'file' | 'image'

// Shared TypeScript interfaces and types for the messenger application

export interface User {
  id: string
  username: string
  avatar?: string | null
  isOnline: boolean
  isAdmin?: boolean
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
  audioDuration?: number | null
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
  creatorId?: string | null
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


// API Response types
export interface ApiResponse<T = unknown> {
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

// File upload types
export interface FileUploadData {
  file: File
  receiverId: string
  content?: string
}

export interface FileUploadResponse {
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: number
}

export interface AuthUser {
  id: string
  username: string
  avatar?: string | null
  isOnline: boolean
  isAdmin?: boolean
  lastSeen: Date
  createdAt: Date
}

export interface LoginResponse {
  user: AuthUser
  token?: string
}

export interface UseMessagesReturn {
  messages: Message[]
  sendMessage: (content: string) => void
  sendFileMessage: (file: File) => void
  sendAudioMessage: (blob: Blob, duration: number) => void
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
  handleSettingsChange: (key: keyof Settings, value: unknown) => void
  saveSettings: () => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
  removeAvatar: () => Promise<void>
}

// Task Management Types
export interface Board {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: string; // 'owner', 'member', 'admin'
  joinedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string; // 'todo', 'in_progress', 'review', 'done'
  priority: string; // 'low', 'medium', 'high', 'urgent'
  assigneeId?: string;
  assigneeIds?: string[];
  creatorId: string;
  boardId: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date | string;
  chatId?: string;
}

export interface TaskWithRelations extends Task {
  creator: {
    id: string;
    username: string;
    avatar?: string | null;
    isOnline: boolean;
    isAdmin?: boolean;
    lastSeen: Date;
    createdAt?: Date;
  };
  assignee?: {
    id: string;
    username: string;
    avatar?: string | null;
    isOnline: boolean;
    isAdmin?: boolean;
    lastSeen: Date;
    createdAt?: Date;
  };
  assignees?: {
    id: string;
    taskId: string;
    userId: string;
    assignedAt: Date;
    user: {
      id: string;
      username: string;
      avatar?: string | null;
      isOnline: boolean;
      isAdmin?: boolean;
      lastSeen: Date;
      createdAt?: Date;
    };
  }[];
  board: Board;
  messages: {
    id: string;
    content: string;
    senderId: string;
    receiverId?: string;
    chatId?: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt?: Date;
    sender: {
      id: string;
      username: string;
      avatar?: string | null;
    };
    fileName?: string | null;
    fileUrl?: string | null;
    fileType?: string | null;
    fileSize?: number | null;
  }[];
}

export interface BoardWithRelations extends Board {
  tasks: Task[];
  members: BoardMember[];
  creator: User;
}

export interface CreateBoardData {
  title: string;
  description?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  boardId: string;
  assigneeId?: string;
  priority?: string;
  dueDate?: Date;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  dueDate?: Date | string;
}