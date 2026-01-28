'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { User } from '@/types';

interface BoardMembersDialogProps {
  boardId: string;
  boardCreatorId: string;
  currentUserRole: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BoardMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: User;
}

export default function BoardMembersDialog({
  boardId,
  boardCreatorId,
  currentUserRole,
  isOpen,
  onOpenChange
}: BoardMembersDialogProps) {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'admin'>('member');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      fetchUsers();
    }
  }, [isOpen, boardId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/boards/members?boardId=${boardId}`);
      const data = await response.json();
      
      if (response.ok) {
        setMembers(data.members || []);
      } else {
        console.error('Failed to fetch board members:', data.error);
      }
    } catch (error) {
      console.error('Error fetching board members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (response.ok) {
        setAllUsers(data.users || []);
      } else {
        console.error('Failed to fetch users:', data.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    setAddingUser(true);
    try {
      const response = await fetch('/api/boards/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          userId: selectedUserId,
          role: selectedRole
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        fetchMembers(); // Refresh members
        setSelectedUserId('');
      } else {
        console.error('Failed to add member:', result.error);
        alert(result.error);
      }
    } catch (error) {
      console.error('Error adding member:', error);
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого участника из доски?')) {
      return;
    }

    try {
      const response = await fetch(`/api/boards/members?boardId=${boardId}&userId=${userId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        fetchMembers(); // Refresh members
      } else {
        console.error('Failed to remove member:', result.error);
        alert(result.error);
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'member' | 'admin') => {
    try {
      const response = await fetch('/api/boards/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          userId,
          role: newRole
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        fetchMembers(); // Refresh members
      } else {
        console.error('Failed to update role:', result.error);
        alert(result.error);
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  // Filter users who are already members
  const availableUsers = allUsers.filter(user => 
    !members.some(member => member.userId === user.id) && user.id !== boardCreatorId
  );

  // Filter members based on search term
  const filteredMembers = members.filter(member => 
    member.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Участники доски</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Add Member Section */}
          {(currentUserRole === 'owner' || currentUserRole === 'admin') ? (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Добавить участника</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="md:col-span-2">
                  <Label htmlFor="user-select">Выберите пользователя</Label>
                  <select
                    id="user-select"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Выберите пользователя</option>
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="role-select">Роль</Label>
                  <select
                    id="role-select"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as 'member' | 'admin')}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="member">Участник</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleAddMember} 
                    disabled={!selectedUserId || addingUser}
                    className="w-full"
                  >
                    {addingUser ? 'Добавление...' : 'Добавить'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium mb-3">Участники доски</h3>
              <p className="text-gray-600 text-sm">
                Только владельцы и администраторы доски могут добавлять новых участников.
              </p>
            </div>
          )}
          
          {/* Members List */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Список участников</h3>
              <Input
                placeholder="Поиск участников..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
            
            {loading ? (
              <div className="text-center py-4">Загрузка участников...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-4 text-gray-500">Нет участников</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredMembers.map(member => (
                  <div 
                    key={member.id} 
                    className="flex justify-between items-center p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="font-medium">{member.user.username}</div>
                      <Badge 
                        variant={
                          member.role === 'owner' ? 'default' : 
                          member.role === 'admin' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {member.role === 'owner' ? 'Владелец' : 
                         member.role === 'admin' ? 'Админ' : 'Участник'}
                      </Badge>
                      {member.userId === boardCreatorId && (
                        <span className="text-xs text-gray-500">(создатель)</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {currentUserRole === 'owner' && member.userId !== boardCreatorId && member.role !== 'owner' && (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.userId, e.target.value as 'member' | 'admin')}
                            className="p-1 border border-gray-300 rounded text-sm"
                            disabled={member.role === 'owner'}
                          >
                            <option value="member">Участник</option>
                            <option value="admin">Админ</option>
                          </select>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveMember(member.userId)}
                            className="h-8 px-2"
                          >
                            Удалить
                          </Button>
                        </>
                      )}
                      
                      {currentUserRole === 'admin' && member.userId !== boardCreatorId && member.role !== 'owner' && member.role !== 'admin' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveMember(member.userId)}
                          className="h-8 px-2"
                        >
                          Удалить
                        </Button>
                      )}
                      
                      {(!currentUserRole || (currentUserRole !== 'owner' && currentUserRole !== 'admin')) && (
                        <span className="text-xs text-gray-500 italic">
                          Только администраторы могут управлять участниками
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}