// Message input component with file upload and emoji picker
import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Paperclip, Send, Smile } from 'lucide-react'
import { ClipboardImagePreview } from '@/types'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface MessageInputProps {
  messageText: string
  onMessageChange: (text: string) => void
  onSendMessage: () => void
  onFileSelect: (file: File) => void
  clipboardImage: ClipboardImagePreview | null
  onSendClipboardImage: () => void
  onCancelClipboardImage: () => void
  isUploading: boolean
  disabled?: boolean
}

export const MessageInput: React.FC<MessageInputProps> = ({
  messageText,
  onMessageChange,
  onSendMessage,
  onFileSelect,
  clipboardImage,
  onSendClipboardImage,
  onCancelClipboardImage,
  isUploading,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage()
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      onFileSelect(files[0])
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const addEmoji = (emoji: { native: string }) => {
    onMessageChange(messageText + emoji.native)
  }

  const canSend = messageText.trim() && !isUploading && !clipboardImage

  return (
    <div className="bg-card border-t border-border p-4 flex-shrink-0 relative">
      {/* Clipboard image preview */}
      {clipboardImage && (
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">Предварительный просмотр изображения</span>
            <div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onCancelClipboardImage}
                className="mr-2"
              >
                Отмена
              </Button>
              <Button 
                size="sm" 
                onClick={onSendClipboardImage}
                disabled={isUploading}
              >
                Отправить
              </Button>
            </div>
          </div>
          <img 
            src={clipboardImage.url} 
            alt="Clipboard preview" 
            className="max-h-32 max-w-full rounded object-contain"
          />
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Введите сообщение..."
          value={messageText}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
          disabled={disabled || isUploading || !!clipboardImage}
        />
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading || !!clipboardImage}
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={triggerFileSelect}
            disabled={disabled || isUploading || !!clipboardImage}
            className="flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex-shrink-0"
          >
            <Smile className="h-4 w-4" />
          </Button>
          <Button 
            onClick={onSendMessage} 
            disabled={!canSend || disabled} 
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full right-0 mb-2 z-10 emoji-picker-container">
          <div>
            <Picker 
              data={data} 
              onEmojiSelect={addEmoji} 
              theme="light"
              perLine={8}
              emojiSize={24}
              emojiButtonSize={32}
              navPosition="bottom"
              previewPosition="none"
              skinTonePosition="none"
            />
          </div>
        </div>
      )}
      
      {isUploading && (
        <p className="text-sm text-muted-foreground mt-2">Загрузка файла...</p>
      )}
    </div>
  )
}