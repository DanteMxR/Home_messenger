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
        isAdmin: true,
        lastSeen: true,
      },
      orderBy: [
        { isOnline: 'desc' },
        { lastSeen: 'desc' },
      ],
      take: 20,
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}