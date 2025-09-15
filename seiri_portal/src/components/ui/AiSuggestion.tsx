"use client";

import React, { useState } from 'react';
import { 
  Lightbulb, 
  X, 
  Check, 
  ChevronRight, 
  Sparkles,
  Clock,
  TrendingUp,
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AiIndicator } from './AiIndicator';

export type SuggestionType = 'optimization' | 'improvement' | 'warning' | 'insight' | 'action';
export type SuggestionPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AiSuggestion {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  action?: {
    label: string;
    handler: () => Promise<void>;
  };
  secondaryAction?: {
    label: string;
    handler: () => Promise<void>;
  };
  dismissible?: boolean;
  autoExpire?: number; // milliseconds
  confidence?: number;
  agentName?: string;
  estimatedImpact?: string;
  metadata?: Record<string, any>;
}

interface AiSuggestionProps {
  suggestion: AiSuggestion;
  onDismiss?: (suggestionId: string) => void;
  onAccept?: (suggestionId: string) => void;
  className?: string;
  compact?: boolean;
  showActions?: boolean;
}

const suggestionConfig: Record<SuggestionType, {
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  optimization: {
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  improvement: {
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  warning: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  insight: {
    icon: Lightbulb,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  action: {
    icon: ChevronRight,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }
};

const priorityConfig: Record<SuggestionPriority, {
  label: string;
  color: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  low: {
    label: 'Low',
    color: 'text-gray-600',
    variant: 'secondary'
  },
  medium: {
    label: 'Medium',
    color: 'text-blue-600',
    variant: 'outline'
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    variant: 'default'
  },
  critical: {
    label: 'Critical',
    color: 'text-red-600',
    variant: 'destructive'
  }
};

export function AiSuggestion({
  suggestion,
  onDismiss,
  onAccept,
  className,
  compact = false,
  showActions = true
}: AiSuggestionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const config = suggestionConfig[suggestion.type];
  const priorityStyle = priorityConfig[suggestion.priority];
  const Icon = config.icon;

  // Auto-expire functionality
  React.useEffect(() => {
    if (suggestion.autoExpire) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, suggestion.autoExpire);
      
      return () => clearTimeout(timer);
    }
  }, [suggestion.autoExpire]);

  const handleAction = async () => {
    if (!suggestion.action) return;
    
    setIsLoading(true);
    try {
      await suggestion.action.handler();
      setIsAccepted(true);
      onAccept?.(suggestion.id);
    } catch (error) {
      console.error('Suggestion action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecondaryAction = async () => {
    if (!suggestion.secondaryAction) return;
    
    setIsLoading(true);
    try {
      await suggestion.secondaryAction.handler();
    } catch (error) {
      console.error('Suggestion secondary action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.(suggestion.id);
  };

  if (isDismissed) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-md border",
        config.bgColor,
        config.borderColor,
        isAccepted && "opacity-75",
        className
      )}>
        <Icon size={14} className={config.color} />
        <span className="text-sm font-medium flex-1 min-w-0 truncate">
          {suggestion.title}
        </span>
        {suggestion.priority !== 'low' && (
          <Badge variant={priorityStyle.variant} className="text-xs">
            {priorityStyle.label}
          </Badge>
        )}
        {showActions && suggestion.action && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAction}
            disabled={isLoading || isAccepted}
            className="h-6 px-2 text-xs"
          >
            {isAccepted ? <Check size={12} /> : suggestion.action.label}
          </Button>
        )}
        {suggestion.dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X size={12} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-200",
      config.borderColor,
      isAccepted && "opacity-75 scale-95",
      className
    )}>
      <CardContent className={cn("p-4", config.bgColor)}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Icon size={20} className={cn(config.color, "shrink-0 mt-0.5")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm leading-tight">
                    {suggestion.title}
                  </h4>
                  <Badge variant={priorityStyle.variant} className="text-xs">
                    {priorityStyle.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {suggestion.description}
                </p>
              </div>
            </div>

            {suggestion.dismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 shrink-0"
              >
                <X size={12} />
              </Button>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {suggestion.agentName && (
              <div className="flex items-center gap-1">
                <AiIndicator 
                  type="suggested" 
                  variant="subtle" 
                  size="sm"
                  agentName={suggestion.agentName}
                />
                <span>{suggestion.agentName}</span>
              </div>
            )}
            {suggestion.confidence && (
              <div className="flex items-center gap-1">
                <span>{Math.round(suggestion.confidence * 100)}% confident</span>
              </div>
            )}
            {suggestion.estimatedImpact && (
              <div className="flex items-center gap-1">
                <TrendingUp size={10} />
                <span>{suggestion.estimatedImpact} impact</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {showActions && (suggestion.action || suggestion.secondaryAction) && (
            <div className="flex items-center gap-2 pt-1">
              {suggestion.action && (
                <Button
                  size="sm"
                  onClick={handleAction}
                  disabled={isLoading || isAccepted}
                  className="h-8"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : isAccepted ? (
                    <div className="flex items-center gap-2">
                      <Check size={14} />
                      Applied
                    </div>
                  ) : (
                    suggestion.action.label
                  )}
                </Button>
              )}
              
              {suggestion.secondaryAction && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSecondaryAction}
                  disabled={isLoading}
                  className="h-8"
                >
                  {suggestion.secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Container for multiple suggestions
interface AiSuggestionsContainerProps {
  suggestions: AiSuggestion[];
  onDismiss?: (suggestionId: string) => void;
  onAccept?: (suggestionId: string) => void;
  className?: string;
  title?: string;
  compact?: boolean;
  maxVisible?: number;
}

export function AiSuggestionsContainer({
  suggestions,
  onDismiss,
  onAccept,
  className,
  title = "AI Suggestions",
  compact = false,
  maxVisible = 5
}: AiSuggestionsContainerProps) {
  const [showAll, setShowAll] = useState(false);
  
  if (suggestions.length === 0) {
    return null;
  }

  const visibleSuggestions = showAll 
    ? suggestions 
    : suggestions.slice(0, maxVisible);

  const hasMore = suggestions.length > maxVisible;

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-600" />
          <h3 className="font-medium text-sm">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {suggestions.length}
          </Badge>
        </div>
      )}
      
      <div className="space-y-2">
        {visibleSuggestions.map((suggestion) => (
          <AiSuggestion
            key={suggestion.id}
            suggestion={suggestion}
            onDismiss={onDismiss}
            onAccept={onAccept}
            compact={compact}
          />
        ))}
      </div>

      {hasMore && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full"
        >
          Show {suggestions.length - maxVisible} more suggestions
        </Button>
      )}
    </div>
  );
}

// Hook for managing suggestions
export function useAiSuggestions() {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);

  const addSuggestion = (suggestion: AiSuggestion) => {
    setSuggestions(prev => [...prev, suggestion]);
  };

  const removeSuggestion = (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  const acceptSuggestion = (suggestionId: string) => {
    setSuggestions(prev => 
      prev.map(s => 
        s.id === suggestionId 
          ? { ...s, metadata: { ...s.metadata, accepted: true } }
          : s
      )
    );
  };

  return {
    suggestions,
    addSuggestion,
    removeSuggestion,
    clearSuggestions,
    acceptSuggestion
  };
}