import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const boardId = searchParams.get('boardId');

    // Search for tasks that belong to boards the user has access to
    const tasks = await prisma.task.findMany({
      where: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
        board: {
          OR: [
            { creatorId: authUser.userId },
            { members: { some: { userId: authUser.userId } } }
          ]
        },
        ...(boardId && { boardId }) // Filter by specific board if provided
      },
      include: {
        board: {
          select: {
            id: true,
            title: true
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
      },
      take: 20, // Limit results
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error) {
    console.error('Error searching tasks:', error);
    return NextResponse.json({ error: 'Ошибка при поиске задач' }, { status: 500 });
  }
}