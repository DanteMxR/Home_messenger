import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
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

    // Return file info only — message record is created by socket handler
    return NextResponse.json({
      fileUrl: `/api/uploads/${fileName}`,
      fileName: file.name || 'Без названия',
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}