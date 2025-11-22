// Chat header component showing selected user info and actions
import React from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Circle, Trash2, ArrowLeft } from 'lucide-react'
import { User } from '@/types'
import { formatLastSeen, getUserInitials } from '@/utils'

interface ChatHeaderProps {
  selectedUser: User
  onClearMessages: () => void
  onBack?: () => void
  isMobile?: boolean
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedUser,
  onClearMessages,
  onBack,
  isMobile = false
}) => {
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
              {selectedUser.avatar ? (
                <AvatarImage src={selectedUser.avatar} alt={selectedUser.username} />
              ) : (
                <AvatarFallback>{getUserInitials(selectedUser.username)}</AvatarFallback>
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
          onClick={onClearMessages}
          className="flex items-center"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Очистить
        </Button>
      </div>
    </div>
  )
}