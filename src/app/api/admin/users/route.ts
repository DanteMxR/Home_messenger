import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';

const createUserSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  isAdmin: z.boolean().optional(),
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

    // Check if user is admin using raw query to bypass typing issues
    const currentUserResult = await prisma.$queryRaw<Array<{isAdmin: boolean}>>`SELECT isAdmin FROM users WHERE id = ${authUser.userId}`;

    if (!currentUserResult || currentUserResult.length === 0 || !currentUserResult[0].isAdmin) {
      return NextResponse.json(
        { error: 'Доступ запрещен: Требуется доступ администратора' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Use raw query to get users
    let usersQuery = `SELECT id, username, avatar, isOnline, isAdmin, lastSeen, createdAt FROM users`;
    const queryParams: string[] = [];
    
    if (search) {
      usersQuery += ` WHERE username LIKE '%' || ${search} || '%'`;
      queryParams.push(search);
    }
    
    usersQuery += ` ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const users = await prisma.$queryRawUnsafe<Array<{id: string, username: string, avatar: string | null, isOnline: boolean, isAdmin: boolean, lastSeen: Date, createdAt: Date}>>(usersQuery);

    let totalUsersQuery = `SELECT COUNT(*) as count FROM users`;
    let totalUsersParams: string[] = [];
    
    if (search) {
      totalUsersQuery += ` WHERE username LIKE '%' || ? || '%'`;
      totalUsersParams = [search];
    }
    
    const totalResult: Array<{count: number}> = await prisma.$queryRawUnsafe(totalUsersQuery, ...totalUsersParams);
    const totalUsers = Number(totalResult[0].count || 0);

    return NextResponse.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNextPage: offset + limit < totalUsers,
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
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

    // Check if user is admin using raw query to bypass typing issues
    const currentUserResult = await prisma.$queryRaw<Array<{isAdmin: boolean}>>`SELECT isAdmin FROM users WHERE id = ${authUser.userId}`;

    if (!currentUserResult || currentUserResult.length === 0 || !currentUserResult[0].isAdmin) {
      return NextResponse.json(
        { error: 'Доступ запрещен: Требуется доступ администратора' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, isAdmin = false } = createUserSchema.parse(body);

    // Check if user already exists
    const existingUserResult = await prisma.$queryRaw<Array<{id: string}>>`SELECT id FROM users WHERE username = ${username}`;

    if (existingUserResult && existingUserResult.length > 0) {
      return NextResponse.json(
        { error: 'Пользователь уже существует' },
        { status: 400 }
      );
    }

    // Hash password and create user
    const { hashPassword } = await import('@/lib/auth');
    const hashedPassword = await hashPassword(password);
    
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        isAdmin,
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        isOnline: true,
        isAdmin: true,
        lastSeen: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      message: 'Пользователь успешно создан',
      user: newUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Admin create user error:', error);
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

    // Check if user is admin using raw query to bypass typing issues
    const currentUserResult = await prisma.$queryRaw<Array<{isAdmin: boolean}>>`SELECT isAdmin FROM users WHERE id = ${authUser.userId}`;

    if (!currentUserResult || currentUserResult.length === 0 || !currentUserResult[0].isAdmin) {
      return NextResponse.json(
        { error: 'Доступ запрещен: Требуется доступ администратора' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Требуется ID пользователя' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === authUser.userId) {
      return NextResponse.json(
        { error: 'Невозможно удалить себя' },
        { status: 400 }
      );
    }

    // Find user to delete
    const userToDeleteResult = await prisma.$queryRaw<Array<{id: string}>>`SELECT id FROM users WHERE id = ${userId}`;

    if (!userToDeleteResult || userToDeleteResult.length === 0) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({
      message: 'Пользователь успешно удален'
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
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

    // Check if user is admin using raw query to bypass typing issues
    const currentUserResult = await prisma.$queryRaw<Array<{isAdmin: boolean}>>`SELECT isAdmin FROM users WHERE id = ${authUser.userId}`;

    if (!currentUserResult || currentUserResult.length === 0 || !currentUserResult[0].isAdmin) {
      return NextResponse.json(
        { error: 'Доступ запрещен: Требуется доступ администратора' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, isAdmin } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Требуется ID пользователя' },
        { status: 400 }
      );
    }

    if (typeof isAdmin !== 'boolean') {
      return NextResponse.json(
        { error: 'Требуется значение isAdmin и оно должно быть логическим' },
        { status: 400 }
      );
    }

    // Prevent admin from changing their own admin status (for security)
    if (userId === authUser.userId) {
      return NextResponse.json(
        { error: 'Невозможно изменить свой собственный статус администратора' },
        { status: 400 }
      );
    }

    // Update user's admin status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
      select: {
        id: true,
        username: true,
        isAdmin: true,
      }
    });

    return NextResponse.json({
      message: isAdmin ? 'Пользователь повышен до администратора' : 'Статус администратора пользователя отозван',
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Admin update user error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}