// Chat sidebar component for user list and search
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, MessageCircle, Circle, Clock } from 'lucide-react'
import { ChatUser, User } from '@/types'
import { formatTime, formatLastSeen, getLastMessagePreview, getUserInitials } from '@/utils'

interface ChatSidebarProps {
  users: ChatUser[]
  selectedUser: User | null
  searchTerm: string
  onUserSelect: (user: User) => void
  onSearchChange: (term: string) => void
  isConnected: boolean
}

interface ChatSidebarProps {
  users: ChatUser[]
  selectedUser: User | null
  searchTerm: string
  onUserSelect: (user: User) => void
  onSearchChange: (term: string) => void
  isConnected: boolean
  children?: React.ReactNode // For user profile section
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  users,
  selectedUser,
  searchTerm,
  onUserSelect,
  onSearchChange,
  isConnected,
  children
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header with messenger title and search */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold flex items-center text-foreground">
            <MessageCircle className="mr-2 h-6 w-6 text-primary" />
            Мессенджер
          </h1>
          <Badge variant={isConnected ? "default" : "destructive"} className="text-xs py-1 px-2">
            {isConnected ? 'Онлайн' : 'Оффлайн'}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск пользователей..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 py-2 rounded-lg border-0 focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
      </div>

      {/* User Profile Section */}
      {children && (
        <div className="p-4 border-b border-border flex-shrink-0">
          {children}
        </div>
      )}

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
                onClick={() => onUserSelect(user)}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12">
                      {user.avatar ? (
                        <AvatarImage src={user.avatar} alt={user.username} />
                      ) : (
                        <AvatarFallback className="font-medium bg-muted text-muted-foreground">
                          {getUserInitials(user.username)}
                        </AvatarFallback>
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
                        {getLastMessagePreview(user.lastMessage)}
                      </p>
                      {user.isOnline && (
                        <span className="text-xs text-green-600 ml-2 flex items-center">
                          <Circle className="h-1.5 w-1.5 fill-current mr-1" />
                          В сети
                        </span>
                      )}
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
  )
}