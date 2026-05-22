'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Task, Board, CreateTaskData, User, TaskWithRelations } from '@/types';
import BoardMembersDialog from '@/components/chat/dialogs/BoardMembersDialog';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface TaskBoardProps {
  board: Board;
}

const STATUS_COLUMNS = [
  {
    id: 'todo',
    title: 'К выполнению',
    columnClass: 'border-slate-500/25 bg-slate-500/5',
    headerClass: 'bg-slate-500/10',
    dotClass: 'bg-slate-400',
  },
  {
    id: 'in_progress',
    title: 'В работе',
    columnClass: 'border-sky-500/25 bg-sky-500/5',
    headerClass: 'bg-sky-500/10',
    dotClass: 'bg-sky-400',
  },
  {
    id: 'review',
    title: 'На проверке',
    columnClass: 'border-amber-500/25 bg-amber-500/5',
    headerClass: 'bg-amber-500/10',
    dotClass: 'bg-amber-400',
  },
  {
    id: 'done',
    title: 'Выполнено',
    columnClass: 'border-emerald-500/25 bg-emerald-500/5',
    headerClass: 'bg-emerald-500/10',
    dotClass: 'bg-emerald-400',
  },
] as const;

const PRIORITY_OPTIONS = [
  {
    value: 'low',
    label: 'Низкий',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  {
    value: 'medium',
    label: 'Средний',
    badgeClass: 'border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
  {
    value: 'high',
    label: 'Высокий',
    badgeClass: 'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300',
  },
  {
    value: 'urgent',
    label: 'Срочный',
    badgeClass: 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300',
  },
] as const;

export default function TaskBoard({ board }: TaskBoardProps) {
  const { user: currentUser } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<TaskWithRelations | null>(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedFilesPreview, setAttachedFilesPreview] = useState<Array<{ file: File; preview: string }>>([]);

  const [newTask, setNewTask] = useState<Omit<CreateTaskData, 'boardId'>>({
    title: '',
    description: '',
    assigneeId: undefined,
    priority: 'medium',
    dueDate: undefined,
  });

  useEffect(() => {
    if (!editingTask) return;

    const assigneeIdsSet = new Set(editingTask.assigneeIds || []);
    if (editingTask.assigneeId) {
      assigneeIdsSet.add(editingTask.assigneeId);
    }
    setSelectedAssignees(Array.from(assigneeIdsSet));
  }, [editingTask]);

  useEffect(() => {
    return () => {
      attachedFilesPreview.forEach((item) => {
        if (item.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [attachedFilesPreview]);

  const fetchTaskDetails = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      const result = await response.json();

      if (response.ok && result.task) {
        const task = result.task;
        const assigneeIds = task.assignees?.map((a: { userId: string }) => a.userId) ?? (task.assigneeId ? [task.assigneeId] : []);
        setViewingTask({ ...task, assigneeIds });
      } else {
        console.error('Failed to fetch task details:', result.error);
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
    }
  };

  const fetchUsers = useCallback(async () => {
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
  }, []);

  const fetchCurrentUserRole = useCallback(async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/boards/members?boardId=${board.id}`);
      const data = await response.json();

      if (response.ok) {
        const currentUserMember = data.members.find((member: { userId: string }) => member.userId === currentUser.id);

        if (currentUserMember) {
          setCurrentUserRole(currentUserMember.role);
          return;
        }

        if (currentUser.id === board.creatorId) {
          setCurrentUserRole('owner');
          return;
        }

        setCurrentUserRole('');
      } else {
        console.error('Failed to fetch board members:', data.error);
      }
    } catch (error) {
      console.error('Error fetching current user role:', error);
    }
  }, [board.creatorId, board.id, currentUser]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks?boardId=${board.id}`);
      const data = await response.json();

      if (response.ok) {
        const mapped = (data.tasks || []).map((t: TaskWithRelations) => ({
          ...t,
          assigneeIds: t.assignees?.map((a) => a.userId) ?? (t.assigneeId ? [t.assigneeId] : []),
        }));
        setTasks(mapped);
      } else {
        console.error('Failed to fetch tasks:', data.error);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [board.id]);

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    fetchCurrentUserRole();
  }, [fetchCurrentUserRole, fetchTasks, fetchUsers]);

  const resetFileState = () => {
    attachedFilesPreview.forEach((item) => {
      if (item.preview) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setAttachedFiles([]);
    setAttachedFilesPreview([]);
  };

  const uploadTaskFiles = async (taskId: string) => {
    for (const file of attachedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('content', '');
      formData.append('taskId', taskId);

      try {
        const response = await fetch('/api/upload', {
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
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    setAttachedFiles((prev) => [...prev, ...newFiles]);

    const newPreviews = newFiles.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    }));

    setAttachedFilesPreview((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removeAttachedFile = (fileName: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.name !== fileName));

    setAttachedFilesPreview((prev) => {
      const target = prev.find((item) => item.file.name === fileName);
      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((item) => item.file.name !== fileName);
    });
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const handleCreateTaskWithFiles = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          boardId: board.id,
          assigneeIds: selectedAssignees,
          assigneeId: selectedAssignees[0] || newTask.assigneeId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (attachedFiles.length > 0) {
          await uploadTaskFiles(result.task.id);
        }

        setNewTask({ title: '', description: '', assigneeId: undefined, priority: 'medium', dueDate: undefined });
        setSelectedAssignees([]);
        setShowTaskModal(false);
        resetFileState();
        fetchTasks();
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
          assigneeId: selectedAssignees[0] || null,
          assigneeIds: selectedAssignees,
          dueDate: editingTask.dueDate,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (attachedFiles.length > 0) {
          await uploadTaskFiles(editingTask.id);
        }

        setEditingTask(null);
        setSelectedAssignees([]);
        resetFileState();
        fetchTasks();
      } else {
        console.error('Failed to update task:', result.error);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (columnId: string) => {
    if (dragOverColumn === columnId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggedTaskId(null);

    const taskId = e.dataTransfer.getData('taskId');
    const taskToUpdate = tasks.find((task) => task.id === taskId);

    if (!taskToUpdate || taskToUpdate.status === targetStatus) {
      return;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskToUpdate.id, status: targetStatus }),
      });

      const result = await response.json();

      if (response.ok) {
        fetchTasks();
      } else {
        console.error('Failed to update task status:', result.error);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });

      if (response.ok) {
        setViewingTask((prev) => prev ? { ...prev, status: newStatus } : prev);
        fetchTasks();
      } else {
        console.error('Failed to update task status:', await response.json());
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handlePriorityChange = async (taskId: string, newPriority: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, priority: newPriority }),
      });

      if (response.ok) {
        setViewingTask((prev) => prev ? { ...prev, priority: newPriority } : prev);
        fetchTasks();
      } else {
        console.error('Failed to update task priority:', await response.json());
      }
    } catch (error) {
      console.error('Error updating task priority:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        fetchTasks();
      } else {
        const errorResult = await response.json();
        console.error('Failed to delete task:', errorResult.error);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleTaskChat = async (task: Task) => {
    try {
      if (task.chatId) {
        window.location.href = `/chat?taskId=${task.id}`;
        return;
      }

      const response = await fetch(`/api/tasks/${task.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        window.location.href = `/chat?taskId=${task.id}`;
      } else {
        console.error('Failed to create task chat:', await response.json());
      }
    } catch (error) {
      console.error('Error handling task chat:', error);
    }
  };

  const getPriorityLabel = (priority: string) => {
    const option = PRIORITY_OPTIONS.find((item) => item.value === priority);
    return option?.label || priority;
  };

  const getPriorityBadgeClass = (priority: string) => {
    const option = PRIORITY_OPTIONS.find((item) => item.value === priority);
    return option?.badgeClass || 'border-border bg-secondary text-secondary-foreground';
  };

  const getTaskAssigneeNames = (task: Task) => {
    const ids = new Set<string>();

    if (task.assigneeId) {
      ids.add(task.assigneeId);
    }

    (task.assigneeIds || []).forEach((id) => ids.add(id));

    return Array.from(ids)
      .map((id) => allUsers.find((user) => user.id === id)?.username)
      .filter((name): name is string => Boolean(name));
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'done') return false;

    const dueDate = new Date(task.dueDate);
    if (Number.isNaN(dueDate.getTime())) return false;

    return dueDate.getTime() < Date.now();
  };

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tasks;

    return tasks.filter((task) => {
      const title = task.title?.toLowerCase() || '';
      const description = task.description?.toLowerCase() || '';
      return title.includes(query) || description.includes(query);
    });
  }, [tasks, searchQuery]);

  const tasksByColumn = useMemo(() => {
    return STATUS_COLUMNS.reduce<Record<string, Task[]>>((acc, column) => {
      acc[column.id] = filteredTasks.filter((task) => task.status === column.id);
      return acc;
    }, {});
  }, [filteredTasks]);

  const summary = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.status === 'done').length;
    const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
    const overdue = tasks.filter((task) => isOverdue(task)).length;

    return { total, done, inProgress, overdue };
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-b-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <Card className="border-border/70 bg-card/80">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Всего задач: {summary.total}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                В работе: {summary.inProgress}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Выполнено: {summary.done}
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  'rounded-full px-3 py-1',
                  summary.overdue > 0 && 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300'
                )}
              >
                Просрочено: {summary.overdue}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setShowMembersDialog(true)}>
                Участники доски
              </Button>
              <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
                <DialogTrigger asChild>
                  <Button>Создать задачу</Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Создать новую задачу</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTaskWithFiles} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Заголовок</Label>
                      <Input
                        id="title"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <textarea
                        id="description"
                        value={newTask.description || ''}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        className="mt-1 min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <Label>Участники (исполнители)</Label>
                      <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-input p-2">
                        {loadingUsers ? (
                          <p className="text-sm text-muted-foreground">Загрузка пользователей...</p>
                        ) : allUsers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Пользователи не найдены</p>
                        ) : (
                          allUsers.map((user) => (
                            <label key={user.id} className="mb-2 flex cursor-pointer items-center gap-2 text-sm last:mb-0">
                              <input
                                type="checkbox"
                                checked={selectedAssignees.includes(user.id)}
                                onChange={() => toggleAssignee(user.id)}
                              />
                              <span>{user.username}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="priority">Приоритет</Label>
                        <select
                          id="priority"
                          value={newTask.priority}
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent',
                            })
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          {PRIORITY_OPTIONS.map((option) => (
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
                          onChange={(e) =>
                            setNewTask({
                              ...newTask,
                              dueDate: e.target.value ? new Date(e.target.value) : undefined,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Прикрепленные файлы</Label>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
                      />
                      {attachedFilesPreview.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {attachedFilesPreview.map((fileInfo) => (
                            <div key={fileInfo.file.name} className="relative rounded-md border border-border p-2">
                              {fileInfo.preview ? (
                                <img src={fileInfo.preview} alt={fileInfo.file.name} className="h-16 w-full rounded object-cover" />
                              ) : (
                                <div className="flex h-16 items-center justify-center text-center text-xs text-muted-foreground">
                                  {fileInfo.file.name}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeAttachedFile(fileInfo.file.name)}
                                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button type="submit" className="w-full">
                      Создать задачу
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Input
            placeholder="Поиск по названию и описанию задач"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10"
          />
        </CardContent>
      </Card>

      <BoardMembersDialog
        boardId={board.id}
        boardCreatorId={board.creatorId}
        currentUserRole={currentUserRole}
        isOpen={showMembersDialog}
        onOpenChange={setShowMembersDialog}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = tasksByColumn[column.id] || [];

          return (
            <section
              key={column.id}
              className={cn(
                'flex min-h-[520px] flex-col rounded-xl border shadow-sm transition-all',
                column.columnClass,
                dragOverColumn === column.id && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background'
              )}
              onDrop={(e) => handleDrop(e, column.id)}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={() => handleDragLeave(column.id)}
            >
              <div className={cn('sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-xl px-3 py-2', column.headerClass)}>
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', column.dotClass)} />
                  <h3 className="text-sm font-semibold">{column.title}</h3>
                </div>
                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                  {columnTasks.length}
                </Badge>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {columnTasks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                    Нет задач в этой колонке
                  </div>
                )}

                {columnTasks.map((task) => {
                  const assigneeNames = getTaskAssigneeNames(task);
                  const overdue = isOverdue(task);

                  return (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setDragOverColumn(null);
                      }}
                      onClick={() => fetchTaskDetails(task.id)}
                      className={cn(
                        'cursor-move border-border/70 bg-card/90 transition-all hover:border-primary/35 hover:shadow-md',
                        draggedTaskId === task.id && 'opacity-70'
                      )}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm leading-snug">{task.title}</CardTitle>
                          <Badge className={cn('border text-[11px] font-medium', getPriorityBadgeClass(task.priority))}>
                            {getPriorityLabel(task.priority)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {task.dueDate && (
                            <span
                              className={cn(
                                'rounded-full border px-2 py-0.5',
                                overdue
                                  ? 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300'
                                  : 'border-border bg-secondary text-secondary-foreground'
                              )}
                            >
                              Срок: {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                          {assigneeNames.length > 0 && (
                            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-secondary-foreground">
                              {assigneeNames.slice(0, 2).join(', ')}
                              {assigneeNames.length > 2 ? ` +${assigneeNames.length - 2}` : ''}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleTaskChat(task);
                            }}
                          >
                            Чат задачи
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2.5 text-xs"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleDeleteTask(task.id);
                            }}
                          >
                            Удалить
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {viewingTask && (
        <Dialog open={!!viewingTask} onOpenChange={() => setViewingTask(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{viewingTask.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Описание</Label>
                <p className="mt-1 min-h-[100px] rounded-md border border-input bg-muted/40 p-3 text-sm">
                  {viewingTask.description || 'Нет описания'}
                </p>
              </div>

              <div>
                <Label>Статус</Label>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STATUS_COLUMNS.map((status) => (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => handleStatusChange(viewingTask.id, status.id)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all',
                        viewingTask.status === status.id
                          ? cn(status.columnClass, 'border-2 shadow-sm')
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                      )}
                    >
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', status.dotClass)} />
                      {status.title}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Приоритет</Label>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PRIORITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handlePriorityChange(viewingTask.id, option.value)}
                      className={cn(
                        'flex items-center justify-center rounded-lg border px-2 py-2 text-xs font-medium transition-all',
                        viewingTask.priority === option.value
                          ? cn(option.badgeClass, 'border-2 shadow-sm')
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Участники</Label>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-input bg-muted/40 p-2 text-sm">
                  {viewingTask.assigneeIds && viewingTask.assigneeIds.length > 0 ? (
                    viewingTask.assigneeIds
                      .map((assigneeId) => {
                        const user = allUsers.find((item) => item.id === assigneeId);
                        return user ? (
                          <div key={assigneeId} className="border-b border-border py-1 last:border-b-0">
                            {user.username}
                          </div>
                        ) : null;
                      })
                      .filter(Boolean)
                  ) : viewingTask.assigneeId ? (
                    <div className="py-1">
                      {allUsers.find((user) => user.id === viewingTask.assigneeId)?.username || 'Неизвестный пользователь'}
                    </div>
                  ) : (
                    <div className="py-1 text-muted-foreground">Нет участников</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Создано</Label>
                  <p className="mt-1 rounded-md border border-input bg-muted/40 p-2 text-sm">
                    {new Date(viewingTask.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div>
                  <Label>Срок выполнения</Label>
                  <p className="mt-1 rounded-md border border-input bg-muted/40 p-2 text-sm">
                    {viewingTask.dueDate ? new Date(viewingTask.dueDate).toLocaleDateString('ru-RU') : 'Не указан'}
                  </p>
                </div>
              </div>

              <div>
                <Label>Прикрепленные файлы</Label>
                <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-input bg-muted/40 p-2 text-sm">
                  {viewingTask.messages && viewingTask.messages.length > 0 ? (
                    viewingTask.messages
                      .filter((msg) => msg.fileUrl)
                      .map((msg, index) => (
                        <div key={`${msg.id}-${index}`} className="border-b border-border py-1 last:border-b-0">
                          <a
                            href={msg.fileUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {msg.fileName || 'Файл'}
                          </a>
                        </div>
                      ))
                  ) : (
                    <div className="py-1 text-muted-foreground">Нет прикрепленных файлов</div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setViewingTask(null);
                    setEditingTask(viewingTask);
                  }}
                >
                  Редактировать
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setViewingTask(null)}>
                  Закрыть
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Редактировать задачу</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateTaskWithFiles} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Заголовок</Label>
                <Input
                  id="edit-title"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Описание</Label>
                <textarea
                  id="edit-description"
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="mt-1 min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <Label>Участники (исполнители)</Label>
                <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-input p-2">
                  {allUsers.map((user) => (
                    <label key={user.id} className="mb-2 flex cursor-pointer items-center gap-2 text-sm last:mb-0">
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(user.id)}
                        onChange={() => toggleAssignee(user.id)}
                      />
                      <span>{user.username}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="edit-status">Статус</Label>
                  <select
                    id="edit-status"
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {STATUS_COLUMNS.map((status) => (
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
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent',
                      })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-dueDate">Срок выполнения</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      dueDate: e.target.value ? new Date(e.target.value) : undefined,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Прикрепленные файлы</Label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
                />
                {attachedFilesPreview.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {attachedFilesPreview.map((fileInfo) => (
                      <div key={fileInfo.file.name} className="relative rounded-md border border-border p-2">
                        {fileInfo.preview ? (
                          <img src={fileInfo.preview} alt={fileInfo.file.name} className="h-16 w-full rounded object-cover" />
                        ) : (
                          <div className="flex h-16 items-center justify-center text-center text-xs text-muted-foreground">
                            {fileInfo.file.name}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAttachedFile(fileInfo.file.name)}
                          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Сохранить
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditingTask(null);
                    setSelectedAssignees([]);
                    resetFileState();
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
