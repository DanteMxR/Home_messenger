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
import { useChat, useMessages, useSettings, useClipboardImage } from '@/hooks'
import { User } from '@/types'

export default function ChatPage() {
  const { user, logout, isConnected } = useAuth()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [messageText, setMessageText] = useState('')

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
    isUploading
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

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
  }

  if (!user) {
    return null // This should be handled by the auth context
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-card border-r border-border flex flex-col flex-shrink-0">
        {/* Chat Sidebar with User Profile as children */}
        <ChatSidebar
          users={users}
          selectedUser={selectedUser}
          searchTerm={searchTerm}
          onUserSelect={handleUserSelect}
          onSearchChange={setSearchTerm}
          isConnected={isConnected}
        >
          <UserProfile
            user={user}
            onSettingsClick={() => setShowSettings(true)}
            onLogout={logout}
          />
        </ChatSidebar>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <ChatHeader
              selectedUser={selectedUser}
              onClearMessages={() => setShowClearConfirm(true)}
            />

            {/* Messages */}
            <MessageList
              messages={messages}
              currentUser={user}
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
    </div>
  )
}
