// Settings dialog component
import React, { useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Trash2 } from 'lucide-react'
import { User, Settings } from '@/types'
import { getUserInitials } from '@/utils'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  settings: Settings
  onSettingsChange: (key: keyof Settings, value: any) => void
  onSave: () => Promise<void>
  onAvatarUpload: (file: File) => Promise<void>
  onAvatarRemove: () => Promise<void>
  isUploadingAvatar: boolean
  avatarPreview: string | null
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
  user,
  settings,
  onSettingsChange,
  onSave,
  onAvatarUpload,
  onAvatarRemove,
  isUploadingAvatar,
  avatarPreview
}) => {
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onAvatarUpload(file).catch(error => {
        alert('Ошибка загрузки аватара: ' + error.message)
      })
      // Reset file input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    }
  }

  const handleSave = async () => {
    try {
      await onSave()
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Ошибка сохранения настроек')
    }
  }

  const handleAvatarRemove = async () => {
    try {
      await onAvatarRemove()
    } catch (error) {
      console.error('Error removing avatar:', error)
      alert('Ошибка удаления аватара')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Настройки аккаунта</DialogTitle>
          <DialogDescription>
            Измените настройки своего аккаунта и уведомлений.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt="Avatar preview" />
                ) : user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.username} />
                ) : (
                  <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                    {getUserInitials(user.username)}
                  </AvatarFallback>
                )}
              </Avatar>
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarSelect}
                accept="image/*"
                className="hidden"
                disabled={isUploadingAvatar}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Загрузить
              </Button>
              {user.avatar && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleAvatarRemove}
                  disabled={isUploadingAvatar}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Максимальный размер: 5MB<br/>
              Поддерживаемые форматы: JPG, PNG, GIF
            </p>
          </div>
          
          <div className="border-t pt-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Имя пользователя
              </Label>
              <Input
                id="username"
                value={settings.username}
                onChange={(e) => onSettingsChange('username', e.target.value)}
                className="col-span-3"
                placeholder="Введите имя пользователя"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="text-sm font-medium">
              Уведомления
            </Label>
            <Switch
              id="notifications"
              checked={settings.notifications}
              onCheckedChange={(checked) => onSettingsChange('notifications', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="darkMode" className="text-sm font-medium">
              Темная тема
            </Label>
            <Switch
              id="darkMode"
              checked={settings.darkMode}
              onCheckedChange={(checked) => onSettingsChange('darkMode', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="soundEnabled" className="text-sm font-medium">
              Звуковые уведомления
            </Label>
            <Switch
              id="soundEnabled"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => onSettingsChange('soundEnabled', checked)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            Сохранить изменения
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}