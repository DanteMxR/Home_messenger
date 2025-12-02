import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { messageId, content } = await request.json()

    if (!messageId || !content) {
      return NextResponse.json({ error: 'Требуется messageId и content' }, { status: 400 })
    }

    // Check if the user is the owner of the message
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    })

    if (!message) {
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 })
    }

    if (message.senderId !== authUser.userId) {
      return NextResponse.json({ error: 'Нет прав для редактирования этого сообщения' }, { status: 403 })
    }

    // Update the message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { 
        content,
        updatedAt: new Date()
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        receiver: { select: { id: true, username: true, avatar: true } },
      }
    })

    return NextResponse.json({ success: true, message: updatedMessage })
  } catch (error) {
    console.error('Edit message error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}