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

    // Get all users except the current user (for direct chats)
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
    const directChats = users.map(user => {
      const lastMessage = lastMessagesMap[user.id] || null
      const unreadCount = unreadCountsMap[user.id] || 0

      return {
        ...user,
        lastMessage,
        unreadCount,
      }
    })

    // Get all group chats the user is a member of
    const groupChats = await prisma.chat.findMany({
      where: {
        isGroup: true,
        members: {
          some: {
            userId: authUser.userId
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                lastSeen: true
              }
            }
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          include: {
            sender: {
              select: {
                username: true
              }
            }
          }
        }
      }
    });

    // Get unread message counts for each group chat
    const groupChatIds = groupChats.map(chat => chat.id);
    const groupUnreadCounts = await prisma.message.groupBy({
      by: ['chatId'],
      where: {
        chatId: {
          in: groupChatIds
        },
        receiverId: null, // Group messages don't have a specific receiver
        isRead: false,
        NOT: {
          senderId: authUser.userId // Exclude messages sent by current user
        }
      },
      _count: {
        id: true
      }
    });

    const groupUnreadCountsMap = Object.fromEntries(
      groupUnreadCounts.map(count => [count.chatId, count._count.id])
    );

    // Format the group chats
    const formattedGroupChats = groupChats.map(chat => {
      const lastMessage = chat.messages.length > 0 ? {
        id: chat.messages[0].id,
        content: chat.messages[0].content,
        senderId: chat.messages[0].senderId,
        senderUsername: chat.messages[0].sender.username,
        createdAt: chat.messages[0].createdAt,
        fileName: chat.messages[0].fileName,
        fileType: chat.messages[0].fileType
      } : null;

      return {
        id: chat.id,
        name: chat.name || 'Без названия',
        isGroup: true,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        members: chat.members.map(member => member.user),
        lastMessage,
        unreadCount: groupUnreadCountsMap[chat.id] || 0
      };
    });

    // Combine direct chats and group chats
    const allChats = [...directChats, ...formattedGroupChats];

    return NextResponse.json({ chats: allChats });
  } catch (error) {
    console.error('Get chats error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}