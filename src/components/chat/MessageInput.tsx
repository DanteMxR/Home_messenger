// Message input component with file upload and emoji picker
import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Paperclip, Send, Smile, X } from 'lucide-react'
import { ClipboardImagePreview } from '@/types'
import { AudioRecorder } from './AudioRecorder'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface MessageInputProps {
  messageText: string
  onMessageChange: (text: string) => void
  onSendMessage: () => void
  onFileSelect: (file: File) => void
  onSendAudio: (blob: Blob, duration: number) => void
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
  onSendAudio,
  clipboardImage,
  onSendClipboardImage,
  onCancelClipboardImage,
  isUploading,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const getThemeState = () => {
      if (root.classList.contains('dark')) return true
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    setIsDarkTheme(getThemeState())

    const observer = new MutationObserver(() => {
      setIsDarkTheme(getThemeState())
    })

    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current && !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showEmojiPicker])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage()
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      onFileSelect(files[0])
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

  const canSend = !!messageText.trim() && !isUploading && !clipboardImage
  const controlsDisabled = disabled || isUploading || !!clipboardImage

  return (
    <div className="relative flex-shrink-0 bg-transparent px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
      {/* Clipboard image preview */}
      {clipboardImage && (
        <div className="mx-auto mb-3 w-full max-w-5xl rounded-3xl border border-white/20 bg-background/85 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-card/80">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Предварительный просмотр изображения</span>
            <Button size="icon" variant="ghost" onClick={onCancelClipboardImage} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <img
              src={clipboardImage.url}
              alt="Clipboard preview"
              className="max-h-32 max-w-full rounded object-contain"
            />
            <div className="flex flex-col space-y-2">
              <Button size="sm" onClick={onSendClipboardImage} disabled={isUploading}>
                Отправить
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelClipboardImage}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl">
        <div className="relative rounded-full p-[1px] shadow-[0_12px_38px_-20px_rgba(15,23,42,0.65)]">
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-white/18 via-slate-200/8 to-white/18 opacity-80 blur-[1.5px]" />
          <div className="relative flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Input
              placeholder="Введите сообщение..."
              value={messageText}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-11 flex-1 rounded-full border-0 bg-transparent pl-4 pr-2 shadow-none focus-visible:border-transparent focus-visible:ring-0"
              disabled={controlsDisabled}
            />

            <div className="relative flex items-center gap-1 pr-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                disabled={controlsDisabled}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={triggerFileSelect}
                disabled={controlsDisabled}
                className="size-9 rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground dark:hover:bg-white/8"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <div ref={emojiButtonRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={controlsDisabled}
                  className="size-9 rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground dark:hover:bg-white/8"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
              {messageText.trim() ? (
                <Button
                  onClick={onSendMessage}
                  disabled={!canSend || disabled}
                  className="size-9 rounded-full border border-border bg-secondary p-0 text-secondary-foreground shadow-md hover:bg-secondary/80"
                >
                  <Send className="h-4 w-4" />
                </Button>
              ) : (
                <AudioRecorder onSend={onSendAudio} disabled={controlsDisabled} />
              )}

              {/* Emoji picker */}
              {showEmojiPicker && (
                <>
                  {/* Mobile backdrop */}
                  <div className="fixed inset-0 z-20 md:hidden" onClick={() => setShowEmojiPicker(false)} />
                  <div
                    ref={emojiPickerRef}
                    className="fixed bottom-20 left-0 right-0 z-30 flex justify-center px-2 md:absolute md:bottom-full md:right-10 md:left-auto md:z-10 md:mb-2 md:block md:px-0"
                  >
                    <Picker
                      data={data}
                      onEmojiSelect={addEmoji}
                      theme={isDarkTheme ? 'dark' : 'light'}
                      perLine={8}
                      emojiSize={24}
                      emojiButtonSize={32}
                      navPosition="bottom"
                      previewPosition="none"
                      skinTonePosition="none"
                      maxFrequentRows={0}
                      categories={['people', 'nature', 'foods', 'activity', 'places', 'objects', 'symbols']}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {isUploading && (
        <p className="mx-auto mt-2 w-full max-w-5xl px-1 text-sm text-muted-foreground">Загрузка файла...</p>
      )}
    </div>
  )
}
