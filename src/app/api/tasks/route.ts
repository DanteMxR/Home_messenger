import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  boardId: z.string(),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
});

const updateTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser || !authUser.userId) {
      return NextResponse.json(
        { error: 'РќРµР°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹Р№ РґРѕСЃС‚СѓРї' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const assignedToMe = searchParams.get('assignedToMe');

    const whereClause: { boardId?: string; assigneeId?: string } = {};
    
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
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                isAdmin: true,
                lastSeen: true,
                createdAt: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser || !authUser.userId) {
      return NextResponse.json(
        { error: 'РќРµР°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹Р№ РґРѕСЃС‚СѓРї' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, boardId, assigneeId, assigneeIds, priority, dueDate } = createTaskSchema.parse(body);

    // Check if board exists (any authenticated user can create tasks on any board)
    const board = await prisma.board.findUnique({
      where: { id: boardId }
    });

    if (!board) {
      return NextResponse.json(
        { error: 'Р”РѕСЃРєР° РЅРµ РЅР°Р№РґРµРЅР°' },
        { status: 404 }
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
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                isAdmin: true,
                lastSeen: true,
                createdAt: true,
              }
            }
          }
        }
      },
    });

    // Create task assignee relationships
    if (assigneeIds && assigneeIds.length > 0) {
      // Remove duplicates and filter out empty strings
      const uniqueAssigneeIds = [...new Set(assigneeIds.filter(id => id && id.trim()))];
      
      // Create task assignee records
      await prisma.taskAssignee.createMany({
        data: uniqueAssigneeIds.map(userId => ({
          taskId: task.id,
          userId,
        })),
      });
      
      // Re-fetch the task with updated assignees
      const updatedTask = await prisma.task.findUnique({
        where: { id: task.id },
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
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  isOnline: true,
                  isAdmin: true,
                  lastSeen: true,
                  createdAt: true,
                }
              }
            }
          }
        },
      });
      
      return NextResponse.json({ 
        message: 'Р—Р°РґР°С‡Р° СѓСЃРїРµС€РЅРѕ СЃРѕР·РґР°РЅР°', 
        task: updatedTask 
      });
    }

    return NextResponse.json({ 
      message: 'Р—Р°РґР°С‡Р° СѓСЃРїРµС€РЅРѕ СЃРѕР·РґР°РЅР°', 
      task 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'РќРµРІРµСЂРЅС‹Рµ РґР°РЅРЅС‹Рµ', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser || !authUser.userId) {
      return NextResponse.json(
        { error: 'РќРµР°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹Р№ РґРѕСЃС‚СѓРї' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsedBody = updateTaskSchema.parse(body);
    const { id, assigneeIds, ...updateData } = parsedBody;

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id },
        data: {
          ...updateData,
          assigneeId: updateData.assigneeId !== undefined ? updateData.assigneeId || null : undefined,
          dueDate: updateData.dueDate !== undefined ? (updateData.dueDate ? new Date(updateData.dueDate as string) : null) : undefined,
        },
      });

      if (assigneeIds !== undefined) {
        await tx.taskAssignee.deleteMany({ where: { taskId: id } });
        if (assigneeIds.length > 0) {
          const unique = [...new Set(assigneeIds)];
          await tx.taskAssignee.createMany({
            data: unique.map((userId) => ({ taskId: id, userId })),
          });
        }
      }

      return updated;
    });

    const taskWithRelations = await prisma.task.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true, avatar: true, isOnline: true } },
        assignee: { select: { id: true, username: true, avatar: true, isOnline: true } },
        board: { select: { id: true, title: true } },
        assignees: {
          include: {
            user: { select: { id: true, username: true, avatar: true, isOnline: true } },
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Задача успешно обновлена',
      task: taskWithRelations
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'РќРµРІРµСЂРЅС‹Рµ РґР°РЅРЅС‹Рµ', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser || !authUser.userId) {
      return NextResponse.json(
        { error: 'РќРµР°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹Р№ РґРѕСЃС‚СѓРї' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return NextResponse.json(
        { error: 'ID Р·Р°РґР°С‡Рё РѕР±СЏР·Р°С‚РµР»РµРЅ' },
        { status: 400 }
      );
    }

    // Check if task exists (any authenticated user can delete tasks)
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Р—Р°РґР°С‡Р° РЅРµ РЅР°Р№РґРµРЅР°' },
        { status: 404 }
      );
    }

    // Delete the task
    await prisma.task.delete({
      where: { id: taskId }
    });

    return NextResponse.json({ 
      message: 'Р—Р°РґР°С‡Р° СѓСЃРїРµС€РЅРѕ СѓРґР°Р»РµРЅР°' 
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°' },
      { status: 500 }
    );
  }
}