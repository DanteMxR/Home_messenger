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
    const search = searchParams.get('search') || ''

    // Get all users except the current user
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: authUser.userId } },
          search ? {
            username: { contains: search }
          } : {}
        ]
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
      },
      orderBy: [
        { isOnline: 'desc' },
        { lastSeen: 'desc' },
      ],
      take: 20,
    })

    // Get last messages for each user using a more reliable approach
    const lastMessagesPromises = users.map(async (user) => {
      const lastMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: authUser.userId, receiverId: user.id },
            { senderId: user.id, receiverId: authUser.userId },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          content: true,
          senderId: true,
          receiverId: true,
          createdAt: true,
          fileName: true,
          fileType: true,
        },
      })
      
      return {
        userId: user.id,
        lastMessage,
      }
    })

    const lastMessagesResults = await Promise.all(lastMessagesPromises)
    const lastMessagesMap = Object.fromEntries(
      lastMessagesResults
        .filter(result => result.lastMessage !== null)
        .map(result => [result.userId, result.lastMessage])
    )

    // Get unread message counts for each user
    const unreadCounts = await prisma.message.groupBy({
      by: ['senderId'],
      where: {
        receiverId: authUser.userId,
        isRead: false,
      },
      _count: {
        id: true,
      },
    })

    const unreadCountsMap = Object.fromEntries(
      unreadCounts.map(count => [count.senderId, count._count.id])
    )

    // Combine user data with last messages and unread counts
    const chats = users.map(user => {
      const lastMessage = lastMessagesMap[user.id] || null
      const unreadCount = unreadCountsMap[user.id] || 0

      return {
        ...user,
        lastMessage,
        unreadCount,
      }
    })

    return NextResponse.json({ chats })
  } catch (error) {
    console.error('Get chats error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}