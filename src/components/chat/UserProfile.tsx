// User profile component for the sidebar
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Settings, LogOut } from 'lucide-react'
import { User } from '@/types'
import { getUserInitials } from '@/utils'

interface UserProfileProps {
  user: User
  onSettingsClick: () => void
  onLogout: () => void
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onSettingsClick,
  onLogout
}) => {
  return (
    <div className="flex items-center space-x-3 mb-4 flex-shrink-0 bg-muted p-3 rounded-xl border border-border">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center space-x-3 w-full hover:bg-accent rounded-lg p-2 transition-colors">
            <Avatar className="h-12 w-12">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.username} />
              ) : (
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {getUserInitials(user.username)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 text-left">
              <p className="font-semibold text-foreground">{user.username}</p>
              <p className="text-sm text-muted-foreground">Пользователь</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSettingsClick}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Настройки</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Выйти</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}