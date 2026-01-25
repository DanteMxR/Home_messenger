'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ChatSidebar, 
  ChatHeader, 
  MessageList, 
  MessageInput, 
  UserProfile, 
  SettingsDialog,
  EmptyState,
  ClearConfirmDialog
} from '@/components/chat'
import { GroupChatDialog } from '@/components/chat/dialogs/GroupChatDialog'
import { useChat, useMessages, useSettings, useClipboardImage, useMobile } from '@/hooks'
import { User, ChatUser, GroupChat } from '@/types'
import { Button } from '@/components/ui/button'
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function ChatPage() {
  const { user, logout, isConnected } = useAuth()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const { isMobile } = useMobile()

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
      <div className={`flex-1 flex flex-col min-w-0 relative ${!isMobile && sidebarCollapsed ? 'ml-16' : ''}`}>
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
          <>
            {/* Chat Header */}
            <ChatHeader
              selectedUser={selectedUser}
              onClearMessages={() => setShowClearConfirm(true)}
              onBack={() => {
                setSelectedUser(null)
                if (isMobile) setSidebarOpen(true)
              }}
              isMobile={isMobile}
            />

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
                clipboardImage={clipboardImage}
                onSendClipboardImage={handleSendClipboardImage}
                onCancelClipboardImage={cancelClipboardImage}
                isUploading={isUploading}
              />
            </div>
          </>
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
  )
}