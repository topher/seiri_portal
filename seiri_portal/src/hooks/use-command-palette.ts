"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { commandParser, ParsedCommand, CommandContext, EntityType, CommandAction } from '@/utils/command-parser';
import { useAgentChat } from './use-agent-chat';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  shortcut?: string;
  category: CommandCategory;
  action: () => void | Promise<void>;
  keywords: string[];
  score?: number;
  recentlyUsed?: boolean;
  favorite?: boolean;
  aiSuggested?: boolean;
}

export type CommandCategory = 
  | 'navigation' 
  | 'creation' 
  | 'ai' 
  | 'search' 
  | 'recent' 
  | 'favorites'
  | 'workspace'
  | 'suite'
  | 'initiative'
  | 'task';

interface CommandHistory {
  command: string;
  timestamp: Date;
  context: CommandContext;
  successful: boolean;
}

interface UseCommandPaletteOptions {
  workspaceId?: string;
  suiteId?: string;
  initiativeId?: string;
  taskId?: string;
  recentEntities?: Array<{
    id: string;
    name: string;
    type: EntityType;
  }>;
}

export function useCommandPalette(options: UseCommandPaletteOptions = {}) {
  const router = useRouter();
  const { openChat, sendMessage } = useAgentChat() as any;
  
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Build command context
  const commandContext: CommandContext = useMemo(() => ({
    currentWorkspaceId: options.workspaceId,
    currentSuiteId: options.suiteId,
    currentInitiativeId: options.initiativeId,
    currentTaskId: options.taskId,
    recentEntities: options.recentEntities || []
  }), [options]);

  // Parse current command
  const parsedCommand = useMemo(() => {
    if (!query.trim()) return null;
    return commandParser.parseCommand(query, commandContext);
  }, [query, commandContext]);

  // Generate base commands
  const baseCommands = useMemo((): CommandItem[] => {
    const commands: CommandItem[] = [];

    // Navigation commands
    if (options.workspaceId) {
      commands.push({
        id: 'nav-workspace',
        title: 'Go to Workspace Overview',
        subtitle: 'View workspace dashboard and analytics',
        icon: '🏢',
        category: 'navigation',
        keywords: ['workspace', 'overview', 'dashboard'],
        action: () => router.push(`/workspaces/${options.workspaceId}`)
      });
    }

    // Creation commands
    commands.push({
      id: 'create-task',
      title: 'Create New Task',
      subtitle: 'Add a new task to the current initiative',
      icon: '✅',
      shortcut: 'Ctrl+T',
      category: 'creation',
      keywords: ['create', 'new', 'task', 'todo'],
      action: () => {
        // This would trigger create task modal
        toast.success('Create task modal would open');
      }
    });

    commands.push({
      id: 'create-initiative',
      title: 'Create New Initiative',
      subtitle: 'Start a new initiative in the current suite',
      icon: '🎯',
      shortcut: 'Ctrl+I',
      category: 'creation',
      keywords: ['create', 'new', 'initiative', 'epic'],
      action: () => {
        toast.success('Create initiative modal would open');
      }
    });

    commands.push({
      id: 'create-suite',
      title: 'Create New Suite',
      subtitle: 'Add a new suite to the workspace',
      icon: '📦',
      shortcut: 'Ctrl+S',
      category: 'creation',
      keywords: ['create', 'new', 'suite', 'project'],
      action: () => {
        toast.success('Create suite modal would open');
      }
    });

    // AI commands
    commands.push({
      id: 'ai-chat',
      title: 'AI Chat',
      subtitle: 'Start a conversation with AI assistant',
      icon: '🤖',
      shortcut: 'Ctrl+K',
      category: 'ai',
      keywords: ['ai', 'chat', 'assistant', 'help'],
      action: () => {
        openChat();
        setIsOpen(false);
      }
    });

    // Context-specific AI commands
    if (options.taskId) {
      commands.push({
        id: 'ai-analyze-task',
        title: 'AI: Analyze Task',
        subtitle: 'Get AI insights about the current task',
        icon: '🔍',
        category: 'ai',
        keywords: ['ai', 'analyze', 'task', 'insights'],
        action: async () => {
          setIsProcessing(true);
          try {
            await sendMessage(`Analyze task ${options.taskId}`);
            openChat();
            setIsOpen(false);
          } finally {
            setIsProcessing(false);
          }
        }
      });

      commands.push({
        id: 'ai-optimize-task',
        title: 'AI: Optimize Task',
        subtitle: 'Get AI suggestions to improve the task',
        icon: '⚡',
        category: 'ai',
        keywords: ['ai', 'optimize', 'task', 'improve'],
        action: async () => {
          setIsProcessing(true);
          try {
            await sendMessage(`Optimize task ${options.taskId}`);
            openChat();
            setIsOpen(false);
          } finally {
            setIsProcessing(false);
          }
        }
      });
    }

    if (options.initiativeId) {
      commands.push({
        id: 'ai-initiative-strategy',
        title: 'AI: Generate Strategy',
        subtitle: 'Get AI-generated strategy for the initiative',
        icon: '📋',
        category: 'ai',
        keywords: ['ai', 'strategy', 'initiative', 'plan'],
        action: async () => {
          setIsProcessing(true);
          try {
            await sendMessage(`Generate strategy for initiative ${options.initiativeId}`);
            openChat();
            setIsOpen(false);
          } finally {
            setIsProcessing(false);
          }
        }
      });
    }

    if (options.workspaceId) {
      commands.push({
        id: 'ai-workspace-insights',
        title: 'AI: Workspace Insights',
        subtitle: 'Get comprehensive workspace analytics',
        icon: '📊',
        category: 'ai',
        keywords: ['ai', 'workspace', 'insights', 'analytics'],
        action: async () => {
          setIsProcessing(true);
          try {
            await sendMessage(`Generate insights for workspace ${options.workspaceId}`);
            openChat();
            setIsOpen(false);
          } finally {
            setIsProcessing(false);
          }
        }
      });
    }

    return commands;
  }, [options, router, openChat, sendMessage]);

  // Filter and score commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Return recent and favorite commands when no query
      const recentCommands = commandHistory
        .slice(-5)
        .reverse()
        .map(h => baseCommands.find(c => c.title.toLowerCase().includes(h.command.toLowerCase())))
        .filter(Boolean) as CommandItem[];

      const favoriteCommands = baseCommands.filter(c => favorites.includes(c.id));
      
      return [
        ...favoriteCommands.map(c => ({ ...c, category: 'favorites' as CommandCategory })),
        ...recentCommands.map(c => ({ ...c, category: 'recent' as CommandCategory })),
        ...baseCommands.slice(0, 8)
      ];
    }

    const queryLower = query.toLowerCase();
    
    return baseCommands
      .map(command => {
        let score = 0;
        
        // Title match (highest weight)
        if (command.title.toLowerCase().includes(queryLower)) {
          score += 100;
        }
        
        // Keyword matches
        const keywordMatches = command.keywords.filter(keyword => 
          keyword.toLowerCase().includes(queryLower) || queryLower.includes(keyword.toLowerCase())
        ).length;
        score += keywordMatches * 50;
        
        // Subtitle match
        if (command.subtitle?.toLowerCase().includes(queryLower)) {
          score += 30;
        }
        
        // Fuzzy matching
        const titleChars = command.title.toLowerCase().split('');
        const queryChars = queryLower.split('');
        let fuzzyScore = 0;
        let queryIndex = 0;
        
        for (const char of titleChars) {
          if (queryIndex < queryChars.length && char === queryChars[queryIndex]) {
            fuzzyScore += 10;
            queryIndex++;
          }
        }
        score += fuzzyScore;
        
        // Boost for recent usage
        if (command.recentlyUsed) score += 20;
        
        // Boost for favorites
        if (command.favorite) score += 15;
        
        return { ...command, score };
      })
      .filter(command => command.score > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [query, baseCommands, commandHistory, favorites]);

  // Get AI-generated suggestions
  const aiSuggestions = useMemo(() => {
    if (!parsedCommand || parsedCommand.confidence > 0.7) return [];
    
    return parsedCommand.suggestions?.map(suggestion => ({
      id: `ai-suggest-${suggestion}`,
      title: suggestion,
      subtitle: 'AI suggested command',
      icon: '✨',
      category: 'ai' as CommandCategory,
      keywords: suggestion.split(' '),
      aiSuggested: true,
      action: () => {
        setQuery(suggestion);
      }
    })) || [];
  }, [parsedCommand]);

  // Combined commands with AI suggestions
  const allCommands = useMemo(() => [
    ...aiSuggestions,
    ...filteredCommands
  ], [aiSuggestions, filteredCommands]);

  // Handle command execution
  const executeCommand = useCallback(async (commandId?: string) => {
    const command = commandId 
      ? allCommands.find(c => c.id === commandId)
      : allCommands[selectedIndex];
    
    if (!command) {
      // Try to execute as natural language command
      if (parsedCommand && parsedCommand.confidence > 0.5) {
        setIsProcessing(true);
        try {
          if (parsedCommand.action === 'ai_chat' || parsedCommand.action === 'ai_assist') {
            await sendMessage(query);
            openChat();
          } else {
            toast.info('Command parsing not fully implemented for this action');
          }
          
          // Add to history
          setCommandHistory(prev => [...prev, {
            command: query,
            timestamp: new Date(),
            context: commandContext,
            successful: true
          }]);
        } catch (error) {
          toast.error('Failed to execute command');
        } finally {
          setIsProcessing(false);
        }
      } else {
        toast.error('Command not found');
      }
      setIsOpen(false);
      return;
    }

    setIsProcessing(true);
    try {
      await command.action();
      
      // Add to history
      setCommandHistory(prev => [...prev, {
        command: command.title,
        timestamp: new Date(),
        context: commandContext,
        successful: true
      }]);
      
      toast.success(`Executed: ${command.title}`);
    } catch (error) {
      console.error('Command execution failed:', error);
      toast.error(`Failed to execute: ${command.title}`);
    } finally {
      setIsProcessing(false);
    }
    
    setIsOpen(false);
  }, [allCommands, selectedIndex, parsedCommand, query, sendMessage, openChat, commandContext]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % allCommands.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev === 0 ? allCommands.length - 1 : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        executeCommand();
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  }, [isOpen, allCommands.length, executeCommand]);

  // Add/remove from favorites
  const toggleFavorite = useCallback((commandId: string) => {
    setFavorites(prev => 
      prev.includes(commandId)
        ? prev.filter(id => id !== commandId)
        : [...prev, commandId]
    );
  }, []);

  // Reset selection when commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allCommands]);

  // Global keyboard listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Local keyboard listener for navigation
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  return {
    // State
    isOpen,
    query,
    selectedIndex,
    commands: allCommands,
    parsedCommand,
    isProcessing,
    commandHistory,
    favorites,
    
    // Actions
    setIsOpen,
    setQuery,
    setSelectedIndex,
    executeCommand,
    toggleFavorite,
    
    // Computed
    hasAiSuggestions: aiSuggestions.length > 0,
    contextualSuggestions: commandParser.getContextualSuggestions(commandContext)
  };
}