import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const receiverId = searchParams.get('receiverId')
    const chatId = searchParams.get('chatId')

    let messages
    if (chatId) {
      // Get group chat messages
      messages = await prisma.message.findMany({
        where: { chatId },
        include: {
          sender: { select: { id: true, username: true, avatar: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      })
    } else if (receiverId) {
      // Get direct messages
      messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: authUser.userId, receiverId },
            { senderId: receiverId, receiverId: authUser.userId },
          ],
        },
        include: {
          sender: { select: { id: true, username: true, avatar: true } },
          receiver: { select: { id: true, username: true, avatar: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      })
      
      // Mark messages as read when fetched
      await prisma.message.updateMany({
        where: {
          senderId: receiverId,
          receiverId: authUser.userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      })
    } else {
      return NextResponse.json({ error: 'Требуется receiverId или chatId' }, { status: 400 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}