// Chat sidebar component for user list and search
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Radio, Circle, Clock, X, ChevronLeft, ChevronRight, Users, Plus, Shield, SquareKanban } from 'lucide-react'
import { ChatUser, User, GroupChat } from '@/types'
import { formatTime, formatLastSeen, getLastMessagePreview, getUserInitials } from '@/utils'
import { Button } from '@/components/ui/button'

interface ChatSidebarProps {
  users: (ChatUser | GroupChat)[]
  selectedUser: (User | GroupChat) | null
  searchTerm: string
  onUserSelect: (user: User | GroupChat) => void
  onSearchChange: (term: string) => void
  isConnected: boolean
  children?: React.ReactNode // For user profile section
  onClose?: () => void // For mobile close functionality
  isMobile?: boolean // To determine if we're on mobile
  onCollapse?: () => void // For collapsing the sidebar
  isCollapsed?: boolean // To determine if sidebar is collapsed
  onOpenGroupDialog?: () => void // Callback to open group creation dialog
  currentUser?: User // Current logged-in user
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  users,
  selectedUser,
  searchTerm,
  onUserSelect,
  onSearchChange,
  isConnected,
  children,
  onClose,
  isMobile = false,
  onCollapse,
  isCollapsed = false,
  onOpenGroupDialog,
  currentUser
}) => {
  // Filter direct chats and group chats
  const directChats = users.filter(user => !(user as GroupChat).isGroup) as ChatUser[];
  const groupChats = users.filter(user => (user as GroupChat).isGroup) as GroupChat[];

  return (
    <div className="flex flex-col h-full">
      {/* Header with messenger title and search */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          {!isCollapsed ? (
            <>
              <h1 className="text-xl font-bold flex items-center text-foreground">
                <Radio className="mr-2 h-6 w-6 text-primary" />
                Мессенджер
              </h1>
              <div className="flex items-center space-x-2">
                {isMobile && onClose && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
                <Badge variant={isConnected ? "default" : "destructive"} className="text-xs py-1 px-2">
                  {isConnected ? 'Онлайн' : 'Оффлайн'}
                </Badge>

                {!isMobile && onCollapse && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={onCollapse}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onCollapse}
                className="h-8 w-8"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <>
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
            
            {/* Create Group Button */}
            <Button 
              variant="outline" 
              className="mt-2 w-full justify-start"
              onClick={onOpenGroupDialog}
            >
              <Plus className="h-4 w-4 mr-2" />
              Создать группу
            </Button>
            
            {/* Admin Panel Link - only for admins */}
            {currentUser?.isAdmin && (
              <Button 
                variant="outline" 
                className="mt-2 w-full justify-start"
                onClick={() => window.location.href = '/admin'}
              >
                <Shield className="h-4 w-4 mr-2" />
                Админ-панель
              </Button>
            )}
            
            {/* Task Board Link */}
            <Button 
              variant="outline" 
              className="mt-2 w-full justify-start"
              onClick={() => window.location.href = '/task-board'}
            >
              <SquareKanban className="h-4 w-4 mr-2" />
              Доска задач
            </Button>
          </>
        )}
      </div>

      {/* User Profile Section */}
      {!isCollapsed && children && (
        <div className="p-4 border-b border-border flex-shrink-0">
          {children}
        </div>
      )}

      {/* Chats list */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-2">
            <div className="pb-2">
              {/* Direct Chats */}
              {directChats.length > 0 && (
                <>
                  <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Контакты
                  </div>
                  {directChats.map((user) => (
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
                                <Circle className="mr-1 h-1.5 w-1.5 fill-current" />
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
                </>
              )}

              {/* Group Chats */}
              {groupChats.length > 0 && (
                <>
                  <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                    Групповые чаты
                  </div>
                  {groupChats.map((group) => (
                    <div
                      key={group.id}
                      className={`mb-1 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                        selectedUser?.id === group.id 
                          ? 'bg-accent border border-border shadow-sm' 
                          : 'hover:bg-accent/50 border border-transparent'
                      }`}
                      onClick={() => onUserSelect(group)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="font-medium bg-primary text-primary-foreground">
                              <Users className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          {group.unreadCount > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full shadow-sm animate-pulse"
                            >
                              {group.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <p className="font-semibold text-foreground truncate">{group.name}</p>
                            {group.lastMessage && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                {formatTime(group.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className={`text-sm truncate ${group.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {group.lastMessage ? `${group.lastMessage.senderUsername}: ${getLastMessagePreview(group.lastMessage)}` : 'Нет сообщений'}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {group.members.length} {group.members.length === 1 ? 'участник' : group.members.length < 5 ? 'участника' : 'участников'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Collapsed view */}
      {isCollapsed && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="flex flex-col items-center py-4 space-y-6">
            <div className="flex flex-col items-center space-y-4">
            {[...directChats, ...groupChats].slice(0, 10).map((chat) => {
              const isGroup = (chat as GroupChat).isGroup;
              return (
                <div
                  key={chat.id}
                  className={`relative rounded-full p-1 cursor-pointer transition-all duration-200 ${
                    selectedUser?.id === chat.id 
                      ? 'bg-accent border-2 border-primary' 
                      : 'border-2 border-transparent hover:bg-accent'
                  }`}
                  onClick={() => onUserSelect(chat)}
                  title={isGroup ? (chat as GroupChat).name : (chat as ChatUser).username}
                >
                  <Avatar className="h-10 w-10">
                    {isGroup ? (
                      <AvatarFallback className="font-medium bg-primary text-primary-foreground text-xs">
                        <Users className="h-5 w-5" />
                      </AvatarFallback>
                    ) : (
                      (chat as ChatUser).avatar ? (
                        <AvatarImage src={(chat as ChatUser).avatar!} alt={(chat as ChatUser).username} />
                      ) : (
                        <AvatarFallback className="font-medium bg-muted text-muted-foreground text-xs">
                          {getUserInitials((chat as ChatUser).username)}
                        </AvatarFallback>
                      )
                    )}
                  </Avatar>
                  {chat.unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[8px] rounded-full shadow-sm animate-pulse"
                    >
                      {chat.unreadCount}
                    </Badge>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
