"use client";

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { Copy, CheckCircle, AlertCircle, User, Bot, Code, Image, FileText } from 'lucide-react';
import { ChatMessage as ChatMessageType, ChatAttachment } from '@/hooks/use-chat-state';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
  message: ChatMessageType;
  showTimestamp?: boolean;
  className?: string;
}

export function ChatMessage({ message, showTimestamp = true, className }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleImageError = (attachmentId: string) => {
    setImageError(prev => ({ ...prev, [attachmentId]: true }));
  };

  const renderAttachment = (attachment: ChatAttachment) => {
    switch (attachment.type) {
      case 'image':
        return (
          <div key={attachment.id} className="mt-2">
            {!imageError[attachment.id] ? (
              <img
                src={attachment.url || attachment.content}
                alt={attachment.name}
                className="max-w-sm rounded-lg border"
                onError={() => handleImageError(attachment.id)}
              />
            ) : (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted">
                <Image size={16} />
                <span className="text-sm text-muted-foreground">{attachment.name}</span>
              </div>
            )}
          </div>
        );
      
      case 'code':
        return (
          <div key={attachment.id} className="mt-2">
            <div className="flex items-center justify-between bg-muted px-3 py-2 rounded-t-lg">
              <div className="flex items-center gap-2">
                <Code size={16} />
                <span className="text-sm font-medium">{attachment.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(attachment.content || '')}
                className="h-auto p-1"
              >
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              </Button>
            </div>
            <SyntaxHighlighter
              language="javascript"
              style={oneDark}
              className="!mt-0 !rounded-t-none"
              customStyle={{ margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
            >
              {attachment.content || ''}
            </SyntaxHighlighter>
          </div>
        );
      
      case 'file':
        return (
          <div key={attachment.id} className="mt-2">
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted hover:bg-muted/80 cursor-pointer">
              <FileText size={16} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{attachment.name}</div>
                {attachment.size && (
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderMessageContent = (content: string) => {
    // Check if content contains code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.slice(lastIndex, match.index)}
          </span>
        );
      }

      // Add code block
      const language = match[1] || 'text';
      const code = match[2].trim();
      
      parts.push(
        <div key={`code-${match.index}`} className="my-3">
          <div className="flex items-center justify-between bg-muted px-3 py-2 rounded-t-lg">
            <span className="text-sm font-medium text-muted-foreground">{language}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(code)}
              className="h-auto p-1"
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
            </Button>
          </div>
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            className="!mt-0 !rounded-t-none"
            customStyle={{ margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : content;
  };

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isError = !!message.error;

  return (
    <div
      className={cn(
        "flex gap-3 p-4 group",
        isUser && "flex-row-reverse",
        className
      )}
    >
      {/* Avatar */}
      <Avatar className={cn("w-8 h-8 shrink-0", isUser && "order-2")}>
        <AvatarFallback className={cn(
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
          isSystem && "bg-blue-100 text-blue-700",
          isError && "bg-destructive text-destructive-foreground"
        )}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn("flex-1 min-w-0", isUser && "order-1")}>
        {/* Message Header */}
        <div className={cn(
          "flex items-center gap-2 mb-1",
          isUser && "justify-end"
        )}>
          <div className={cn(
            "flex items-center gap-2",
            isUser && "flex-row-reverse"
          )}>
            {/* Agent name for assistant messages */}
            {!isUser && message.agentName && (
              <Badge variant="secondary" className="text-xs">
                {message.agentName}
              </Badge>
            )}
            
            {/* Status indicators */}
            {message.isTyping && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" />
                </div>
                <span>typing...</span>
              </div>
            )}
            
            {isError && (
              <AlertCircle size={14} className="text-destructive" />
            )}
            
            {/* Timestamp */}
            {showTimestamp && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
              </span>
            )}
          </div>
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            "relative max-w-[80%] p-3 rounded-lg",
            isUser
              ? "bg-primary text-primary-foreground ml-auto"
              : "bg-muted",
            isSystem && "bg-blue-50 border border-blue-200 text-blue-800",
            isError && "bg-destructive/10 border border-destructive/20 text-destructive-foreground"
          )}
        >
          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0",
              isUser && "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            )}
            onClick={() => handleCopy(message.content)}
          >
            {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
          </Button>

          {/* Message text */}
          <div className={cn(
            "pr-8 whitespace-pre-wrap",
            "prose prose-sm max-w-none",
            isUser && "prose-invert"
          )}>
            {renderMessageContent(message.content)}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map(renderAttachment)}
            </div>
          )}

          {/* Metadata for assistant messages */}
          {!isUser && message.metadata && (
            <div className="mt-2 pt-2 border-t border-border/20">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {message.metadata.duration && (
                  <span>{message.metadata.duration}ms</span>
                )}
                {message.metadata.tokenCount && (
                  <span>{message.metadata.tokenCount} tokens</span>
                )}
                {message.metadata.cached && (
                  <Badge variant="outline" className="text-xs">cached</Badge>
                )}
                {message.metadata.confidence && (
                  <span>{Math.round(message.metadata.confidence * 100)}% confident</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
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