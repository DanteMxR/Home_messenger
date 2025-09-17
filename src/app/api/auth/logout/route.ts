import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, clearAuthCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    
    if (authUser) {
      // Update user status to offline
      await prisma.user.update({
        where: { id: authUser.userId },
        data: { 
          isOnline: false,
          lastSeen: new Date()
        }
      })
    }

    // Clear auth cookie
    await clearAuthCookie()

    return NextResponse.json({
      message: 'Выход выполнен успешно'
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}