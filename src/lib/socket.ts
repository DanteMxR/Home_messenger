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
      socket.on('message:send', async (data, callback) => {
        try {
          if (!socket.userId) {
            if (callback) callback({ error: 'User not authenticated' });
            return;
          }

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
          
          // Send acknowledgment back to sender
          if (callback) callback({ success: true, message });
        } catch (error) {
          console.error('Error sending message:', error)
          if (callback) callback({ error: 'Не удалось отправить сообщение' });
          socket.emit('error', { message: 'Не удалось отправить сообщение' })
        }
      })

      // Handle sending file messages
      socket.on('file:send', async (data, callback) => {
        try {
          if (!socket.userId) {
            if (callback) callback({ error: 'User not authenticated' });
            return;
          }

          const { content, receiverId, chatId, fileName, fileUrl, fileType, fileSize, audioDuration } = data

          // Save message with file to database
          const message = await prisma.message.create({
            data: {
              content: content || '',
              senderId: socket.userId,
              receiverId,
              chatId,
              fileName,
              fileUrl,
              fileType,
              fileSize,
              audioDuration: audioDuration || null,
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
            // Also send to sender so they see it immediately
            io.to(`user:${socket.userId}`).emit('message:receive', message)
          }
          
          // Send acknowledgment back to sender
          if (callback) callback({ success: true, message });
        } catch (error) {
          console.error('Error sending file message:', error)
          if (callback) callback({ error: 'Не удалось отправить файл' });
          socket.emit('error', { message: 'Не удалось отправить файл' })
        }
      })

      // Handle marking messages as read
      socket.on('messages:mark-as-read', async (data) => {
        try {
          if (!socket.userId) return

          const { senderId } = data

          // Mark all messages from this sender as read
          await prisma.message.updateMany({
            where: {
              senderId: senderId,
              receiverId: socket.userId,
              isRead: false,
            },
            data: {
              isRead: true,
            },
          })

          // Notify the sender that their messages have been read
          io.to(`user:${senderId}`).emit('messages:read', {
            readerId: socket.userId,
            readerName: socket.username
          })
        } catch (error) {
          console.error('Error marking messages as read:', error)
          socket.emit('error', { message: 'Не удалось отметить сообщения как прочитанные' })
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

      // ===== Call signaling events =====

      // Initiate a call
      socket.on('call:initiate', async (data) => {
        if (!socket.userId) return
        const { callId, targetId, chatId, type, isGroup } = data

        // Get caller info
        const caller = await prisma.user.findUnique({
          where: { id: socket.userId },
          select: { id: true, username: true, avatar: true }
        })
        if (!caller) return

        const payload = {
          callId,
          callerId: socket.userId,
          callerUsername: caller.username,
          callerAvatar: caller.avatar,
          type,
          isGroup: !!isGroup,
          chatId,
        }

        if (isGroup && chatId) {
          // Group call: notify all members in the chat room
          socket.to(`chat:${chatId}`).emit('call:incoming', payload)
        } else if (targetId) {
          // Direct call: notify target user
          io.to(`user:${targetId}`).emit('call:incoming', payload)
        }
      })

      // Accept a call
      socket.on('call:accept', (data) => {
        if (!socket.userId) return
        const { callId, type } = data

        // Notify all participants that call was accepted
        socket.broadcast.emit('call:accepted', {
          callId,
          userId: socket.userId,
          type,
        })
      })

      // Decline a call
      socket.on('call:decline', (data) => {
        if (!socket.userId) return
        socket.broadcast.emit('call:declined', {
          callId: data.callId,
          userId: socket.userId,
        })
      })

      // End a call
      socket.on('call:end', (data) => {
        if (!socket.userId) return
        socket.broadcast.emit('call:ended', {
          callId: data.callId,
          userId: socket.userId,
        })
      })

      // WebRTC SDP offer
      socket.on('call:offer', (data) => {
        if (!socket.userId) return
        const { callId, sdp, targetUserId } = data
        io.to(`user:${targetUserId}`).emit('call:offer', {
          callId,
          sdp,
          fromUserId: socket.userId,
        })
      })

      // WebRTC SDP answer
      socket.on('call:answer', (data) => {
        if (!socket.userId) return
        const { callId, sdp, targetUserId } = data
        io.to(`user:${targetUserId}`).emit('call:answer', {
          callId,
          sdp,
          fromUserId: socket.userId,
        })
      })

      // WebRTC ICE candidate
      socket.on('call:ice-candidate', (data) => {
        if (!socket.userId) return
        const { callId, candidate, targetUserId } = data
        io.to(`user:${targetUserId}`).emit('call:ice-candidate', {
          callId,
          candidate,
          fromUserId: socket.userId,
        })
      })

      // Toggle media notification
      socket.on('call:toggle-media', (data) => {
        if (!socket.userId) return
        socket.broadcast.emit('call:media-toggled', {
          callId: data.callId,
          userId: socket.userId,
          mediaType: data.mediaType,
          enabled: data.enabled,
        })
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