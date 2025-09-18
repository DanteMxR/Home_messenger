import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { senderId } = await request.json()

    if (!senderId) {
      return NextResponse.json({ error: 'Требуется senderId' }, { status: 400 })
    }

    // Mark all messages from this sender as read
    const updatedCount = await prisma.message.updateMany({
      where: {
        senderId: senderId,
        receiverId: authUser.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })

    return NextResponse.json({ 
      message: `Помечено как прочитанное: ${updatedCount.count} сообщений` 
    })
  } catch (error) {
    console.error('Mark as read error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}