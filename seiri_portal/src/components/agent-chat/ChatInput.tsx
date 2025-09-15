"use client";

import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { 
  Send, 
  Paperclip, 
  Image, 
  Code, 
  X, 
  Loader2,
  Smile,
  Mic,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChatAttachment } from '@/hooks/use-chat-state';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  value: string;
  attachments: ChatAttachment[];
  onValueChange: (value: string) => void;
  onSend: (message: string, attachments?: ChatAttachment[]) => Promise<void>;
  onAddAttachment: (attachment: ChatAttachment) => void;
  onRemoveAttachment: (id: string) => void;
  onClearAttachments: () => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function ChatInput({
  value,
  attachments,
  onValueChange,
  onSend,
  onAddAttachment,
  onRemoveAttachment,
  onClearAttachments,
  disabled = false,
  loading = false,
  placeholder = "Type your message...",
  maxLength = 4000,
  className
}: ChatInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    if (!value.trim() && attachments.length === 0) return;
    if (loading || disabled) return;

    try {
      await onSend(value, attachments);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [value, attachments, onSend, loading, disabled]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleFileUpload = useCallback((type: 'file' | 'image') => {
    const input = type === 'image' ? imageInputRef.current : fileInputRef.current;
    if (input) {
      input.click();
    }
    setAttachmentMenuOpen(false);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        
        const attachment: ChatAttachment = {
          id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type,
          name: file.name,
          content,
          mimeType: file.type,
          size: file.size,
          url: type === 'image' ? content : undefined
        };

        onAddAttachment(attachment);
      };

      if (type === 'image') {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });

    // Reset input
    e.target.value = '';
  }, [onAddAttachment]);

  const handleCodeSnippet = useCallback(() => {
    const codeContent = `// Your code here
function example() {
  return "Hello, World!";
}`;

    const attachment: ChatAttachment = {
      id: `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'code',
      name: 'code-snippet.js',
      content: codeContent
    };

    onAddAttachment(attachment);
    setAttachmentMenuOpen(false);
  }, [onAddAttachment]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  React.useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  const canSend = (value.trim() || attachments.length > 0) && !loading && !disabled;
  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className={cn("border-t bg-background", className)}>
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Attachments ({attachments.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAttachments}
              className="h-auto p-1 text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 bg-muted rounded-lg p-2 pr-1"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {attachment.type === 'image' && <Image size={14} />}
                  {attachment.type === 'code' && <Code size={14} />}
                  {attachment.type === 'file' && <Paperclip size={14} />}
                  
                  <span className="text-sm truncate max-w-[120px]">
                    {attachment.name}
                  </span>
                  
                  {attachment.size && (
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(attachment.size)})
                    </span>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="h-auto w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3">
        <div className="flex gap-2">
          {/* Attachment Menu */}
          <Popover open={attachmentMenuOpen} onOpenChange={setAttachmentMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-9 w-9 p-0"
                disabled={disabled}
              >
                <Paperclip size={16} />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-48 p-2">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleFileUpload('image')}
                >
                  <Image size={16} className="mr-2" />
                  Upload Image
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleFileUpload('file')}
                >
                  <Paperclip size={16} className="mr-2" />
                  Upload File
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleCodeSnippet}
                >
                  <Code size={16} className="mr-2" />
                  Code Snippet
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Text Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "min-h-9 max-h-[120px] resize-none border-0 shadow-none focus-visible:ring-0 p-2",
                "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
                isOverLimit && "text-destructive"
              )}
              maxLength={maxLength}
            />
            
            {/* Character Counter */}
            {(isNearLimit || isOverLimit) && (
              <div className={cn(
                "absolute bottom-1 right-2 text-xs",
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              )}>
                {characterCount}/{maxLength}
              </div>
            )}
          </div>

          {/* Voice Recording Button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "shrink-0 h-9 w-9 p-0",
              isRecording && "text-destructive bg-destructive/10"
            )}
            disabled={disabled}
            onMouseDown={() => setIsRecording(true)}
            onMouseUp={() => setIsRecording(false)}
            onMouseLeave={() => setIsRecording(false)}
          >
            {isRecording ? <Square size={16} /> : <Mic size={16} />}
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!canSend || isOverLimit}
            size="sm"
            className="shrink-0 h-9 w-9 p-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {loading && (
            <div className="flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              <span>Sending...</span>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.js,.ts,.json,.xml,.csv"
        multiple
        onChange={(e) => handleFileChange(e, 'file')}
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        multiple
        onChange={(e) => handleFileChange(e, 'image')}
      />
    </div>
  );
}

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}