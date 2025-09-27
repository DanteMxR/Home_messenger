import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Файл аватара не найден' }, { status: 400 })
    }

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Файл должен быть изображением' }, { status: 400 })
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Размер файла не должен превышать 5MB' }, { status: 400 })
    }

    // Generate a unique filename for avatar
    const fileExtension = file.name ? path.extname(file.name) : '.jpg'
    const fileName = `avatar-${authUser.userId}-${Date.now()}${fileExtension}`
    const filePath = path.join(process.cwd(), 'uploads', fileName)
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    // Get current user to check for existing avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { avatar: true }
    })

    // Delete old avatar file if it exists
    if (currentUser?.avatar) {
      const oldAvatarPath = currentUser.avatar.replace('/api/uploads/', '')
      const oldFilePath = path.join(process.cwd(), 'uploads', oldAvatarPath)
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath)
        } catch (error) {
          console.error('Error deleting old avatar:', error)
        }
      }
    }

    // Save new avatar file to disk
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    // Update user avatar in database
    const updatedUser = await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        avatar: `/api/uploads/${fileName}`,
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      }
    })

    return NextResponse.json({ 
      message: 'Аватар успешно обновлен',
      user: updatedUser 
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Get current user to find avatar file
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { avatar: true }
    })

    // Delete avatar file if it exists
    if (currentUser?.avatar) {
      const avatarPath = currentUser.avatar.replace('/api/uploads/', '')
      const filePath = path.join(process.cwd(), 'uploads', avatarPath)
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath)
        } catch (error) {
          console.error('Error deleting avatar file:', error)
        }
      }
    }

    // Remove avatar from database
    const updatedUser = await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        avatar: null,
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      }
    })

    return NextResponse.json({ 
      message: 'Аватар успешно удален',
      user: updatedUser 
    })
  } catch (error) {
    console.error('Avatar delete error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}