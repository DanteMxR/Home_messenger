// Message list component for displaying chat messages
import React, { useEffect, useRef, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { File, Download, Edit, Trash2, Check, X } from 'lucide-react'
import { Message, User } from '@/types'
import { formatTime, formatFileSize, isImageFile } from '@/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MessageListProps {
  messages: Message[]
  currentUser: User
  onDeleteMessage?: (messageId: string) => Promise<boolean>
  onEditMessage?: (messageId: string, content: string) => Promise<boolean>
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  onDeleteMessage,
  onEditMessage
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>('')
  const [contextMenuMessageId, setContextMenuMessageId] = useState<string | null>(null)

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuMessageId) {
        // Check if click is outside the context menu
        const contextMenu = document.querySelector('.message-context-menu');
        if (contextMenu && !contextMenu.contains(event.target as Node)) {
          setContextMenuMessageId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenuMessageId]);

  const handleDeleteMessage = async (messageId: string) => {
    if (onDeleteMessage) {
      await onDeleteMessage(messageId)
    }
    setContextMenuMessageId(null)
  }

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id)
    setEditContent(message.content)
    setContextMenuMessageId(null)
  }

  const saveEdit = async () => {
    if (editingMessageId && onEditMessage) {
      await onEditMessage(editingMessageId, editContent)
      setEditingMessageId(null)
      setEditContent('')
    }
  }

  const cancelEdit = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  const handleClick = (message: Message) => {
    // Only allow click on own messages
    if (message.senderId === currentUser?.id) {
      setContextMenuMessageId(message.id)
    }
  }

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full p-4">
        <div className="space-y-4 max-w-full">
          {messages.map((message) => (
            <div
              key={`${message.id}-${message.createdAt}`}
              className={`flex ${
                message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative cursor-pointer hover:opacity-90 ${
                  message.senderId === currentUser?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                } ${message.fileName && message.fileUrl && isImageFile(message.fileType) ? '!max-w-full' : ''}`}
                onClick={(e) => {
                  // Prevent click event when clicking on links or buttons inside the message
                  if (e.target instanceof HTMLElement && 
                      (e.target.tagName === 'A' || e.target.tagName === 'BUTTON')) {
                    return;
                  }
                  handleClick(message);
                }}
              >
                {/* Context menu for own messages on click */}
                {contextMenuMessageId === message.id && (
                  <div className="message-context-menu absolute top-0 right-0 mt-1 mr-1 z-10 bg-card border border-border rounded-md shadow-lg">
                    <div className="py-1">
                      <button
                        className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent text-foreground"
                        onClick={() => handleEditMessage(message)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Редактировать
                      </button>
                      <button
                        className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent text-red-600"
                        onClick={() => handleDeleteMessage(message.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить
                      </button>
                      <button
                        className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent text-foreground"
                        onClick={() => setContextMenuMessageId(null)}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}

                {/* File attachment */}
                {message.fileName && message.fileUrl ? (
                  <div className="mb-2">
                    {isImageFile(message.fileType) ? (
                      // Image preview
                      <div className="mb-2 flex justify-center">
                        <img 
                          src={message.fileUrl} 
                          alt={message.fileName} 
                          className="max-w-full max-h-64 rounded object-contain"
                        />
                      </div>
                    ) : (
                      // File attachment
                      <div className="flex items-center p-2 bg-accent rounded mb-2">
                        <File className="h-5 w-5 mr-2 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">{message.fileName}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(message.fileSize || 0)}</p>
                        </div>
                        <a href={message.fileUrl} download={message.fileName} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 text-muted-foreground hover:text-foreground flex-shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : null}
                
                {/* Text message or edit form */}
                {editingMessageId === message.id ? (
                  <div className="flex flex-col gap-2">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={saveEdit}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : message.content ? (
                  <p className="text-sm">{message.content}</p>
                ) : null}
                
                <p
                  className={`text-xs mt-1 ${
                    message.senderId === currentUser?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  )
}