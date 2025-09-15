"use client";

import React from 'react';
import { Sparkles, Bot, Brain, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type AiIndicatorType = 'generated' | 'suggested' | 'analyzed' | 'optimized' | 'processed' | 'enhanced';
export type AiIndicatorStatus = 'idle' | 'processing' | 'success' | 'error';

interface AiIndicatorProps {
  type: AiIndicatorType;
  status?: AiIndicatorStatus;
  agentName?: string;
  timestamp?: Date;
  confidence?: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'prominent';
}

const typeConfig: Record<AiIndicatorType, {
  icon: React.ComponentType<any>;
  label: string;
  color: string;
  description: string;
}> = {
  generated: {
    icon: Sparkles,
    label: 'AI Generated',
    color: 'text-purple-600',
    description: 'This content was created by AI'
  },
  suggested: {
    icon: Brain,
    label: 'AI Suggested',
    color: 'text-blue-600',
    description: 'This is an AI suggestion'
  },
  analyzed: {
    icon: Bot,
    label: 'AI Analyzed',
    color: 'text-green-600',
    description: 'This content has been analyzed by AI'
  },
  optimized: {
    icon: Zap,
    label: 'AI Optimized',
    color: 'text-orange-600',
    description: 'This content has been optimized by AI'
  },
  processed: {
    icon: CheckCircle,
    label: 'AI Processed',
    color: 'text-indigo-600',
    description: 'This content has been processed by AI'
  },
  enhanced: {
    icon: Sparkles,
    label: 'AI Enhanced',
    color: 'text-pink-600',
    description: 'This content has been enhanced by AI'
  }
};

const statusConfig: Record<AiIndicatorStatus, {
  color: string;
  animation?: string;
}> = {
  idle: {
    color: 'text-muted-foreground'
  },
  processing: {
    color: 'text-primary',
    animation: 'animate-pulse'
  },
  success: {
    color: 'text-green-600'
  },
  error: {
    color: 'text-destructive'
  }
};

export function AiIndicator({
  type,
  status = 'idle',
  agentName,
  timestamp,
  confidence,
  className,
  showLabel = false,
  size = 'md',
  variant = 'default'
}: AiIndicatorProps) {
  const config = typeConfig[type];
  const statusStyle = statusConfig[status];
  const Icon = config.icon;

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20
  }[size];

  const formatTimestamp = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.round((date.getTime() - Date.now()) / (1000 * 60)),
      'minute'
    );
  };

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-medium">{config.label}</div>
      <div className="text-xs text-muted-foreground">{config.description}</div>
      {agentName && (
        <div className="text-xs">
          <span className="font-medium">Agent:</span> {agentName}
        </div>
      )}
      {timestamp && (
        <div className="text-xs">
          <span className="font-medium">Created:</span> {formatTimestamp(timestamp)}
        </div>
      )}
      {confidence && (
        <div className="text-xs">
          <span className="font-medium">Confidence:</span> {Math.round(confidence * 100)}%
        </div>
      )}
    </div>
  );

  if (variant === 'subtle') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "inline-flex items-center gap-1",
              className
            )}>
              <Icon 
                size={iconSize} 
                className={cn(
                  config.color,
                  statusStyle.color,
                  statusStyle.animation,
                  "opacity-70"
                )} 
              />
              {showLabel && (
                <span className="text-xs text-muted-foreground font-medium">
                  {config.label}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'prominent') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1",
                "bg-gradient-to-r from-purple-50 to-blue-50",
                "border border-purple-200/50",
                "hover:shadow-sm transition-all duration-200",
                className
              )}
            >
              <Icon 
                size={iconSize} 
                className={cn(
                  config.color,
                  statusStyle.animation
                )} 
              />
              <span className="text-xs font-medium">
                {showLabel ? config.label : type}
              </span>
              {confidence && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(confidence * 100)}%
                </span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-md",
            "bg-muted/50 border border-border/50",
            "hover:bg-muted transition-colors duration-200",
            className
          )}>
            <Icon 
              size={iconSize} 
              className={cn(
                config.color,
                statusStyle.animation
              )} 
            />
            {showLabel && (
              <span className="text-xs font-medium text-foreground">
                {config.label}
              </span>
            )}
            {status === 'processing' && (
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1 h-1 bg-current rounded-full animate-bounce" />
              </div>
            )}
            {status === 'error' && (
              <AlertCircle size={10} className="text-destructive" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Specialized indicators for common use cases
export function AiGeneratedIndicator(props: Omit<AiIndicatorProps, 'type'>) {
  return <AiIndicator type="generated" {...props} />;
}

export function AiSuggestedIndicator(props: Omit<AiIndicatorProps, 'type'>) {
  return <AiIndicator type="suggested" {...props} />;
}

export function AiAnalyzedIndicator(props: Omit<AiIndicatorProps, 'type'>) {
  return <AiIndicator type="analyzed" {...props} />;
}

export function AiOptimizedIndicator(props: Omit<AiIndicatorProps, 'type'>) {
  return <AiIndicator type="optimized" {...props} />;
}