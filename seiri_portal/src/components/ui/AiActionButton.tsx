"use client";

import React, { useState } from 'react';
import { 
  Sparkles, 
  Bot, 
  Lightbulb, 
  TrendingUp, 
  BarChart3, 
  GitBranch, 
  Clock, 
  Zap, 
  Target,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type AiActionType = 
  | 'generate'
  | 'analyze' 
  | 'optimize'
  | 'suggest'
  | 'breakdown'
  | 'estimate'
  | 'plan'
  | 'insights';

export interface AiAction {
  id: string;
  type: AiActionType;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  estimatedTime?: string;
  requiresInput?: boolean;
  contextType?: string[];
}

interface AiActionButtonProps {
  actions: AiAction[];
  onActionClick: (action: AiAction) => Promise<void>;
  loading?: boolean;
  loadingActionId?: string;
  disabled?: boolean;
  variant?: 'ghost' | 'outline' | 'secondary';
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
  showBadge?: boolean;
  triggerLabel?: string;
}

const actionIcons: Record<AiActionType, React.ComponentType<any>> = {
  generate: Sparkles,
  analyze: BarChart3,
  optimize: TrendingUp,
  suggest: Lightbulb,
  breakdown: GitBranch,
  estimate: Clock,
  plan: Target,
  insights: Bot
};

export function AiActionButton({
  actions,
  onActionClick,
  loading = false,
  loadingActionId,
  disabled = false,
  variant = 'ghost',
  size = 'sm',
  className,
  showBadge = true,
  triggerLabel
}: AiActionButtonProps) {
  const [open, setOpen] = useState(false);

  const handleActionClick = async (action: AiAction) => {
    try {
      setOpen(false);
      await onActionClick(action);
    } catch (error) {
      console.error('AI action failed:', error);
    }
  };

  const buttonSize = {
    xs: "h-6 w-6 p-0",
    sm: "h-8 w-8 p-0",
    default: "h-9 w-9 p-0", 
    lg: "h-10 w-10 p-0",
    icon: "h-8 w-8 p-0"
  }[size] || "h-8 w-8 p-0";

  const iconSize = {
    xs: 12,
    sm: 14,
    default: 16,
    lg: 18,
    icon: 14
  }[size] || 14;

  if (actions.length === 0) {
    return null;
  }

  // Single action - render as direct button
  if (actions.length === 1) {
    const action = actions[0];
    const Icon = action.icon;
    const isLoading = loading && loadingActionId === action.id;

    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleActionClick(action)}
        disabled={disabled || loading}
        className={cn(
          buttonSize,
          "relative group transition-all duration-200",
          "hover:shadow-sm hover:scale-105",
          className
        )}
        title={action.description}
      >
        {isLoading ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : (
          <Icon size={iconSize} />
        )}
        {showBadge && !isLoading && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full" />
        )}
      </Button>
    );
  }

  // Multiple actions - render as dropdown menu
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || loading}
          className={cn(
            buttonSize,
            "relative group transition-all duration-200",
            "hover:shadow-sm hover:scale-105",
            className
          )}
        >
          {loading ? (
            <Loader2 size={iconSize} className="animate-spin" />
          ) : (
            <Sparkles size={iconSize} className="text-purple-600 group-hover:text-purple-700" />
          )}
          {showBadge && !loading && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sparkles size={14} className="text-purple-600" />
          {triggerLabel || 'AI Actions'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {actions.map((action) => {
          const Icon = action.icon;
          const isLoading = loading && loadingActionId === action.id;
          
          return (
            <DropdownMenuItem
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={disabled || loading}
              className="cursor-pointer p-3"
            >
              <div className="flex items-start gap-3 w-full">
                <div className="shrink-0 mt-0.5">
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin text-purple-600" />
                  ) : (
                    <Icon size={16} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{action.label}</span>
                    {action.estimatedTime && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                        {action.estimatedTime}
                      </Badge>
                    )}
                    {action.requiresInput && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                        input
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Specialized AI action buttons for common contexts
export function TaskAiActionButton(props: Omit<AiActionButtonProps, 'actions'>) {
  const taskActions: AiAction[] = [
    {
      id: 'breakdown',
      type: 'breakdown',
      label: 'Break Down Task',
      description: 'Split into manageable subtasks',
      icon: GitBranch,
      estimatedTime: '30s',
      contextType: ['task']
    },
    {
      id: 'estimate',
      type: 'estimate',
      label: 'Estimate Effort',
      description: 'Calculate time and complexity',
      icon: Clock,
      estimatedTime: '20s',
      contextType: ['task']
    },
    {
      id: 'optimize',
      type: 'optimize',
      label: 'Optimize Task',
      description: 'Improve efficiency and approach',
      icon: TrendingUp,
      estimatedTime: '40s',
      contextType: ['task']
    }
  ];

  return <AiActionButton actions={taskActions} triggerLabel="Task AI" {...props} />;
}

export function WorkspaceAiActionButton(props: Omit<AiActionButtonProps, 'actions'>) {
  const workspaceActions: AiAction[] = [
    {
      id: 'insights',
      type: 'insights',
      label: 'Generate Insights',
      description: 'Analyze workspace performance',
      icon: BarChart3,
      estimatedTime: '30s',
      contextType: ['workspace']
    },
    {
      id: 'optimize',
      type: 'optimize',
      label: 'Optimize Workspace',
      description: 'Get improvement suggestions',
      icon: TrendingUp,
      estimatedTime: '45s',
      contextType: ['workspace']
    },
    {
      id: 'plan',
      type: 'plan',
      label: 'Strategic Planning',
      description: 'Create strategic roadmap',
      icon: Target,
      estimatedTime: '60s',
      requiresInput: true,
      contextType: ['workspace']
    }
  ];

  return <AiActionButton actions={workspaceActions} triggerLabel="Workspace AI" {...props} />;
}

export function InitiativeAiActionButton(props: Omit<AiActionButtonProps, 'actions'>) {
  const initiativeActions: AiAction[] = [
    {
      id: 'plan',
      type: 'plan',
      label: 'Plan Initiative',
      description: 'Create detailed initiative plan',
      icon: Target,
      estimatedTime: '60s',
      contextType: ['initiative']
    },
    {
      id: 'analyze',
      type: 'analyze',
      label: 'Risk Analysis',
      description: 'Identify and assess risks',
      icon: BarChart3,
      estimatedTime: '45s',
      contextType: ['initiative']
    },
    {
      id: 'suggest',
      type: 'suggest',
      label: 'Task Suggestions',
      description: 'Generate relevant tasks',
      icon: Lightbulb,
      estimatedTime: '35s',
      contextType: ['initiative']
    }
  ];

  return <AiActionButton actions={initiativeActions} triggerLabel="Initiative AI" {...props} />;
}

// Quick action button for inline usage
export function QuickAiActionButton({
  actionType,
  onActionClick,
  loading = false,
  disabled = false,
  className
}: {
  actionType: AiActionType;
  onActionClick: () => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const Icon = actionIcons[actionType];
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onActionClick}
      disabled={disabled || loading}
      className={cn(
        "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200",
        "hover:bg-purple-50 hover:scale-110",
        loading && "opacity-100",
        className
      )}
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin text-purple-600" />
      ) : (
        <Icon size={12} className="text-purple-600" />
      )}
    </Button>
  );
}