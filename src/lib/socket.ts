import { Server as NetServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { prisma } from './prisma'
import { verifyJWT } from './auth'

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer
    }
  }
}

interface AuthenticatedSocket extends Socket {
  userId?: string
  username?: string
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (res.socket.server.io) {
    console.log('Socket is already running')
  } else {
    console.log('Socket is initializing')
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })

    // Authentication middleware
    io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token
        
        if (!token) {
          console.log('Socket auth failed: No token provided')
          return next(new Error('No token provided'))
        }

        const payload = verifyJWT(token)
        
        if (!payload) {
          console.log('Socket auth failed: Invalid token')
          return next(new Error('Invalid token'))
        }

        socket.userId = payload.userId
        socket.username = payload.username
        console.log('Socket auth successful for user:', payload.username)
        next()
      } catch (error) {
        console.error('Socket auth error:', error)
        next(new Error('Authentication error'))
      }
    })

    io.on('connection', async (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.username} connected`)

      // Update user online status
      if (socket.userId) {
        await prisma.user.update({
          where: { id: socket.userId },
          data: { 
            isOnline: true,
            lastSeen: new Date()
          }
        })

        // Join user to their personal room
        socket.join(`user:${socket.userId}`)

        // Get user's chats and join chat rooms
        const userChats = await prisma.chatMember.findMany({
          where: { userId: socket.userId },
          include: { chat: true }
        })

        userChats.forEach(chatMember => {
          socket.join(`chat:${chatMember.chatId}`)
        })

        // Notify others about online status
        socket.broadcast.emit('user:online', {
          userId: socket.userId,
          username: socket.username
        })
      }

      // Handle sending messages
      socket.on('message:send', async (data) => {
        try {
          if (!socket.userId) return

          const { content, receiverId, chatId } = data

          // Save message to database
          const message = await prisma.message.create({
            data: {
              content,
              senderId: socket.userId,
              receiverId,
              chatId,
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

          // Send to appropriate room
          if (chatId) {
            // Group chat
            io.to(`chat:${chatId}`).emit('message:receive', message)
          } else if (receiverId) {
            // Direct message
            io.to(`user:${receiverId}`).emit('message:receive', message)
            io.to(`user:${socket.userId}`).emit('message:receive', message)
          }
        } catch (error) {
          console.error('Error sending message:', error)
          socket.emit('error', { message: 'Не удалось отправить сообщение' })
        }
      })

      // Handle joining chat rooms
      socket.on('chat:join', (chatId) => {
        socket.join(`chat:${chatId}`)
        console.log(`User ${socket.username} joined chat ${chatId}`)
      })

      // Handle leaving chat rooms
      socket.on('chat:leave', (chatId) => {
        socket.leave(`chat:${chatId}`)
        console.log(`User ${socket.username} left chat ${chatId}`)
      })

      // Handle typing indicators
      socket.on('typing:start', (data) => {
        const { chatId, receiverId } = data
        if (chatId) {
          socket.to(`chat:${chatId}`).emit('typing:start', {
            userId: socket.userId,
            username: socket.username
          })
        } else if (receiverId) {
          socket.to(`user:${receiverId}`).emit('typing:start', {
            userId: socket.userId,
            username: socket.username
          })
        }
      })

      socket.on('typing:stop', (data) => {
        const { chatId, receiverId } = data
        if (chatId) {
          socket.to(`chat:${chatId}`).emit('typing:stop', {
            userId: socket.userId,
            username: socket.username
          })
        } else if (receiverId) {
          socket.to(`user:${receiverId}`).emit('typing:stop', {
            userId: socket.userId,
            username: socket.username
          })
        }
      })

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`User ${socket.username} disconnected`)
        
        if (socket.userId) {
          // Update user offline status
          await prisma.user.update({
            where: { id: socket.userId },
            data: { 
              isOnline: false,
              lastSeen: new Date()
            }
          })

          // Notify others about offline status
          socket.broadcast.emit('user:offline', {
            userId: socket.userId,
            username: socket.username
          })
        }
      })
    })

    res.socket.server.io = io
  }
  res.end()
}

export default SocketHandler