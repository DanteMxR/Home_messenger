// Empty state component when no user is selected
import React from 'react'
import { Users } from 'lucide-react'

export const EmptyState: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center">
        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Выберите пользователя
        </h3>
        <p className="text-sm text-muted-foreground">
          Выберите пользователя из списка, чтобы начать общение
        </p>
      </div>
    </div>
  )
}