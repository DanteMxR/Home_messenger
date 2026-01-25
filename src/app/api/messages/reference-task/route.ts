import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const body = await request.json();
    const { content, taskId, chatId } = body;

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

    // Create a message that references the task
    const message = await prisma.message.create({
      data: {
        content,
        senderId: authUser.userId,
        chatId,
        taskId, // Link the message to the task
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            description: true
          }
        }
      }
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error creating message with task reference:', error);
    return NextResponse.json({ error: 'Ошибка при создании сообщения с ссылкой на задачу' }, { status: 500 });
  }
}