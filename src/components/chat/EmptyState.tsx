// Empty state component when no user is selected
import React from 'react'
import { Users, Menu } from 'lucide-react'

export const EmptyState: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center p-4">
        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Выберите пользователя
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Выберите пользователя из списка, чтобы начать общение
        </p>
        <div className="md:hidden">
          <div className="flex items-center justify-center text-muted-foreground text-sm">
            <Menu className="h-4 w-4 mr-2" />
            <span>Нажмите на меню, чтобы открыть список контактов</span>
          </div>
        </div>
      </div>
    </div>
  )
}