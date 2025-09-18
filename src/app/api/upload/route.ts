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
    const file = formData.get('file') as File | null
    const receiverId = formData.get('receiverId') as string | null
    const chatId = formData.get('chatId') as string | null
    const messageContent = formData.get('content') as string || ''

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    if (!receiverId && !chatId) {
      return NextResponse.json({ error: 'Требуется receiverId или chatId' }, { status: 400 })
    }

    // Generate a unique filename
    const fileExtension = file.name ? path.extname(file.name) : ''
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`
    const filePath = path.join(process.cwd(), 'uploads', fileName)
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    // Save message with file reference to database
    const message = await prisma.message.create({
      data: {
        content: messageContent,
        senderId: authUser.userId,
        receiverId: receiverId || undefined,
        chatId: chatId || undefined,
        fileName: file.name || 'Без названия',
        fileUrl: `/api/uploads/${fileName}`,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}