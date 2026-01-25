'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Board, Task } from '@/types';
import KanbanBoard from '@/components/task-board/TaskBoard';

export default function TaskBoardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  // Load boards
  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/boards');
      const data = await response.json();
      
      if (response.ok) {
        setBoards(data.boards || []);
      } else {
        console.error('Failed to fetch boards:', data.error);
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newBoardTitle }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setNewBoardTitle('');
        fetchBoards(); // Refresh boards
      } else {
        console.error('Failed to create board:', result.error);
      }
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Доска задач</h1>
      
      {!selectedBoard ? (
        <div>
          <form onSubmit={handleCreateBoard} className="mb-6 flex gap-2">
            <Input
              placeholder="Название доски"
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Создать доску</Button>
          </form>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map(board => (
              <Card 
                key={board.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedBoard(board)}
              >
                <CardHeader>
                  <CardTitle>{board.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Создана: {new Date(board.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {boards.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Нет доступных досок задач</p>
              <p className="text-sm mt-2">Создайте первую доску задач, чтобы начать</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{selectedBoard.title}</h2>
            <Button variant="outline" onClick={() => setSelectedBoard(null)}>
              Назад к списку досок
            </Button>
          </div>
          
          <KanbanBoard board={selectedBoard} />
        </div>
      )}
    </div>
  );
}