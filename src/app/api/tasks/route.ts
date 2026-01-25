import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  boardId: z.string(),
  assigneeId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
});

const updateTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser || !authUser.userId) {
      return NextResponse.json(
        { error: 'Неавторизованный доступ' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const assignedToMe = searchParams.get('assignedToMe');

    let whereClause: any = {};
    
    if (boardId) {
      whereClause.boardId = boardId;
    }
    
    if (assignedToMe === 'true') {
      whereClause.assigneeId = authUser.userId;
    }

    // Get tasks based on filters
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
          }
        },
        assignee: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
          }
        },
        board: {
          select: {
            id: true,
            title: true,
          }
        },
        messages: {
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser || !authUser.userId) {
      return NextResponse.json(
        { error: 'Неавторизованный доступ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, boardId, assigneeId, priority, dueDate } = createTaskSchema.parse(body);

    // Check if user has access to the board
    const boardMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: authUser.userId,
      }
    });

    if (!boardMember) {
      return NextResponse.json(
        { error: 'У вас нет доступа к этой доске' },
        { status: 403 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        boardId,
        creatorId: authUser.userId,
        assigneeId: assigneeId || null,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
          }
        },
        assignee: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
          }
        },
        board: {
          select: {
            id: true,
            title: true,
          }
        },
      },
    });

    return NextResponse.json({ 
      message: 'Задача успешно создана', 
      task 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser || !authUser.userId) {
      return NextResponse.json(
        { error: 'Неавторизованный доступ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsedBody = updateTaskSchema.parse(body);
    const id = parsedBody.id;
    const updateData = (({
      id,
      ...rest
    }) => rest)(parsedBody);

    // Check if user is the creator, assignee, or board member with edit rights
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        board: {
          include: {
            members: {
              where: {
                userId: authUser.userId,
              }
            }
          }
        }
      }
    });

    if (!task || task.board.members.length === 0) {
      return NextResponse.json(
        { error: 'У вас нет доступа к этой задаче' },
        { status: 403 }
      );
    }

    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...updateData,
        assigneeId: updateData.assigneeId !== undefined ? updateData.assigneeId || null : undefined,
        dueDate: updateData.dueDate !== undefined ? (updateData.dueDate ? new Date(updateData.dueDate as string) : null) : undefined,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
          }
        },
        assignee: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
          }
        },
        board: {
          select: {
            id: true,
            title: true,
          }
        },
      },
    });

    return NextResponse.json({ 
      message: 'Задача успешно обновлена', 
      task: updatedTask 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser || !authUser.userId) {
      return NextResponse.json(
        { error: 'Неавторизованный доступ' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return NextResponse.json(
        { error: 'ID задачи обязателен' },
        { status: 400 }
      );
    }

    // Check if user is the creator of the task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: {
          include: {
            members: {
              where: {
                userId: authUser.userId,
                role: 'owner', // Only owners can delete tasks
              }
            }
          }
        }
      }
    });

    if (!task || task.creatorId !== authUser.userId || task.board.members.length === 0) {
      return NextResponse.json(
        { error: 'У вас нет прав для удаления этой задачи' },
        { status: 403 }
      );
    }

    // Delete the task
    await prisma.task.delete({
      where: { id: taskId }
    });

    return NextResponse.json({ 
      message: 'Задача успешно удалена' 
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}