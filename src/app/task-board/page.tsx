'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Board, Task } from '@/types';
import KanbanBoard from '@/components/task-board/TaskBoard';

type ExtendedBoard = Board & {
  tasks?: Task[];
  members?: Array<{ id: string }>;
  creator?: { username?: string };
};

const isTaskDone = (task: Task) => task.status === 'done';

export default function TaskBoardPage() {
  const [boards, setBoards] = useState<ExtendedBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

    if (!newBoardTitle.trim()) {
      console.error('Board title is required');
      return;
    }

    if (newBoardTitle.trim().length > 100) {
      console.error('Board title must be less than 100 characters');
      return;
    }

    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBoardTitle.trim(),
          description: '',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setNewBoardTitle('');
        fetchBoards();
      } else {
        console.error('Failed to create board:', result.error);
      }
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту доску? Все задачи в этой доске также будут удалены.')) {
      return;
    }

    try {
      const response = await fetch(`/api/boards?id=${boardId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (response.ok) {
        fetchBoards();
        if (selectedBoard?.id === boardId) {
          setSelectedBoard(null);
        }
      } else {
        console.error('Failed to delete board:', result.error);
      }
    } catch (error) {
      console.error('Error deleting board:', error);
    }
  };

  const filteredBoards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return boards;

    return boards.filter((board) => {
      const title = board.title?.toLowerCase() || '';
      const creator = board.creator?.username?.toLowerCase() || '';
      return title.includes(query) || creator.includes(query);
    });
  }, [boards, searchQuery]);

  const boardStats = useMemo(() => {
    const totalBoards = boards.length;
    const totalTasks = boards.reduce((acc, board) => acc + (board.tasks?.length || 0), 0);
    const doneTasks = boards.reduce(
      (acc, board) => acc + (board.tasks?.filter(isTaskDone).length || 0),
      0
    );
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return { totalBoards, totalTasks, doneTasks, completionRate };
  }, [boards]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-b-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(56,139,253,0.14),transparent_55%)]">
      <div className="mx-auto w-full max-w-[1450px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Доска задач</h1>
            <p className="text-sm text-muted-foreground">Планируйте, распределяйте и доводите задачи до результата.</p>
          </div>
          <Button variant="outline" onClick={() => (window.location.href = '/chat')}>
            Перейти в мессенджер
          </Button>
        </div>

        {!selectedBoard ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card className="border-border/70 bg-card/75 backdrop-blur-sm">
                <CardContent className="pt-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Доски</p>
                  <p className="mt-2 text-2xl font-semibold">{boardStats.totalBoards}</p>
                </CardContent>
              </Card>
              <Card className="border-border/70 bg-card/75 backdrop-blur-sm">
                <CardContent className="pt-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Всего задач</p>
                  <p className="mt-2 text-2xl font-semibold">{boardStats.totalTasks}</p>
                </CardContent>
              </Card>
              <Card className="border-border/70 bg-card/75 backdrop-blur-sm">
                <CardContent className="pt-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Выполнено</p>
                  <p className="mt-2 text-2xl font-semibold">{boardStats.completionRate}%</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/70 bg-card/75 backdrop-blur-sm">
              <CardContent className="pt-6">
                <form onSubmit={handleCreateBoard} className="flex flex-col gap-3 lg:flex-row">
                  <Input
                    placeholder="Название новой доски"
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                    className="h-11 flex-1"
                    required
                  />
                  <Button type="submit" disabled={!newBoardTitle.trim()} className="h-11 px-6">
                    Создать доску
                  </Button>
                </form>
                <div className="mt-3">
                  <Input
                    placeholder="Поиск доски по названию или владельцу"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredBoards.map((board) => {
                const taskCount = board.tasks?.length || 0;
                const doneCount = board.tasks?.filter(isTaskDone).length || 0;
                const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
                const memberCount = board.members?.length || 0;

                return (
                  <Card
                    key={board.id}
                    className="group cursor-pointer border-border/70 bg-card/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                    onClick={() => setSelectedBoard(board)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-lg">{board.title}</CardTitle>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8 rounded-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBoard(board.id);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground">
                          Задач: {taskCount}
                        </span>
                        <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground">
                          Выполнено: {doneCount}
                        </span>
                        <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground">
                          Участников: {memberCount}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Создана: {new Date(board.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredBoards.length === 0 && (
              <Card className="border-border/70 bg-card/75 text-center">
                <CardContent className="py-14">
                  <p className="text-base font-medium">
                    {boards.length === 0 ? 'Пока нет доступных досок' : 'Ничего не найдено по вашему запросу'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {boards.length === 0 ? 'Создайте первую доску, чтобы начать планирование.' : 'Попробуйте изменить текст поиска.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="border-border/70 bg-card/80">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
                <div>
                  <h2 className="text-2xl font-semibold">{selectedBoard.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Рабочая область для ежедневного трекинга задач.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedBoard(null);
                    fetchBoards();
                  }}
                >
                  Назад к списку досок
                </Button>
              </CardContent>
            </Card>

            <KanbanBoard board={selectedBoard} />
          </div>
        )}
      </div>
    </div>
  );
}
