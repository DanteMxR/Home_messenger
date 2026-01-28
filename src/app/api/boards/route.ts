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

    // Get all boards (visible to all authenticated users)
    const boards = await prisma.board.findMany({
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
    console.log('Board creation request received');
    
    const authUser = await getAuthUser();
    
    if (!authUser || !authUser.userId) {
      console.log('Authentication failed:', { authUser });
      return NextResponse.json(
        { error: 'Неавторизованный доступ' },
        { status: 401 }
      );
    }
    
    console.log('Authenticated user:', authUser.userId);

    const body = await request.json();
    console.log('Request body:', body);
    
    const { title, description } = createBoardSchema.parse(body);
    
    console.log('Parsed data:', { title, description });

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
    const boardId = searchParams.get('id');

    if (!boardId) {
      return NextResponse.json(
        { error: 'ID доски обязателен' },
        { status: 400 }
      );
    }

    // Check if the board exists (any authenticated user can delete boards)
    const board = await prisma.board.findUnique({
      where: { id: boardId }
    });

    if (!board) {
      return NextResponse.json(
        { error: 'Доска не найдена' },
        { status: 404 }
      );
    }

    // Delete the board and all related records (tasks, boardMembers, etc.)
    await prisma.board.delete({
      where: { id: boardId }
    });

    return NextResponse.json({ 
      message: 'Доска успешно удалена' 
    });
  } catch (error) {
    console.error('Delete board error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}