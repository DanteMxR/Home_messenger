import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';

const createBoardSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
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

    // Get all boards where user is either creator or member
    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { creatorId: authUser.userId },
          { members: { some: { userId: authUser.userId } } }
        ]
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
            isAdmin: true,
            lastSeen: true,
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
              }
            }
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assigneeId: true,
            createdAt: true,
            dueDate: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ boards });
  } catch (error) {
    console.error('Get boards error:', error);
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
    const { title, description } = createBoardSchema.parse(body);

    const board = await prisma.board.create({
      data: {
        title,
        description,
        creatorId: authUser.userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
            isAdmin: true,
            lastSeen: true,
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
              }
            }
          }
        },
      },
    });

    // Add the creator as a member of the board
    await prisma.boardMember.create({
      data: {
        boardId: board.id,
        userId: authUser.userId,
        role: 'owner',
      }
    });

    return NextResponse.json({ 
      message: 'Доска успешно создана', 
      board 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Create board error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}