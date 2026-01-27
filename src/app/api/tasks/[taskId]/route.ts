import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { taskId } = await params;
    
    // Check if the task exists and belongs to the current user's boards
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: {
          include: {
            members: {
              select: {
                userId: true
              }
            }
          }
        },
        assignee: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }

    // Check if user has access to the board (either creator or member)
    const isBoardMember = task.board.creatorId === authUser.userId || 
      task.board.members.some((member: any) => member.userId === authUser.userId);

    if (!isBoardMember) {
      return NextResponse.json({ error: 'Нет доступа к задаче' }, { status: 403 });
    }

    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Ошибка при получении задачи' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { taskId } = await params;
    
    // Check if the task exists and belongs to the current user's boards
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: {
          include: {
            members: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }

    // Check if user has access to the board (either creator or member)
    const isBoardMember = task.board.creatorId === authUser.userId || 
      task.board.members.some((member: any) => member.userId === authUser.userId);

    if (!isBoardMember) {
      return NextResponse.json({ error: 'Нет доступа к задаче' }, { status: 403 });
    }
    
    // Delete the task
    await prisma.task.delete({
      where: { id: taskId }
    });

    return NextResponse.json({ message: 'Задача успешно удалена' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Ошибка при удалении задачи' }, { status: 500 });
  }
}