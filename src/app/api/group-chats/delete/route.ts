import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'ID чата обязателен' }, { status: 400 });
    }

    // Get the chat with creator info
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { creatorId: true }
    });

    if (!chat) {
      return NextResponse.json({ error: 'Чат не найден' }, { status: 404 });
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

    const isOwner = chat.creatorId === authUser.userId;

    if (isOwner) {
      // Owner deletes the entire chat for everyone
      await prisma.chat.delete({
        where: { id: chatId }
      });
      return NextResponse.json({ success: true, action: 'deleted' });
    } else {
      // Non-owner leaves the group
      await prisma.chatMember.delete({
        where: {
          userId_chatId: {
            userId: authUser.userId,
            chatId
          }
        }
      });

      // Check if any members remain
      const remainingMembers = await prisma.chatMember.count({
        where: { chatId }
      });

      if (remainingMembers === 0) {
        await prisma.chat.delete({
          where: { id: chatId }
        });
      }

      return NextResponse.json({ success: true, action: 'left' });
    }
  } catch (error) {
    console.error('Delete group chat error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
