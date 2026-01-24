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

    // For now, allow any member to delete the group chat
    // In a more advanced implementation, you might want to restrict this to admins or creators
    await prisma.chat.delete({
      where: {
        id: chatId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete group chat error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}