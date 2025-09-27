// Message list component for displaying chat messages
import React, { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { File, Download } from 'lucide-react'
import { Message, User } from '@/types'
import { formatTime, formatFileSize, isImageFile } from '@/utils'

interface MessageListProps {
  messages: Message[]
  currentUser: User
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full p-4">
        <div className="space-y-4 max-w-full">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.senderId === currentUser?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                } ${message.fileName && message.fileUrl && isImageFile(message.fileType) ? '!max-w-full' : ''}`}
              >
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
                
                {/* Text message */}
                {message.content ? (
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