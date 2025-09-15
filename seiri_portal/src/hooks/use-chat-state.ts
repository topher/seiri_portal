"use client";

import { useState, useCallback } from 'react';

// Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  contextNodeId?: string;
  contextNodeType?: string;
  agentName?: string;
  agentType?: string;
  operationId?: string;
  attachments?: ChatAttachment[];
  isTyping?: boolean;
  error?: string;
  metadata?: {
    tokenCount?: number;
    duration?: number;
    cached?: boolean;
    confidence?: number;
  };
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file' | 'code';
  name: string;
  url?: string;
  content?: string;
  mimeType?: string;
  size?: number;
}

export interface ChatConversation {
  id: string;
  contextNodeId: string;
  contextNodeType: string;
  title: string;
  messages: ChatMessage[];
  lastActivity: Date;
  agentName?: string;
  agentType?: string;
  isActive: boolean;
}

interface ChatState {
  isOpen: boolean;
  currentConversationId?: string;
  conversations: Record<string, ChatConversation>;
  isTyping: boolean;
  typingAgentName?: string;
  selectedAgentName?: string;
  availableAgents: Array<{
    name: string;
    type: string;
    capabilities: string[];
    isAvailable: boolean;
  }>;
  inputValue: string;
  attachments: ChatAttachment[];
  currentContext: {
    nodeId?: string;
    nodeType?: string;
    nodeName?: string;
  };
  settings: {
    showTimestamps: boolean;
    enableNotifications: boolean;
    autoSelectAgent: boolean;
    persistHistory: boolean;
  };
}

// Helper function to generate conversation title
const generateConversationTitle = (nodeType: string, nodeName?: string): string => {
  const typeMap: Record<string, string> = {
    'WORKSPACE': 'Workspace',
    'SUITE': 'Suite',
    'INITIATIVE': 'Initiative',
    'TASK': 'Task',
    'ACCEPTANCE_CRITERION': 'Acceptance Criterion'
  };
  
  const displayType = typeMap[nodeType] || nodeType;
  return nodeName ? `${displayType}: ${nodeName}` : `${displayType} Chat`;
};

// Main hook
export function useChatStore() {
  const [state, setState] = useState<ChatState>({
    isOpen: false,
    currentConversationId: undefined,
    conversations: {},
    isTyping: false,
    typingAgentName: undefined,
    selectedAgentName: undefined,
    availableAgents: [],
    inputValue: '',
    attachments: [],
    currentContext: {},
    settings: {
      showTimestamps: true,
      enableNotifications: true,
      autoSelectAgent: true,
      persistHistory: true,
    },
  });

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const openSidebar = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }));
  }, []);

  const closeSidebar = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const createConversation = useCallback((contextNodeId: string, contextNodeType: string, title?: string) => {
    const conversationId = `${contextNodeType}_${contextNodeId}_${Date.now()}`;
    
    setState(prev => ({
      ...prev,
      conversations: {
        ...prev.conversations,
        [conversationId]: {
          id: conversationId,
          contextNodeId,
          contextNodeType,
          title: title || generateConversationTitle(contextNodeType),
          messages: [],
          lastActivity: new Date(),
          isActive: true,
        }
      },
      currentConversationId: conversationId,
    }));
    
    return conversationId;
  }, []);

  const switchConversation = useCallback((conversationId: string) => {
    setState(prev => {
      if (prev.conversations[conversationId]) {
        return {
          ...prev,
          currentConversationId: conversationId,
          conversations: {
            ...prev.conversations,
            [conversationId]: {
              ...prev.conversations[conversationId],
              isActive: true,
              lastActivity: new Date(),
            }
          }
        };
      }
      return prev;
    });
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    setState(prev => {
      const newConversations = { ...prev.conversations };
      delete newConversations[conversationId];
      
      let newCurrentId = prev.currentConversationId;
      if (prev.currentConversationId === conversationId) {
        const remainingConversations = Object.keys(newConversations);
        newCurrentId = remainingConversations.length > 0 ? remainingConversations[0] : undefined;
      }
      
      return {
        ...prev,
        conversations: newConversations,
        currentConversationId: newCurrentId,
      };
    });
  }, []);

  const addMessage = useCallback((conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setState(prev => {
      if (prev.conversations[conversationId]) {
        const newMessage: ChatMessage = {
          ...message,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        };
        
        return {
          ...prev,
          conversations: {
            ...prev.conversations,
            [conversationId]: {
              ...prev.conversations[conversationId],
              messages: [...prev.conversations[conversationId].messages, newMessage],
              lastActivity: new Date(),
            }
          }
        };
      }
      return prev;
    });
  }, []);

  const updateMessage = useCallback((conversationId: string, messageId: string, updates: Partial<ChatMessage>) => {
    setState(prev => {
      const conversation = prev.conversations[conversationId];
      if (conversation) {
        const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          const updatedMessages = [...conversation.messages];
          updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...updates };
          
          return {
            ...prev,
            conversations: {
              ...prev.conversations,
              [conversationId]: {
                ...conversation,
                messages: updatedMessages,
                lastActivity: new Date(),
              }
            }
          };
        }
      }
      return prev;
    });
  }, []);

  const setInputValue = useCallback((value: string) => {
    setState(prev => ({ ...prev, inputValue: value }));
  }, []);

  const clearInput = useCallback(() => {
    setState(prev => ({ ...prev, inputValue: '' }));
  }, []);

  const addAttachment = useCallback((attachment: ChatAttachment) => {
    setState(prev => ({ ...prev, attachments: [...prev.attachments, attachment] }));
  }, []);

  const removeAttachment = useCallback((attachmentId: string) => {
    setState(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attachmentId) }));
  }, []);

  const clearAttachments = useCallback(() => {
    setState(prev => ({ ...prev, attachments: [] }));
  }, []);

  const setAvailableAgents = useCallback((agents: ChatState['availableAgents']) => {
    setState(prev => {
      let newSelectedAgent = prev.selectedAgentName;
      
      // Auto-select first available agent if enabled and none selected
      if (prev.settings.autoSelectAgent && !prev.selectedAgentName && agents.length > 0) {
        const availableAgent = agents.find(a => a.isAvailable);
        if (availableAgent) {
          newSelectedAgent = availableAgent.name;
        }
      }
      
      return {
        ...prev,
        availableAgents: agents,
        selectedAgentName: newSelectedAgent,
      };
    });
  }, []);

  const selectAgent = useCallback((agentName: string) => {
    setState(prev => ({ ...prev, selectedAgentName: agentName }));
  }, []);

  const setTyping = useCallback((isTyping: boolean, agentName?: string) => {
    setState(prev => ({
      ...prev,
      isTyping,
      typingAgentName: isTyping ? agentName : undefined,
    }));
  }, []);

  const setCurrentContext = useCallback((nodeId: string, nodeType: string, nodeName?: string) => {
    setState(prev => ({
      ...prev,
      currentContext: { nodeId, nodeType, nodeName },
    }));
  }, []);

  const clearCurrentContext = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentContext: {},
    }));
  }, []);

  const updateSettings = useCallback((settings: Partial<ChatState['settings']>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  }, []);

  const getOrCreateConversationForContext = useCallback((nodeId: string, nodeType: string, title?: string) => {
    const existing = Object.values(state.conversations).find(
      conv => conv.contextNodeId === nodeId && conv.contextNodeType === nodeType
    );
    
    if (existing) {
      return existing.id;
    }
    
    return createConversation(nodeId, nodeType, title);
  }, [state.conversations, createConversation]);

  return {
    // State
    ...state,
    
    // Actions
    toggleSidebar,
    openSidebar,
    closeSidebar,
    createConversation,
    switchConversation,
    deleteConversation,
    addMessage,
    updateMessage,
    setInputValue,
    clearInput,
    addAttachment,
    removeAttachment,
    clearAttachments,
    setAvailableAgents,
    selectAgent,
    setTyping,
    setCurrentContext,
    clearCurrentContext,
    updateSettings,
    getOrCreateConversationForContext,
  };
}