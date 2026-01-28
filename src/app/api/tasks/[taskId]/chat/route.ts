import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { Task } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { taskId } = params;
    
    // Check if the task exists (any authenticated user can create task chats)
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }

    // Create a new chat for the task
    const chat = await prisma.chat.create({
      data: {
        name: `Чат задачи: ${task.title}`,
        isGroup: true, // Make it a group chat
        members: {
          create: [
            { userId: authUser.userId },
            ...(task.assigneeId ? [{ userId: task.assigneeId }] : []) // Add assignee if exists
          ]
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    // Update the task to link it to the newly created chat
    try {
      await prisma.task.update({
        where: { id: taskId },
        data: { chatId: chat.id }
      });
    } catch (error) {
      console.error('Error updating task with chatId:', error);
      // If updating the task fails, we still return the chat but log the error
    }

    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    console.error('Error creating chat for task:', error);
    return Response.json({ error: 'Ошибка при создании чата для задачи' }, { status: 500 });
  }
}