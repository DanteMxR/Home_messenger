import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, signJWT } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('Socket token request received')
    const authUser = await getAuthUser()
    
    console.log('Auth user from cookies:', authUser)
    
    if (!authUser) {
      console.log('No authenticated user found')
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    // Generate a temporary JWT token for Socket.IO with shorter expiration
    const socketToken = signJWT({
      userId: authUser.userId,
      username: authUser.username,
    })

    console.log('Generated socket token for user:', authUser.username)
    return NextResponse.json({ token: socketToken })
  } catch (error) {
    console.error('Socket token error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}