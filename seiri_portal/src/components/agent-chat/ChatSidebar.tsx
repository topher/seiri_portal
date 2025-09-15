"use client";

import React, { useEffect, useRef, useState } from 'react';
import { 
  MessageSquare, 
  X, 
  Settings, 
  Trash2, 
  Plus, 
  ChevronDown, 
  Bot, 
  Zap,
  Clock,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAgentChat } from '@/hooks/use-agent-chat';
import { useChatStore } from '@/hooks/use-chat-state';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  contextNodeId?: string;
  contextNodeType?: string;
  contextNodeName?: string;
  className?: string;
}

export function ChatSidebar({
  contextNodeId,
  contextNodeType,
  contextNodeName,
  className
}: ChatSidebarProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Store state
  const { 
    isOpen, 
    settings, 
    updateSettings,
    conversations,
    currentConversationId,
    switchConversation,
    deleteConversation
  } = useChatStore();

  // Chat hook
  const {
    currentConversation,
    messages,
    isTyping,
    inputValue,
    attachments,
    availableAgents,
    selectedAgent,
    sendMessage,
    sendQuickAction,
    toggleSidebar,
    selectAgent,
    setInputValue,
    addAttachment,
    removeAttachment,
    clearInput,
    createNewConversation,
    loading,
    error,
    clearError
  } = useAgentChat({
    contextNodeId,
    contextNodeType,
    contextNodeName,
    autoDiscoverAgents: true,
    enableRealtime: true
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleSidebar();
      }
      
      // Escape to close sidebar
      if (e.key === 'Escape' && isOpen) {
        toggleSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleSidebar]);

  // Click outside to close (optional)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen && 
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target as Node) &&
        window.innerWidth < 1024 // Only on mobile/tablet
      ) {
        toggleSidebar();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, toggleSidebar]);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={toggleSidebar}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <MessageSquare size={24} />
        </Button>
      </div>
    );
  }

  const conversationsList = Object.values(conversations).sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={toggleSidebar}
      />
      
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed right-0 top-0 h-full bg-background border-l shadow-lg z-50",
          "flex flex-col transition-all duration-300 ease-in-out",
          isMinimized ? "w-16" : "w-96",
          "lg:relative lg:shadow-none",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          {!isMinimized && (
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-primary" />
              <div>
                <h2 className="font-semibold text-sm">AI Assistant</h2>
                {contextNodeType && (
                  <p className="text-xs text-muted-foreground">
                    {contextNodeName || `${contextNodeType} context`}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            {!isMinimized && (
              <>
                {/* Agent Selector */}
                {availableAgents.length > 0 && (
                  <Select value={selectedAgent?.name} onValueChange={selectAgent}>
                    <SelectTrigger className="w-auto h-8 text-xs">
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAgents.map((agent) => (
                        <SelectItem key={agent.name} value={agent.name}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              agent.isAvailable ? "bg-green-500" : "bg-gray-400"
                            )} />
                            <span>{agent.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {agent.type.toLowerCase()}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Settings */}
                <Popover open={showSettings} onOpenChange={setShowSettings}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Settings size={14} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" side="left">
                    <div className="space-y-4">
                      <h3 className="font-medium text-sm">Chat Settings</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="timestamps"
                            checked={settings.showTimestamps}
                            onCheckedChange={(checked) => 
                              updateSettings({ showTimestamps: checked as boolean })
                            }
                          />
                          <Label htmlFor="timestamps" className="text-sm">Show timestamps</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="notifications"
                            checked={settings.enableNotifications}
                            onCheckedChange={(checked) => 
                              updateSettings({ enableNotifications: checked as boolean })
                            }
                          />
                          <Label htmlFor="notifications" className="text-sm">Notifications</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="auto-agent"
                            checked={settings.autoSelectAgent}
                            onCheckedChange={(checked) => 
                              updateSettings({ autoSelectAgent: checked as boolean })
                            }
                          />
                          <Label htmlFor="auto-agent" className="text-sm">Auto-select agent</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="persist"
                            checked={settings.persistHistory}
                            onCheckedChange={(checked) => 
                              updateSettings({ persistHistory: checked as boolean })
                            }
                          />
                          <Label htmlFor="persist" className="text-sm">Persist history</Label>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}

            {/* Minimize/Maximize */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
            >
              {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </Button>

            {/* Close */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="h-8 w-8 p-0"
            >
              <X size={14} />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Conversations List */}
            {conversationsList.length > 1 && (
              <div className="border-b bg-muted/20">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Conversations</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={createNewConversation}
                      className="h-6 w-6 p-0"
                    >
                      <Plus size={12} />
                    </Button>
                  </div>
                  
                  <ScrollArea className="max-h-24">
                    <div className="space-y-1">
                      {conversationsList.map((conv) => (
                        <div
                          key={conv.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded text-xs cursor-pointer hover:bg-accent",
                            conv.id === currentConversationId && "bg-accent"
                          )}
                          onClick={() => switchConversation(conv.id)}
                        >
                          <span className="truncate flex-1">{conv.title}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={10} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-destructive/10 border-b border-destructive/20">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                    className="h-6 w-6 p-0"
                  >
                    <X size={12} />
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <QuickActions
              contextNodeType={contextNodeType}
              selectedAgentName={selectedAgent?.name}
              onActionClick={sendQuickAction}
              loading={loading.sendingMessage}
              className="border-b"
            />

            {/* Messages */}
            <div className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1">
                <div className="p-1">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <Bot size={32} className="text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Start a conversation with your AI assistant
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try a quick action above or type a message below
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          showTimestamp={settings.showTimestamps}
                        />
                      ))}
                      
                      {/* Typing Indicator */}
                      {isTyping && (
                        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                          <Bot size={16} />
                          <div className="flex items-center gap-1">
                            <div className="flex gap-1">
                              <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <div className="w-1 h-1 bg-current rounded-full animate-bounce" />
                            </div>
                            <span>AI is thinking...</span>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <ChatInput
                value={inputValue}
                attachments={attachments}
                onValueChange={setInputValue}
                onSend={sendMessage}
                onAddAttachment={addAttachment}
                onRemoveAttachment={removeAttachment}
                onClearAttachments={() => {
                  attachments.forEach(a => removeAttachment(a.id));
                }}
                disabled={!selectedAgent}
                loading={loading.sendingMessage}
                placeholder={
                  selectedAgent 
                    ? `Message ${selectedAgent.name}...`
                    : "Select an agent to start chatting..."
                }
              />
            </div>
          </>
        )}

        {/* Minimized State */}
        {isMinimized && (
          <div className="flex-1 flex flex-col items-center justify-center p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="w-12 h-12 rounded-full mb-2"
            >
              <MessageSquare size={20} />
            </Button>
            
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {messages.length}
              </Badge>
            )}
            
            {isTyping && (
              <div className="mt-2">
                <Zap size={16} className="text-primary animate-pulse" />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// Hook for keyboard shortcuts
export function useChatKeyboardShortcuts() {
  const { toggleSidebar } = useChatStore();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts that work anywhere
      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !e.shiftKey) {
        e.preventDefault();
        toggleSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);
}