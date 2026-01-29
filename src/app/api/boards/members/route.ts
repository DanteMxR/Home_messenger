import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';

const addMemberSchema = z.object({
  boardId: z.string(),
  userId: z.string(),
  role: z.enum(['member', 'admin', 'owner']).optional(),
});

const removeMemberSchema = z.object({
  boardId: z.string(),
  userId: z.string(),
});

const updateMemberRoleSchema = z.object({
  boardId: z.string(),
  userId: z.string(),
  role: z.enum(['member', 'admin']),
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

    if (!boardId) {
      return NextResponse.json(
        { error: 'ID доски обязателен' },
        { status: 400 }
      );
    }

    // Check if board exists (any authenticated user can view board members)
    const board = await prisma.board.findUnique({
      where: { id: boardId }
    });

    if (!board) {
      return NextResponse.json(
        { error: 'Доска не найдена' },
        { status: 404 }
      );
    }

    // Get all members of the board
    const boardMembers = await prisma.boardMember.findMany({
      where: {
        boardId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
            isAdmin: true,
            lastSeen: true,
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    });

    return NextResponse.json({ members: boardMembers });
  } catch (error) {
    console.error('Get board members error:', error);
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
    const { boardId, userId, role } = addMemberSchema.parse(body);

    // Check if the current user is an owner or admin of the board
    const currentMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: authUser.userId,
        role: { in: ['owner', 'admin'] },
      }
    });

    if (!currentMember) {
      return NextResponse.json(
        { error: 'У вас нет прав для добавления участников в эту доску' },
        { status: 403 }
      );
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId,
      }
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'Пользователь уже является участником этой доски' },
        { status: 400 }
      );
    }

    // Add the user to the board
    const newMember = await prisma.boardMember.create({
      data: {
        boardId,
        userId,
        role: role || 'member',
      },
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
    });

    return NextResponse.json({ 
      message: 'Участник успешно добавлен в доску', 
      member: newMember 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Add board member error:', error);
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
    const boardId = searchParams.get('boardId');
    const userId = searchParams.get('userId');

    if (!boardId || !userId) {
      return NextResponse.json(
        { error: 'ID доски и ID пользователя обязательны' },
        { status: 400 }
      );
    }

    // Check if the current user is an owner or admin of the board
    const currentMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: authUser.userId,
        role: { in: ['owner', 'admin'] },
      }
    });

    if (!currentMember) {
      return NextResponse.json(
        { error: 'У вас нет прав для удаления участников из этой доски' },
        { status: 403 }
      );
    }

    // Check if trying to remove owner by non-owner
    if (currentMember.role !== 'owner') {
      const memberToRemove = await prisma.boardMember.findFirst({
        where: {
          boardId,
          userId,
        }
      });

      if (memberToRemove?.role === 'owner') {
        return NextResponse.json(
          { error: 'Только владелец доски может удалить другого владельца' },
          { status: 403 }
        );
      }
    }

    // Prevent owner from removing themselves
    if (userId === authUser.userId && currentMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Владелец не может удалить себя из доски. Назначьте нового владельца или удалите доску.' },
        { status: 400 }
      );
    }

    // Remove the member from the board
    await prisma.boardMember.delete({
      where: {
        boardId_userId: {
          boardId,
          userId,
        }
      }
    });

    return NextResponse.json({ 
      message: 'Участник успешно удален из доски' 
    });
  } catch (error) {
    console.error('Remove board member error:', error);
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
    const { boardId, userId, role } = updateMemberRoleSchema.parse(body);

    // Check if the current user is an owner of the board
    const currentMember = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: authUser.userId,
        role: 'owner',
      }
    });

    if (!currentMember) {
      return NextResponse.json(
        { error: 'Только владелец доски может изменять роли участников' },
        { status: 403 }
      );
    }

    // Check if the user whose role is being changed exists in the board
    const memberToUpdate = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId,
      }
    });

    if (!memberToUpdate) {
      return NextResponse.json(
        { error: 'Участник не найден в этой доске' },
        { status: 404 }
      );
    }

    // Prevent changing owner role (owners can only transfer ownership)
    if (memberToUpdate.role === 'owner') {
      return NextResponse.json(
        { error: 'Невозможно изменить роль владельца. Используйте передачу прав собственности.' },
        { status: 400 }
      );
    }

    // Update the member's role
    const updatedMember = await prisma.boardMember.update({
      where: {
        boardId_userId: {
          boardId,
          userId,
        }
      },
      data: {
        role,
      },
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
    });

    return NextResponse.json({ 
      message: 'Роль участника успешно обновлена', 
      member: updatedMember 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Update board member role error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}