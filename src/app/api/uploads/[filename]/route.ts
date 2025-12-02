import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    const filePath = path.join(process.cwd(), 'uploads', filename)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }
    
    // Read file
    const fileBuffer = fs.readFileSync(filePath)
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case '.png':
        contentType = 'image/png'
        break
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.pdf':
        contentType = 'application/pdf'
        break
      case '.txt':
        contentType = 'text/plain'
        break
      case '.doc':
        contentType = 'application/msword'
        break
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        break
    }
    
    // Get original filename from the stored filename (everything after the timestamp)
    const originalFilename = filename.substring(filename.indexOf('-') + 1)
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(originalFilename)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}