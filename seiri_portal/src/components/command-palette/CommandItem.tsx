"use client";

import React from 'react';
import { Star, StarIcon, Sparkles, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CommandItem as CommandItemType, CommandCategory } from '@/hooks/use-command-palette';

interface CommandItemProps {
  command: CommandItemType;
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite: (commandId: string) => void;
  showCategory?: boolean;
}

const categoryConfig: Record<CommandCategory, {
  color: string;
  label: string;
  icon?: React.ComponentType<any>;
}> = {
  navigation: {
    color: 'bg-blue-100 text-blue-700',
    label: 'Navigate',
  },
  creation: {
    color: 'bg-green-100 text-green-700',
    label: 'Create',
  },
  ai: {
    color: 'bg-purple-100 text-purple-700',
    label: 'AI',
    icon: Sparkles,
  },
  search: {
    color: 'bg-gray-100 text-gray-700',
    label: 'Search',
  },
  recent: {
    color: 'bg-orange-100 text-orange-700',
    label: 'Recent',
    icon: Clock,
  },
  favorites: {
    color: 'bg-yellow-100 text-yellow-700',
    label: 'Favorite',
    icon: Star,
  },
  workspace: {
    color: 'bg-indigo-100 text-indigo-700',
    label: 'Workspace',
  },
  suite: {
    color: 'bg-cyan-100 text-cyan-700',
    label: 'Suite',
  },
  initiative: {
    color: 'bg-emerald-100 text-emerald-700',
    label: 'Initiative',
  },
  task: {
    color: 'bg-pink-100 text-pink-700',
    label: 'Task',
  },
};

export function CommandItem({
  command,
  isSelected,
  onSelect,
  onToggleFavorite,
  showCategory = true
}: CommandItemProps) {
  const categoryInfo = categoryConfig[command.category];
  const CategoryIcon = categoryInfo.icon;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(command.id);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground"
      )}
      onClick={onSelect}
    >
      {/* Command Icon */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
        {command.icon ? (
          <span className="text-lg">{command.icon}</span>
        ) : CategoryIcon ? (
          <CategoryIcon size={16} className={cn("text-muted-foreground")} />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
        )}
      </div>

      {/* Command Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {command.title}
          </span>
          
          {/* Badges */}
          <div className="flex items-center gap-1">
            {command.aiSuggested && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                <Sparkles size={10} className="mr-1" />
                AI
              </Badge>
            )}
            
            {command.recentlyUsed && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                <Clock size={10} className="mr-1" />
                Recent
              </Badge>
            )}
            
            {showCategory && (
              <Badge 
                variant="outline" 
                className={cn("text-xs px-1.5 py-0", categoryInfo.color)}
              >
                {CategoryIcon && <CategoryIcon size={10} className="mr-1" />}
                {categoryInfo.label}
              </Badge>
            )}
          </div>
        </div>
        
        {command.subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {command.subtitle}
          </p>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Keyboard Shortcut */}
        {command.shortcut && (
          <div className="hidden sm:flex items-center gap-1">
            {command.shortcut.split('+').map((key, index, array) => (
              <React.Fragment key={key}>
                <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
                  {key}
                </kbd>
                {index < array.length - 1 && (
                  <span className="text-xs text-muted-foreground">+</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Score indicator for debugging */}
        {command.score !== undefined && process.env.NODE_ENV === 'development' && (
          <Badge variant="outline" className="text-xs px-1 py-0">
            {command.score}
          </Badge>
        )}

        {/* Favorite Toggle */}
        <button
          className={cn(
            "p-1 rounded hover:bg-accent-foreground/10 transition-colors",
            command.favorite && "text-yellow-500"
          )}
          onClick={handleFavoriteClick}
          title={command.favorite ? "Remove from favorites" : "Add to favorites"}
        >
          {command.favorite ? (
            <StarIcon size={14} className="fill-current" />
          ) : (
            <Star size={14} />
          )}
        </button>
      </div>
    </div>
  );
}

// Command group component for organizing commands by category
interface CommandGroupProps {
  title: string;
  commands: CommandItemType[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onToggleFavorite: (commandId: string) => void;
  startIndex: number;
}

export function CommandGroup({
  title,
  commands,
  selectedIndex,
  onSelect,
  onToggleFavorite,
  startIndex
}: CommandGroupProps) {
  if (commands.length === 0) return null;

  return (
    <div className="py-2">
      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </div>
      <div className="space-y-1">
        {commands.map((command, index) => (
          <CommandItem
            key={command.id}
            command={command}
            isSelected={selectedIndex === startIndex + index}
            onSelect={() => onSelect(startIndex + index)}
            onToggleFavorite={onToggleFavorite}
            showCategory={false}
          />
        ))}
      </div>
    </div>
  );
}

// Command list component that groups commands by category
interface CommandListProps {
  commands: CommandItemType[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onToggleFavorite: (commandId: string) => void;
  groupByCategory?: boolean;
}

export function CommandList({
  commands,
  selectedIndex,
  onSelect,
  onToggleFavorite,
  groupByCategory = true
}: CommandListProps) {
  if (!groupByCategory) {
    return (
      <div className="space-y-1">
        {commands.map((command, index) => (
          <CommandItem
            key={command.id}
            command={command}
            isSelected={selectedIndex === index}
            onSelect={() => onSelect(index)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    );
  }

  // Group commands by category
  const groupedCommands = commands.reduce((groups, command) => {
    const category = command.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(command);
    return groups;
  }, {} as Record<CommandCategory, CommandItemType[]>);

  let currentIndex = 0;

  return (
    <div className="space-y-1">
      {Object.entries(groupedCommands).map(([category, categoryCommands]) => {
        const startIndex = currentIndex;
        currentIndex += categoryCommands.length;
        
        return (
          <CommandGroup
            key={category}
            title={categoryConfig[category as CommandCategory]?.label || category}
            commands={categoryCommands}
            selectedIndex={selectedIndex}
            onSelect={onSelect}
            onToggleFavorite={onToggleFavorite}
            startIndex={startIndex}
          />
        );
      })}
    </div>
  );
}