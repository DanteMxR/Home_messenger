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
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Требуется userId' }, { status: 400 })
    }

    // Delete messages between the authenticated user and the specified user
    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: authUser.userId, receiverId: userId },
          { senderId: userId, receiverId: authUser.userId },
        ],
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Clear messages error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}