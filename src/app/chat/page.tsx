'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ChatSidebar, 
  ChatHeader, 
  MessageList, 
  MessageInput, 
  UserProfile, 
  SettingsDialog,
  EmptyState,
  ClearConfirmDialog,
  DeleteConfirmDialog
} from '@/components/chat'
import { GroupChatDialog } from '@/components/chat/dialogs/GroupChatDialog'
import { useChat, useMessages, useSettings, useClipboardImage, useMobile } from '@/hooks'
import { User, ChatUser, GroupChat, Task } from '@/types'
import { ChatService } from '@/services'
import { CallProvider } from '@/components/call/CallProvider'
import { Button } from '@/components/ui/button'
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams ? searchParams.get('taskId') : null;
  
  const { user, logout, isConnected } = useAuth()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [task, setTask] = useState<Task | null>(null);
  const { isMobile } = useMobile()
  
  // Fetch task if taskId is present
  useEffect(() => {
    const fetchTask = async () => {
      if (taskId) {
        try {
          const response = await fetch(`/api/tasks/${taskId}`);
          if (response.ok) {
            const taskData = await response.json();
            setTask(taskData.task);
          }
        } catch (error) {
          console.error('Error fetching task:', error);
        }
      }
    };
    
    fetchTask();
  }, [taskId]);

  // Custom hooks for managing different aspects of the chat
  const {
    users,
    selectedUser,
    searchTerm,
    setSelectedUser,
    setSearchTerm,
    fetchChats,
    markMessagesAsRead
  } = useChat()

  const {
    messages,
    sendMessage,
    sendFileMessage,
    sendAudioMessage,
    clearMessages,
    isUploading,
    refreshMessages,
    deleteMessage,
    editMessage
  } = useMessages(selectedUser)

  const {
    settings,
    showSettings,
    isUploadingAvatar,
    avatarPreview,
    setShowSettings,
    handleSettingsChange,
    saveSettings,
    uploadAvatar,
    removeAvatar
  } = useSettings()

  const {
    clipboardImage,
    inputRef,
    cancelClipboardImage,
    confirmClipboardImage
  } = useClipboardImage((file, url) => {
    // Handle pasted image
    console.log('Image pasted:', file.name)
  })

  // Mark messages as read when selecting a user
  useEffect(() => {
    if (selectedUser) {
      markMessagesAsRead(selectedUser.id)
    }
  }, [selectedUser, markMessagesAsRead])

  // Socket listeners for user status updates
  useEffect(() => {
    // This is now handled by the useChat hook
    // Additional global socket listeners can be added here if needed
  }, [])

  const handleSendMessage = () => {
    if (messageText.trim()) {
      sendMessage(messageText)
      setMessageText('')
    }
  }

  const handleSendClipboardImage = () => {
    if (clipboardImage) {
      sendFileMessage(clipboardImage.file)
      confirmClipboardImage()
    }
  }

  const handleClearMessages = async () => {
    await clearMessages()
    setShowClearConfirm(false)
  }

  const handleDeleteChat = async () => {
    if (!selectedUser) return

    const isGroupChat = 'isGroup' in selectedUser && (selectedUser as GroupChat).isGroup
    let success: boolean

    if (isGroupChat) {
      success = await ChatService.deleteGroupChat(selectedUser.id)
    } else {
      success = await ChatService.deleteDirectChat(selectedUser.id)
    }

    if (success) {
      setSelectedUser(null)
      setShowDeleteConfirm(false)
      await fetchChats()
    }
  }

  const handleCreateGroup = async (name: string, userIds: string[]) => {
    setCreatingGroup(true);
    try {
      const response = await fetch('/api/group-chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, userIds: [...userIds, user!.id] }), // Add current user to the group
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Group created successfully:', result);
        setShowGroupDialog(false);
        await fetchChats(); // Refresh the chat list
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка при создании группы');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Ошибка при создании группы');
    } finally {
      setCreatingGroup(false);
    }
  }

  const handleUserSelect = (user: User | GroupChat) => {
    if (selectedUser && selectedUser.id === user.id) {
      // If selecting the same user/group, just refresh messages
      refreshMessages();
    } else {
      // If selecting a different user/group, update the selected user
      setSelectedUser(user);
    }
    
    // Close sidebar on mobile after selecting a user
    if (isMobile) {
      setSidebarOpen(false);
    }
  }

  if (!user) {
    return null // This should be handled by the auth context
  }

  return (
    <CallProvider>
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`${
          isMobile 
            ? `fixed inset-y-0 left-0 z-50 w-80 bg-card border-r border-border flex flex-col flex-shrink-0 transform transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : `${sidebarCollapsed ? 'w-16' : 'w-80'} bg-card border-r border-border flex flex-col flex-shrink-0 transition-all duration-300`
        }`}
      >
        {/* Chat Sidebar with User Profile as children */}
        <ChatSidebar
          users={users}
          selectedUser={selectedUser}
          searchTerm={searchTerm}
          onUserSelect={handleUserSelect}
          onSearchChange={setSearchTerm}
          isConnected={isConnected}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
          onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isCollapsed={sidebarCollapsed}
          onOpenGroupDialog={() => setShowGroupDialog(true)}
          currentUser={user}
        >
          <UserProfile
            user={user}
            onSettingsClick={() => {
              setShowSettings(true)
              if (isMobile) setSidebarOpen(false)
            }}
            onLogout={() => {
              logout()
              if (isMobile) setSidebarOpen(false)
            }}
          />
        </ChatSidebar>
      </div>

      {/* Main Chat Area */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Mobile header with menu button */}
        {isMobile && !selectedUser && (
          <div className="p-4 border-b border-border flex items-center">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="mr-2"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold">Мессенджер</h1>
          </div>
        )}

        {selectedUser ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Chat Header */}
            <ChatHeader
              selectedUser={selectedUser}
              onClearMessages={() => setShowClearConfirm(true)}
              onDeleteChat={() => setShowDeleteConfirm(true)}
              onBack={() => {
                setSelectedUser(null)
                if (isMobile) setSidebarOpen(true)
              }}
              isMobile={isMobile}
              isGroupOwner={
                'isGroup' in selectedUser && (selectedUser as GroupChat).isGroup
                  ? (selectedUser as GroupChat).creatorId === user.id
                  : false
              }
            />

            <div className="chat-pattern flex min-h-0 flex-1 flex-col">
              {/* Messages */}
              <MessageList
                messages={messages}
                currentUser={user}
                onDeleteMessage={deleteMessage}
                onEditMessage={editMessage}
              />

              {/* Message Input */}
              <div ref={inputRef}>
                <MessageInput
                  messageText={messageText}
                  onMessageChange={setMessageText}
                  onSendMessage={handleSendMessage}
                  onFileSelect={sendFileMessage}
                  onSendAudio={sendAudioMessage}
                  clipboardImage={clipboardImage}
                  onSendClipboardImage={handleSendClipboardImage}
                  onCancelClipboardImage={cancelClipboardImage}
                  isUploading={isUploading}
                />
              </div>
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        user={user}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onSave={saveSettings}
        onAvatarUpload={uploadAvatar}
        onAvatarRemove={removeAvatar}
        isUploadingAvatar={isUploadingAvatar}
        avatarPreview={avatarPreview}
      />

      {/* Clear Confirmation Dialog */}
      <ClearConfirmDialog
        show={showClearConfirm}
        username={selectedUser?.username || ''}
        onConfirm={handleClearMessages}
        onCancel={() => setShowClearConfirm(false)}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        show={showDeleteConfirm}
        chatName={
          selectedUser
            ? ('isGroup' in selectedUser && (selectedUser as GroupChat).isGroup
                ? (selectedUser as GroupChat).name
                : (selectedUser as User).username)
            : ''
        }
        isGroup={!!(selectedUser && 'isGroup' in selectedUser && (selectedUser as GroupChat).isGroup)}
        isOwner={
          !!(selectedUser && 'isGroup' in selectedUser && (selectedUser as GroupChat).isGroup
            && (selectedUser as GroupChat).creatorId === user.id)
        }
        onConfirm={handleDeleteChat}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Group Chat Dialog */}
      <GroupChatDialog
        open={showGroupDialog}
        onOpenChange={setShowGroupDialog}
        users={users.filter((chat): chat is ChatUser => {
          // Type guard to check if chat is a ChatUser (not a GroupChat)
          return !('isGroup' in chat);
        }).map(({ id, username, avatar, isOnline, lastSeen, createdAt }) => ({
          id,
          username,
          avatar,
          isOnline,
          lastSeen,
          createdAt,
        }))} // Only show direct chats/users, not groups
        onCreateGroup={handleCreateGroup}
        isLoading={creatingGroup}
      />
    </div>
    </CallProvider>
  )
}
