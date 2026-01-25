'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Task, Board, CreateTaskData, UpdateTaskData } from '@/types';

interface TaskBoardProps {
  board: Board;
}

// Status columns configuration
const STATUS_COLUMNS = [
  { id: 'todo', title: 'К выполнению', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'В работе', color: 'bg-blue-100' },
  { id: 'review', title: 'На проверке', color: 'bg-yellow-100' },
  { id: 'done', title: 'Выполнено', color: 'bg-green-100' },
];

// Priority options
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Низкий', color: 'text-gray-500' },
  { value: 'medium', label: 'Средний', color: 'text-blue-500' },
  { value: 'high', label: 'Высокий', color: 'text-orange-500' },
  { value: 'urgent', label: 'Срочный', color: 'text-red-500' },
];

export default function TaskBoard({ board }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState<Omit<CreateTaskData, 'boardId'>>({ 
    title: '', 
    description: '', 
    assigneeId: undefined,
    priority: 'medium',
    dueDate: undefined
  });

  // Load tasks for the board
  useEffect(() => {
    fetchTasks();
  }, [board.id]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks?boardId=${board.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setTasks(data.tasks || []);
      } else {
        console.error('Failed to fetch tasks:', data.error);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          boardId: board.id
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setNewTask({ title: '', description: '', assigneeId: undefined, priority: 'medium', dueDate: undefined });
        setShowTaskModal(false);
        fetchTasks(); // Refresh tasks
      } else {
        console.error('Failed to create task:', result.error);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTask) return;
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTask),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setEditingTask(null);
        fetchTasks(); // Refresh tasks
      } else {
        console.error('Failed to update task:', result.error);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('sourceColumn', e.currentTarget.parentElement?.id || '');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    // Find the task and update its status
    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (taskToUpdate) {
      const updatedTask: UpdateTaskData = {
        ...taskToUpdate,
        status: targetStatus
      };
      
      try {
        const response = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTask),
        });
        
        const result = await response.json();
        
        if (response.ok) {
          fetchTasks(); // Refresh tasks
        } else {
          console.error('Failed to update task status:', result.error);
        }
      } catch (error) {
        console.error('Error updating task status:', error);
      }
    }
  };

  const getPriorityLabel = (priority: string) => {
    const option = PRIORITY_OPTIONS.find(opt => opt.value === priority);
    return option ? option.label : priority;
  };

  const getPriorityColor = (priority: string) => {
    const option = PRIORITY_OPTIONS.find(opt => opt.value === priority);
    return option ? option.color : 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{board.title}</h2>
        <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
          <DialogTrigger asChild>
            <Button>Создать задачу</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Создать новую задачу</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <Label htmlFor="title">Заголовок</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Описание</Label>
                <textarea
                  id="description"
                  value={newTask.description || ''}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="w-full p-2 border rounded-md min-h-[100px]"
                />
              </div>
              <div>
                <Label htmlFor="priority">Приоритет</Label>
                <select
                  id="priority"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({...newTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'})}
                  className="w-full p-2 border rounded-md"
                >
                  {PRIORITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="dueDate">Срок выполнения</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTask.dueDate ? new Date(newTask.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setNewTask({...newTask, dueDate: e.target.value ? new Date(e.target.value) : undefined})}
                />
              </div>
              <Button type="submit" className="w-full">Создать задачу</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(column => (
          <div 
            key={column.id}
            className={`${column.color} rounded-lg p-4 min-h-[500px]`}
            onDrop={(e) => handleDrop(e, column.id)}
            onDragOver={handleDragOver}
          >
            <h3 className="font-semibold mb-4 text-center">{column.title}</h3>
            <div className="space-y-3">
              {tasks
                .filter(task => task.status === column.id)
                .map(task => (
                  <Card 
                    key={task.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragOver={handleDragOver}
                    className="cursor-move hover:shadow-md transition-shadow"
                    onClick={() => setEditingTask(task)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{task.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          {getPriorityLabel(task.priority)}
                        </Badge>
                        {task.dueDate && (
                          <span className="text-xs text-gray-500">
                            {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 truncate">{task.description}</p>
                      )}
                      <div className="mt-2 flex space-x-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Open chat for this task
                            window.location.href = `/chat?taskId=${task.id}`;
                          }}
                          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-2 rounded"
                        >
                          Чат задачи
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              }
            </div>
          </div>
        ))}
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Редактировать задачу</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Заголовок</Label>
                <Input
                  id="edit-title"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Описание</Label>
                <textarea
                  id="edit-description"
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                  className="w-full p-2 border rounded-md min-h-[100px]"
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Статус</Label>
                <select
                  id="edit-status"
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({...editingTask, status: e.target.value})}
                  className="w-full p-2 border rounded-md"
                >
                  {STATUS_COLUMNS.map(status => (
                    <option key={status.id} value={status.id}>
                      {status.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-priority">Приоритет</Label>
                <select
                  id="edit-priority"
                  value={editingTask.priority}
                  onChange={(e) => setEditingTask({...editingTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'})}
                  className="w-full p-2 border rounded-md"
                >
                  {PRIORITY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-dueDate">Срок выполнения</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingTask({
                    ...editingTask, 
                    dueDate: e.target.value ? new Date(e.target.value) : undefined
                  })}
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">Сохранить</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setEditingTask(null)}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}