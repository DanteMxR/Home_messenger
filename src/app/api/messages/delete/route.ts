import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({ error: 'Требуется messageId' }, { status: 400 })
    }

    // Check if the user is the owner of the message
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    })

    if (!message) {
      return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 })
    }

    if (message.senderId !== authUser.userId) {
      return NextResponse.json({ error: 'Нет прав для удаления этого сообщения' }, { status: 403 })
    }

    // Delete the message
    await prisma.message.delete({
      where: { id: messageId }
    })

    return NextResponse.json({ success: true, message: 'Сообщение удалено' })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}