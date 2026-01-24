import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User as UserType } from '@/types';
import { Search, UserRoundPlus } from 'lucide-react';

interface GroupChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserType[];
  onCreateGroup: (name: string, userIds: string[]) => Promise<void>;
  isLoading: boolean;
}

export const GroupChatDialog: React.FC<GroupChatDialogProps> = ({
  open,
  onOpenChange,
  users,
  onCreateGroup,
  isLoading
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setGroupName('');
      setSelectedUsers([]);
      setSearchTerm('');
    }
  }, [open]);

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      alert('Пожалуйста, введите название группы');
      return;
    }

    if (selectedUsers.length === 0) {
      alert('Пожалуйста, выберите хотя бы одного пользователя');
      return;
    }

    await onCreateGroup(groupName, [...selectedUsers]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать групповой чат</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="groupName" className="block text-sm font-medium mb-1">
                Название группы
              </label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Введите название группы"
                className="w-full"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Участники
                </label>
                <div className="relative flex-1 max-w-xs ml-4">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Поиск пользователей..."
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="max-h-60 overflow-y-auto border rounded-md">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <div 
                      key={user.id} 
                      className={`flex items-center p-3 hover:bg-accent cursor-pointer ${
                        selectedUsers.includes(user.id) ? 'bg-accent' : ''
                      }`}
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <div className="w-5 h-5 border rounded mr-3 flex items-center justify-center">
                        {selectedUsers.includes(user.id) && (
                          <div className="w-3 h-3 bg-primary rounded-sm"></div>
                        )}
                      </div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-2">
                          <UserRoundPlus className="h-4 w-4" />
                        </div>
                        <span>{user.username}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-muted-foreground">
                    Пользователи не найдены
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button 
              type="submit" 
              disabled={isLoading || !groupName.trim() || selectedUsers.length === 0}
            >
              {isLoading ? 'Создание...' : 'Создать группу'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};