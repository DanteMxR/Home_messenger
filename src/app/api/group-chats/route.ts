import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

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
    const unreadCounts = await prisma.message.groupBy({
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

    const unreadCountsMap = Object.fromEntries(
      unreadCounts.map(count => [count.chatId, count._count.id])
    );

    // Format the response
    const formattedChats = groupChats.map(chat => {
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
        unreadCount: unreadCountsMap[chat.id] || 0
      };
    });

    return NextResponse.json({ chats: formattedChats });
  } catch (error) {
    console.error('Get group chats error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { name, userIds }: { name: string; userIds: string[] } = await request.json();

    if (!name || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Имя группы и список пользователей обязательны' }, { status: 400 });
    }

    // Validate that all users exist
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true
      }
    });

    if (users.length !== userIds.length) {
      return NextResponse.json({ error: 'Один или несколько пользователей не найдены' }, { status: 400 });
    }

    // Check if user is trying to create a group with themselves only
    if (userIds.length === 1 && userIds[0] === authUser.userId) {
      return NextResponse.json({ error: 'Нельзя создать группу только с собой' }, { status: 400 });
    }

    // Create the group chat
    const groupChat = await prisma.$transaction(async (tx) => {
      // Create the chat
      const chat = await tx.chat.create({
        data: {
          name,
          isGroup: true
        }
      });

      // Add all users to the chat
      await tx.chatMember.createMany({
        data: userIds.map(userId => ({
          userId,
          chatId: chat.id,
          role: 'member'
        }))
      });

      return chat;
    });

    return NextResponse.json({ 
      success: true, 
      chat: {
        id: groupChat.id,
        name: groupChat.name || 'Без названия',
        isGroup: groupChat.isGroup,
        createdAt: groupChat.createdAt,
        updatedAt: groupChat.updatedAt
      } 
    });
  } catch (error) {
    console.error('Create group chat error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}