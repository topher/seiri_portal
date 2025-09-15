"use client";

import React, { useEffect, useRef } from 'react';
import { Search, Sparkles, Loader2, ArrowRight, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCommandPalette } from '@/hooks/use-command-palette';
import { CommandList } from './CommandItem';

interface CommandPaletteProps {
  workspaceId?: string;
  suiteId?: string;
  initiativeId?: string;
  taskId?: string;
  recentEntities?: Array<{
    id: string;
    name: string;
    type: 'workspace' | 'suite' | 'initiative' | 'task' | 'user' | 'team';
  }>;
}

export function CommandPalette({
  workspaceId,
  suiteId,
  initiativeId,
  taskId,
  recentEntities
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    isOpen,
    query,
    selectedIndex,
    commands,
    parsedCommand,
    isProcessing,
    hasAiSuggestions,
    contextualSuggestions,
    setIsOpen,
    setQuery,
    setSelectedIndex,
    executeCommand,
    toggleFavorite
  } = useCommandPalette({
    workspaceId,
    suiteId,
    initiativeId,
    taskId,
    recentEntities
  });

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Clear query when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen, setQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  const renderCommandStats = () => {
    if (!query || !parsedCommand) return null;

    return (
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-xs">
          <Sparkles size={12} className="text-purple-500" />
          <span className="text-muted-foreground">
            AI Understanding:
          </span>
          <Badge 
            variant={parsedCommand.confidence > 0.7 ? "default" : "secondary"}
            className="text-xs"
          >
            {Math.round(parsedCommand.confidence * 100)}% confident
          </Badge>
          
          {parsedCommand.action && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="font-medium">
                {parsedCommand.action.replace('_', ' ')}
              </span>
            </>
          )}
          
          {parsedCommand.entity && (
            <>
              <ArrowRight size={12} className="text-muted-foreground" />
              <span className="font-medium">
                {parsedCommand.entity}
              </span>
            </>
          )}
          
          {parsedCommand.agentOperation && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-purple-600 font-medium">
                {parsedCommand.agentOperation}
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    if (query.trim()) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <Search size={48} className="text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No commands found</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Try a different search term or use natural language like "create new task" or "ai help"
          </p>
          
          {hasAiSuggestions && (
            <div className="w-full max-w-sm">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                AI Suggestions:
              </p>
              <div className="flex flex-wrap gap-2">
                {parsedCommand?.suggestions?.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                  >
                    <Sparkles size={10} className="inline mr-1" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="py-6 px-6">
        <div className="mb-6">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Sparkles size={14} className="text-purple-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {contextualSuggestions.slice(0, 6).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-2 text-xs bg-accent hover:bg-accent/80 rounded-md text-left transition-colors text-accent-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 text-xs text-muted-foreground">
          <div>
            <h4 className="font-medium mb-1">Tips:</h4>
            <ul className="space-y-1">
              <li>• Type "new task" to create a task</li>
              <li>• Use "ai help" for AI assistance</li>
              <li>• Try "optimize workspace" for insights</li>
              <li>• Use natural language commands</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-1">Keyboard shortcuts:</h4>
            <ul className="space-y-1">
              <li>• <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+K</kbd> Open command palette</li>
              <li>• <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↑/↓</kbd> Navigate commands</li>
              <li>• <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> Execute command</li>
              <li>• <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> Close palette</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="sm:max-w-[600px] h-[70vh] p-0 gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center px-3 py-3 border-b border-border">
          <Search size={16} className="text-muted-foreground mr-3" />
          <Input
            ref={inputRef}
            placeholder="Type a command or search... Try 'ai help' or 'new task'"
            value={query}
            onChange={handleInputChange}
            className="border-0 shadow-none focus-visible:ring-0 text-sm"
            disabled={isProcessing}
          />
          {isProcessing && (
            <Loader2 size={16} className="animate-spin text-muted-foreground ml-2" />
          )}
        </div>

        {/* AI Understanding Display */}
        {renderCommandStats()}

        {/* Command List */}
        <ScrollArea className="flex-1">
          {commands.length > 0 ? (
            <div className="py-2">
              <CommandList
                commands={commands}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                onToggleFavorite={toggleFavorite}
                groupByCategory={!query.trim()}
              />
            </div>
          ) : (
            renderEmptyState()
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-background border rounded">↑↓</kbd>
              <span>navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-background border rounded">↵</kbd>
              <span>select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-background border rounded">esc</kbd>
              <span>close</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {commands.length > 0 && (
              <span>{commands.length} command{commands.length !== 1 ? 's' : ''}</span>
            )}
            <Badge variant="outline" className="text-xs">
              <Sparkles size={10} className="mr-1" />
              AI Powered
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Global command palette provider
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}