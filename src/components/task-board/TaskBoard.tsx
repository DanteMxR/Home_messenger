'use client';

import React, { useState, useEffect } from 'react';

// Add CSS for drag and drop visual feedback
const style = `
.drag-over {
  background-color: #f3f4f6 !important;
  border: 2px dashed #6b7280 !important;
  box-shadow: inset 0 0 0 2px rgba(107, 114, 128, 0.5);
}
`;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Task, Board, CreateTaskData, UpdateTaskData, User, TaskWithRelations } from '@/types';

interface TaskBoardProps {
  board: Board;
}

// Status columns configuration
const STATUS_COLUMNS = [
  { id: 'todo', title: 'К выполнению', color: 'border border-gray-300' },
  { id: 'in_progress', title: 'В работе', color: 'border border-gray-300' },
  { id: 'review', title: 'На проверке', color: 'border border-gray-300' },
  { id: 'done', title: 'Выполнено', color: 'border border-gray-300' },
];

// Priority options
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Низкий'},
  { value: 'medium', label: 'Средний'},
  { value: 'high', label: 'Высокий'  },
  { value: 'urgent', label: 'Срочный' },
];

export default function TaskBoard({ board }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<TaskWithRelations | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [newTask, setNewTask] = useState<Omit<CreateTaskData, 'boardId'>>({ 
    title: '', 
    description: '', 
    assigneeId: undefined,
    priority: 'medium',
    dueDate: undefined
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedFilesPreview, setAttachedFilesPreview] = useState<{file: File, preview: string}[]>([]);

  const fetchTaskDetails = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      const result = await response.json();
      
      if (response.ok && result.task) {
        setViewingTask(result.task);
      } else {
        console.error('Failed to fetch task details:', result.error);
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
    }
  };

  // Load tasks for the board
  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [board.id]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
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
    } finally {
      setLoadingUsers(false);
    }
  };

  // Initialize selected assignees when editing a task
  useEffect(() => {
    if (editingTask) {
      // Combine assigneeId and assigneeIds to initialize the selection
      const assigneeIdsSet = new Set(editingTask.assigneeIds || []);
      if (editingTask.assigneeId) {
        assigneeIdsSet.add(editingTask.assigneeId);
      }
      setSelectedAssignees(Array.from(assigneeIdsSet));
    }
  }, [editingTask]);

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSaveTaskWithAssignees = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTask) return;
    
    // Prepare the updated task with assigneeIds
    const updatedTaskData = {
      id: editingTask.id,
      title: editingTask.title,
      description: editingTask.description,
      status: editingTask.status,
      priority: editingTask.priority,
      assigneeId: selectedAssignees[0] || null,
      dueDate: editingTask.dueDate,
      assigneeIds: selectedAssignees,
    };
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTaskData),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // If there are attached files, upload them to the task
        if (attachedFiles.length > 0) {
          await uploadTaskFiles(editingTask.id);
        }
        
        setEditingTask(null);
        setSelectedAssignees([]); // Reset selected assignees
        setAttachedFiles([]); // Clear attached files
        setAttachedFilesPreview([]); // Clear file previews
        fetchTasks(); // Refresh tasks
      } else {
        console.error('Failed to update task:', result.error);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };
  
  const handleCreateTaskWithFiles = async (e: React.FormEvent) => {
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
        // If there are attached files, upload them to the task
        if (attachedFiles.length > 0) {
          await uploadTaskFiles(result.task.id);
        }
        
        setNewTask({ title: '', description: '', assigneeId: undefined, priority: 'medium', dueDate: undefined });
        setShowTaskModal(false);
        setAttachedFiles([]); // Clear attached files
        setAttachedFilesPreview([]); // Clear file previews
        fetchTasks(); // Refresh tasks
      } else {
        console.error('Failed to create task:', result.error);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };
  
  const handleUpdateTaskWithFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTask) return;
    
    // Prepare the updated task data without file objects and only with valid fields according to API schema
    const updatedTaskData = {
      id: editingTask.id,
      title: editingTask.title,
      description: editingTask.description,
      status: editingTask.status,
      priority: editingTask.priority,
      assigneeId: selectedAssignees[0] || null,
      dueDate: editingTask.dueDate,
    };
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTaskData),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // If there are attached files, upload them to the task
        if (attachedFiles.length > 0) {
          await uploadTaskFiles(editingTask.id);
        }
        
        setEditingTask(null);
        setSelectedAssignees([]); // Reset selected assignees
        setAttachedFiles([]); // Clear attached files
        setAttachedFilesPreview([]); // Clear file previews
        fetchTasks(); // Refresh tasks
      } else {
        console.error('Failed to update task:', result.error);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };
  
  const uploadTaskFiles = async (taskId: string) => {
    // We need to upload each file individually since the upload API expects single files
    for (const file of attachedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      // Add empty content and task ID to link the file to the task
      formData.append('content', ''); // Empty content for file-only messages
      formData.append('taskId', taskId); // Reference to the task
      
      try {
        const response = await fetch(`/api/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to upload file to task:', errorData);
        }
      } catch (error) {
        console.error('Error uploading file to task:', error);
      }
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
      
      // Create previews for images
      const newPreviews = newFiles.map(file => ({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
      }));
      
      setAttachedFilesPreview(prev => [...prev, ...newPreviews]);
    }
  };
  
  const removeAttachedFile = (fileName: string) => {
    setAttachedFiles(prev => prev.filter(f => f.name !== fileName));
    setAttachedFilesPreview(prev => prev.filter(f => f.file.name !== fileName));
  };

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
        body: JSON.stringify({
          id: editingTask.id,
          title: editingTask.title,
          description: editingTask.description,
          status: editingTask.status,
          priority: editingTask.priority,
          assigneeId: editingTask.assigneeId,
          dueDate: editingTask.dueDate
        }),
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
    const target = e.target as HTMLElement;
    // Add visual feedback to the drop zone
    const dropZone = target.closest('[onDrop]');
    if (dropZone && !dropZone.classList.contains('drag-over')) {
      // Remove drag-over class from all columns
      document.querySelectorAll('[onDrop]').forEach(col => {
        col.classList.remove('drag-over');
      });
      // Add drag-over class to current column
      dropZone.classList.add('drag-over');
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    // Remove drag-over class from all columns
    document.querySelectorAll('[onDrop]').forEach(col => {
      col.classList.remove('drag-over');
    });
    
    const taskId = e.dataTransfer.getData('taskId');
    
    // Find the task and update its status
    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (taskToUpdate) {
      const updatePayload = {
        id: taskToUpdate.id,
        status: targetStatus
      };
      
      try {
        const response = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
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

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        fetchTasks(); // Refresh tasks
      } else {
        const errorResult = await response.json();
        console.error('Failed to delete task:', errorResult.error);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
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
      <div className="flex justify-end mb-6">
        <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-gray-400 text-gray-800 hover:bg-gray-100">Создать задачу</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Создать новую задачу</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTaskWithFiles} className="space-y-4">
              <div>
                <Label htmlFor="title">Заголовок</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="border border-gray-300"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Описание</Label>
                <textarea
                  id="description"
                  value={newTask.description || ''}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md min-h-[100px] "
                />
              </div>
              <div>
                <Label htmlFor="assignee">Исполнитель</Label>
                <select
                  id="assignee"
                  value={newTask.assigneeId || ''}
                  onChange={(e) => setNewTask({...newTask, assigneeId: e.target.value || undefined})}
                  className="w-full p-2 border border-gray-300 rounded-md "
                >
                  <option value="">Нет исполнителя</option>
                  {allUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="priority">Приоритет</Label>
                <select
                  id="priority"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({...newTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'})}
                  className="w-full p-2 border border-gray-300 rounded-md "
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
                  className="border border-gray-300"
                />
              </div>
              <div>
                <Label>Прикрепленные файлы</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-gray-100 file:text-gray-700
                      file:hover:bg-gray-200"/>
                </div>
                {attachedFilesPreview.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {attachedFilesPreview.map((fileInfo, index) => (
                      <div key={index} className="relative border rounded p-2">
                        {fileInfo.preview ? (
                          <img 
                            src={fileInfo.preview} 
                            alt={fileInfo.file.name}
                            className="w-full h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-16">
                            <span className="text-xs text-gray-500 truncate block text-center">{fileInfo.file.name}</span>
                          </div>
                        )}
                        <button 
                          type="button" 
                          onClick={() => removeAttachedFile(fileInfo.file.name)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full bg-gray-800 hover:bg-gray-900 text-white border border-gray-700">Создать задачу</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(column => (
          <div 
            key={column.id}
            className={`${column.color} rounded-lg p-4 min-h-[500px] max-h-[600px] overflow-y-auto border border-gray-300 shadow-sm transition-colors duration-150`}
            onDrop={(e) => handleDrop(e, column.id)}
            onDragOver={handleDragOver}
          >
            <h3 className="font-semibold mb-3 text-center text-gray-900 text-sm">{column.title}</h3>
            <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
              {tasks
                .filter(task => task.status === column.id)
                .map(task => (
                  <Card 
                    key={task.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragOver={handleDragOver}
                    className="cursor-move transition-all duration-150 border border-gray-300 shadow-sm hover:shadow-md mb-2 opacity-100"
                    onDragEnd={() => document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))}
                    onClick={() => fetchTaskDetails(task.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          {getPriorityLabel(task.priority)}
                        </Badge>
                        {task.dueDate && (
                          <span className="text-xs text-gray-600">
                            {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-700 truncate">{task.description}</p>
                      )}
                      <div className="mt-2 flex space-x-2">
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            
                            try {
                             
                              if (task.chatId) {
                                
                                window.location.href = `/chat?taskId=${task.id}`;
                              } else {
                                
                                const response = await fetch(`/api/tasks/${task.id}/chat`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                });
                                
                                if (response.ok) {
                                  const result = await response.json();
                                  
                                  window.location.href = `/chat?taskId=${task.id}`;
                                } else {
                                  console.error('Failed to create task chat:', await response.json());
                                }
                              }
                            } catch (error) {
                              console.error('Error handling task chat:', error);
                            }
                          }}
                          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-2 rounded border border-gray-400 mr-1"
                        >
                          Чат задачи
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleDeleteTask(task.id);
                          }}
                          className="text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded"
                        >
                          Удалить
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

      {/* View Task Modal */}
      {viewingTask && (
        <Dialog open={!!viewingTask} onOpenChange={() => setViewingTask(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{viewingTask.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Описание</Label>
                <p className="text-gray-700 p-2 border border-gray-300 rounded-md min-h-[100px] bg-gray-50">
                  {viewingTask.description || 'Нет описания'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Статус</Label>
                  <p className="text-gray-700 p-2 border border-gray-300 rounded-md bg-gray-50">
                    {STATUS_COLUMNS.find(s => s.id === viewingTask.status)?.title || viewingTask.status}
                  </p>
                </div>
                <div>
                  <Label>Приоритет</Label>
                  <p className={`p-2 border border-gray-300 rounded-md bg-gray-50 ${getPriorityColor(viewingTask.priority)}`}>
                    {getPriorityLabel(viewingTask.priority)}
                  </p>
                </div>
              </div>
              <div>
                <Label>Участники</Label>
                <div className="border border-gray-300 rounded-md p-2 bg-gray-50 max-h-32 overflow-y-auto">
                  {viewingTask.assigneeIds && viewingTask.assigneeIds.length > 0 ? (
                    viewingTask.assigneeIds.map(assigneeId => {
                      const user = allUsers.find(u => u.id === assigneeId);
                      return user ? (
                        <div key={assigneeId} className="py-1 border-b border-gray-200 last:border-b-0">
                          {user.username}
                        </div>
                      ) : null;
                    }).filter(Boolean)
                  ) : viewingTask.assigneeId ? (
                    <div className="py-1">
                      {allUsers.find(u => u.id === viewingTask.assigneeId)?.username || 'Неизвестный пользователь'}
                    </div>
                  ) : (
                    <div className="py-1 text-gray-500">Нет участников</div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Создано</Label>
                  <p className="text-gray-700 p-2 border border-gray-300 rounded-md bg-gray-50">
                    {new Date(viewingTask.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div>
                  <Label>Срок выполнения</Label>
                  <p className="text-gray-700 p-2 border border-gray-300 rounded-md bg-gray-50">
                    {viewingTask.dueDate ? new Date(viewingTask.dueDate).toLocaleDateString('ru-RU') : 'Не указан'}
                  </p>
                </div>
              </div>
              <div>
                <Label>Прикрепленные файлы</Label>
                <div className="border border-gray-300 rounded-md p-2 bg-gray-50 max-h-40 overflow-y-auto">
                  {viewingTask.messages && viewingTask.messages.length > 0 ? (
                    viewingTask.messages
                      .filter(msg => msg.fileUrl) // Only show messages with file attachments
                      .map((msg, index) => (
                        <div key={index} className="py-1 border-b border-gray-200 last:border-b-0">
                          <a 
                            href={msg.fileUrl || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-sm"
                          >
                            {msg.fileName || 'Файл'}
                          </a>
                        </div>
                      ))
                  ) : (
                    <div className="py-1 text-gray-500 text-sm">Нет прикрепленных файлов</div>
                  )}
                </div>
              </div>
              <div className="flex space-x-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 border-gray-400 text-gray-800 hover:bg-gray-100"
                  onClick={() => {
                    setViewingTask(null);
                    setEditingTask(viewingTask); // Switch to edit mode
                  }}
                >
                  Редактировать
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 border-gray-400 text-gray-800 hover:bg-gray-100"
                  onClick={() => setViewingTask(null)}
                >
                  Закрыть
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Редактировать задачу</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateTaskWithFiles} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Заголовок</Label>
                <Input
                  id="edit-title"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                  className="border border-gray-300"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Описание</Label>
                <textarea
                  id="edit-description"
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md min-h-[100px] "
                />
              </div>
              <div>
                <Label>Участники (исполнители)</Label>
                <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                  {allUsers.map(user => (
                    <div key={user.id} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id={`assignee-${user.id}`}
                        checked={selectedAssignees.includes(user.id)}
                        onChange={() => toggleAssignee(user.id)}
                        className="mr-2"
                      />
                      <label htmlFor={`assignee-${user.id}`} className="text-gray-700">
                        {user.username}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="edit-status">Статус</Label>
                <select
                  id="edit-status"
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({...editingTask, status: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md "
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
                  className="w-full p-2 border border-gray-300 rounded-md "
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
                  className="border border-gray-300"
                />
              </div>
              <div>
                <Label>Прикрепленные файлы</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-gray-100 file:text-gray-700
                      file:hover:bg-gray-200"/>
                </div>
                {attachedFilesPreview.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {attachedFilesPreview.map((fileInfo, index) => (
                      <div key={index} className="relative border rounded p-2">
                        {fileInfo.preview ? (
                          <img 
                            src={fileInfo.preview} 
                            alt={fileInfo.file.name}
                            className="w-full h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-16">
                            <span className="text-xs text-gray-500 truncate block text-center">{fileInfo.file.name}</span>
                          </div>
                        )}
                        <button 
                          type="button" 
                          onClick={() => removeAttachedFile(fileInfo.file.name)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <Button type="submit" className="flex-1 bg-gray-800 hover:bg-gray-900 text-white border border-gray-700">Сохранить</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 border-gray-400 text-gray-800 hover:bg-gray-100"
                  onClick={() => {
                    setEditingTask(null);
                    setAttachedFiles([]); // Clear attached files when cancelling
                    setAttachedFilesPreview([]); // Clear file previews
                  }}
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

if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = style;
  document.head.appendChild(styleElement);
}