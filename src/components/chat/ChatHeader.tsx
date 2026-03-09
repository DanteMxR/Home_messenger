// Chat header component showing selected user info and actions
import React from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Circle, Trash2, ArrowLeft, Users, LogOut } from 'lucide-react'
import { User, GroupChat } from '@/types'
import { formatLastSeen, getUserInitials } from '@/utils'

interface ChatHeaderProps {
  selectedUser: User | GroupChat
  onClearMessages: () => void
  onDeleteChat: () => void
  onBack?: () => void
  isMobile?: boolean
  isGroupOwner?: boolean
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedUser,
  onClearMessages,
  onDeleteChat,
  onBack,
  isMobile = false,
  isGroupOwner = false
}) => {
  // Check if it's a group chat
  const isGroupChat = 'isGroup' in selectedUser && selectedUser.isGroup;

  return (
    <div className="bg-card border-b border-border p-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isMobile && onBack && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="relative">
            <Avatar>
              {isGroupChat ? (
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Users className="h-6 w-6" />
                </AvatarFallback>
              ) : (
                selectedUser.avatar ? (
                  <AvatarImage src={selectedUser.avatar} alt={selectedUser.username} />
                ) : (
                  <AvatarFallback>{getUserInitials(selectedUser.username)}</AvatarFallback>
                )
              )}
            </Avatar>
            {!isGroupChat && (
              <Circle 
                className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                  selectedUser.isOnline ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'
                }`} 
              />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{isGroupChat ? selectedUser.name : selectedUser.username}</h2>
            {isGroupChat ? (
              <p className="text-sm text-muted-foreground">
                {selectedUser.members.length} {selectedUser.members.length === 1 ? 'участник' : selectedUser.members.length < 5 ? 'участника' : 'участников'}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedUser.isOnline ? 'В сети' : `Был(а) в сети ${formatLastSeen(selectedUser.lastSeen || new Date())}`}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearMessages}
            className="flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Очистить
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteChat}
            className="flex items-center"
          >
            {isGroupChat && !isGroupOwner ? (
              <>
                <LogOut className="h-4 w-4 mr-1" />
                Покинуть
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1" />
                Удалить
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}