// Confirmation dialog for clearing messages
import React from 'react'
import { Button } from '@/components/ui/button'

interface ClearConfirmDialogProps {
  show: boolean
  username: string
  onConfirm: () => void
  onCancel: () => void
}

export const ClearConfirmDialog: React.FC<ClearConfirmDialogProps> = ({
  show,
  username,
  onConfirm,
  onCancel
}) => {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Очистить историю сообщений</h3>
        <p className="text-muted-foreground mb-6">
          Вы уверены, что хотите очистить всю историю сообщений с пользователем {username}?
          Это действие нельзя отменить.
        </p>
        <div className="flex justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={onCancel}
          >
            Отмена
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
          >
            Очистить
          </Button>
        </div>
      </div>
    </div>
  )
}