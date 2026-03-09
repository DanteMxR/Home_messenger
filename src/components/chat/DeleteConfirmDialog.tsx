import React from 'react'
import { Button } from '@/components/ui/button'

interface DeleteConfirmDialogProps {
  show: boolean
  chatName: string
  isGroup: boolean
  isOwner: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  show,
  chatName,
  isGroup,
  isOwner,
  onConfirm,
  onCancel
}) => {
  if (!show) return null

  let title: string
  let description: string
  let confirmText: string

  if (isGroup && isOwner) {
    title = 'Удалить групповой чат'
    description = `Вы уверены, что хотите удалить чат "${chatName}" для всех участников? Все сообщения будут удалены. Это действие нельзя отменить.`
    confirmText = 'Удалить для всех'
  } else if (isGroup) {
    title = 'Покинуть групповой чат'
    description = `Вы уверены, что хотите покинуть чат "${chatName}"? Вы больше не сможете видеть сообщения этого чата.`
    confirmText = 'Покинуть'
  } else {
    title = 'Удалить чат'
    description = `Вы уверены, что хотите удалить всю историю сообщений с ${chatName}? Это действие нельзя отменить.`
    confirmText = 'Удалить'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4 text-foreground">{title}</h3>
        <p className="text-muted-foreground mb-6">{description}</p>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
