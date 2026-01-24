import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { chatId, userIds }: { chatId: string; userIds: string[] } = await request.json();

    if (!chatId || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'ID чата и список пользователей обязательны' }, { status: 400 });
    }

    // Check if user is a member of the chat
    const chatMember = await prisma.chatMember.findUnique({
      where: {
        userId_chatId: {
          userId: authUser.userId,
          chatId
        }
      }
    });

    if (!chatMember) {
      return NextResponse.json({ error: 'Вы не являетесь участником этого чата' }, { status: 403 });
    }

    // Validate that all users exist
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true
      }
    });

    if (users.length !== userIds.length) {
      return NextResponse.json({ error: 'Один или несколько пользователей не найдены' }, { status: 400 });
    }

    // Check which users are already members to avoid duplicates
    const existingMembers = await prisma.chatMember.findMany({
      where: {
        chatId,
        userId: { in: userIds }
      },
      select: { userId: true }
    });
    
    const existingUserIds = existingMembers.map(member => member.userId);
    const newUserIds = userIds.filter(id => !existingUserIds.includes(id));
    
    if (newUserIds.length > 0) {
      // Add new users to the chat
      await prisma.chatMember.createMany({
        data: newUserIds.map(userId => ({
          userId,
          chatId,
          role: 'member'
        }))
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add members to group chat error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const userId = searchParams.get('userId');

    if (!chatId || !userId) {
      return NextResponse.json({ error: 'ID чата и ID пользователя обязательны' }, { status: 400 });
    }

    // Check if user is the owner/admin of the chat or trying to remove themselves
    const chatMember = await prisma.chatMember.findUnique({
      where: {
        userId_chatId: {
          userId: authUser.userId,
          chatId
        }
      }
    });

    if (!chatMember) {
      return NextResponse.json({ error: 'Вы не являетесь участником этого чата' }, { status: 403 });
    }

    // Check if trying to remove self
    if (authUser.userId === userId) {
      // Allow user to leave the group
      await prisma.chatMember.delete({
        where: {
          userId_chatId: {
            userId: authUser.userId,
            chatId
          }
        }
      });

      // If it was the last member, delete the chat
      const remainingMembers = await prisma.chatMember.count({
        where: { chatId }
      });

      if (remainingMembers === 0) {
        await prisma.chat.delete({
          where: { id: chatId }
        });
      }

      return NextResponse.json({ success: true });
    }

    // For removing other users, check if the current user has admin rights
    // In this implementation, we'll allow removal if the user is the creator or admin
    // For now, we'll just check if the user is the one who created the chat
    // (We don't have a concept of chat creators stored, so we'll just allow members to remove others)
    // TODO: Implement proper role management
    
    // Just check if the user is a member of the chat
    if (chatMember) {
      // Check if the user to be removed is actually in the chat
      const userToRemove = await prisma.chatMember.findUnique({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        }
      });

      if (!userToRemove) {
        return NextResponse.json({ error: 'Пользователь не является участником чата' }, { status: 400 });
      }

      // Remove the user from the chat
      await prisma.chatMember.delete({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        }
      });

      // If it was the last member, delete the chat
      const remainingMembers = await prisma.chatMember.count({
        where: { chatId }
      });

      if (remainingMembers === 0) {
        await prisma.chat.delete({
          where: { id: chatId }
        });
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'У вас нет прав для удаления участника' }, { status: 403 });
    }
  } catch (error) {
    console.error('Remove member from group chat error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}