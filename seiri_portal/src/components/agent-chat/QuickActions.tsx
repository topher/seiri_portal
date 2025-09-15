"use client";

import React from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  Target, 
  Heart, 
  BarChart3, 
  Clock, 
  Zap, 
  GitBranch, 
  CheckSquare, 
  Users,
  Workflow,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  actionType: string;
  category: string;
  estimatedTime?: string;
  requiresInput?: boolean;
}

interface QuickActionsProps {
  contextNodeType?: string;
  selectedAgentName?: string;
  onActionClick: (actionType: string, params?: any) => void;
  loading?: boolean;
  className?: string;
}

// Define quick actions by context type
const WORKSPACE_ACTIONS: QuickAction[] = [
  {
    id: 'workspace_insights',
    label: 'Generate Insights',
    description: 'Analyze workspace performance and trends',
    icon: <BarChart3 size={16} />,
    actionType: 'workspace_insights',
    category: 'Analysis',
    estimatedTime: '30s'
  },
  {
    id: 'workspace_optimization',
    label: 'Optimize Workspace',
    description: 'Get improvement suggestions and quick wins',
    icon: <TrendingUp size={16} />,
    actionType: 'workspace_optimization',
    category: 'Optimization',
    estimatedTime: '45s'
  },
  {
    id: 'workspace_strategy',
    label: 'Plan Strategy',
    description: 'Create strategic roadmap and goals',
    icon: <Target size={16} />,
    actionType: 'workspace_strategy',
    category: 'Planning',
    estimatedTime: '60s',
    requiresInput: true
  },
  {
    id: 'workspace_health',
    label: 'Health Check',
    description: 'Assess overall workspace health',
    icon: <Heart size={16} />,
    actionType: 'workspace_health',
    category: 'Health',
    estimatedTime: '20s'
  }
];

const TASK_ACTIONS: QuickAction[] = [
  {
    id: 'task_breakdown',
    label: 'Break Down Task',
    description: 'Split into manageable subtasks',
    icon: <GitBranch size={16} />,
    actionType: 'task_breakdown',
    category: 'Planning',
    estimatedTime: '30s'
  },
  {
    id: 'task_estimation',
    label: 'Estimate Effort',
    description: 'Calculate time and complexity',
    icon: <Clock size={16} />,
    actionType: 'task_estimation',
    category: 'Estimation',
    estimatedTime: '20s'
  },
  {
    id: 'task_optimization',
    label: 'Optimize Task',
    description: 'Improve efficiency and approach',
    icon: <Zap size={16} />,
    actionType: 'task_optimization',
    category: 'Optimization',
    estimatedTime: '40s'
  },
  {
    id: 'task_dependencies',
    label: 'Analyze Dependencies',
    description: 'Map task relationships and blockers',
    icon: <Workflow size={16} />,
    actionType: 'task_dependencies',
    category: 'Analysis',
    estimatedTime: '35s'
  },
  {
    id: 'task_subtasks',
    label: 'Generate Subtasks',
    description: 'Auto-create detailed subtasks',
    icon: <CheckSquare size={16} />,
    actionType: 'task_subtasks',
    category: 'Generation',
    estimatedTime: '45s'
  }
];

const SUITE_ACTIONS: QuickAction[] = [
  {
    id: 'suite_overview',
    label: 'Suite Overview',
    description: 'Get comprehensive suite analysis',
    icon: <BarChart3 size={16} />,
    actionType: 'suite_overview',
    category: 'Analysis',
    estimatedTime: '40s'
  },
  {
    id: 'suite_coordination',
    label: 'Coordinate Initiatives',
    description: 'Optimize initiative relationships',
    icon: <Users size={16} />,
    actionType: 'suite_coordination',
    category: 'Coordination',
    estimatedTime: '50s'
  }
];

const INITIATIVE_ACTIONS: QuickAction[] = [
  {
    id: 'initiative_planning',
    label: 'Plan Initiative',
    description: 'Create detailed initiative plan',
    icon: <Target size={16} />,
    actionType: 'initiative_planning',
    category: 'Planning',
    estimatedTime: '60s'
  },
  {
    id: 'initiative_risks',
    label: 'Assess Risks',
    description: 'Identify and mitigate risks',
    icon: <Brain size={16} />,
    actionType: 'initiative_risks',
    category: 'Risk Management',
    estimatedTime: '45s'
  }
];

const GENERAL_ACTIONS: QuickAction[] = [
  {
    id: 'ask_question',
    label: 'Ask a Question',
    description: 'Get help with specific topics',
    icon: <Lightbulb size={16} />,
    actionType: 'ask_question',
    category: 'General',
    requiresInput: true
  },
  {
    id: 'explain_context',
    label: 'Explain Context',
    description: 'Understand current situation',
    icon: <Brain size={16} />,
    actionType: 'explain_context',
    category: 'Understanding',
    estimatedTime: '15s'
  }
];

export function QuickActions({ 
  contextNodeType, 
  selectedAgentName, 
  onActionClick, 
  loading = false, 
  className 
}: QuickActionsProps) {
  // Get actions based on context type
  const getActionsForContext = (nodeType?: string): QuickAction[] => {
    switch (nodeType) {
      case 'WORKSPACE':
        return [...WORKSPACE_ACTIONS, ...GENERAL_ACTIONS];
      case 'TASK':
        return [...TASK_ACTIONS, ...GENERAL_ACTIONS];
      case 'SUITE':
        return [...SUITE_ACTIONS, ...GENERAL_ACTIONS];
      case 'INITIATIVE':
        return [...INITIATIVE_ACTIONS, ...GENERAL_ACTIONS];
      default:
        return GENERAL_ACTIONS;
    }
  };

  const actions = getActionsForContext(contextNodeType);
  
  // Group actions by category
  const actionsByCategory = actions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  const handleActionClick = (action: QuickAction) => {
    if (loading) return;
    onActionClick(action.actionType, { requiresInput: action.requiresInput });
  };

  if (actions.length === 0) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        <Brain size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No quick actions available for this context.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="px-4 pt-4">
        <h3 className="font-medium text-sm text-muted-foreground mb-2">
          Quick Actions
          {contextNodeType && (
            <Badge variant="outline" className="ml-2 text-xs">
              {contextNodeType.toLowerCase()}
            </Badge>
          )}
        </h3>
        {selectedAgentName && (
          <p className="text-xs text-muted-foreground">
            Using {selectedAgentName}
          </p>
        )}
      </div>

      <div className="px-4 space-y-4">
        {Object.entries(actionsByCategory).map(([category, categoryActions], categoryIndex) => (
          <div key={category}>
            {categoryIndex > 0 && <Separator className="mb-4" />}
            
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {category}
              </h4>
              
              <div className="grid gap-2">
                {categoryActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="ghost"
                    className={cn(
                      "h-auto p-3 justify-start text-left hover:bg-accent/50",
                      loading && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => handleActionClick(action)}
                    disabled={loading}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="shrink-0 mt-0.5 text-muted-foreground">
                        {action.icon}
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
                              input required
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Help text */}
      <div className="px-4 pb-4">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Quick actions provide instant AI assistance for common tasks. 
            You can also type your own questions in the chat below.
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook for getting available actions
export function useQuickActions(contextNodeType?: string) {
  const getActionsForContext = (nodeType?: string): QuickAction[] => {
    switch (nodeType) {
      case 'WORKSPACE':
        return [...WORKSPACE_ACTIONS, ...GENERAL_ACTIONS];
      case 'TASK':
        return [...TASK_ACTIONS, ...GENERAL_ACTIONS];
      case 'SUITE':
        return [...SUITE_ACTIONS, ...GENERAL_ACTIONS];
      case 'INITIATIVE':
        return [...INITIATIVE_ACTIONS, ...GENERAL_ACTIONS];
      default:
        return GENERAL_ACTIONS;
    }
  };

  return {
    actions: getActionsForContext(contextNodeType),
    workspaceActions: WORKSPACE_ACTIONS,
    taskActions: TASK_ACTIONS,
    suiteActions: SUITE_ACTIONS,
    initiativeActions: INITIATIVE_ACTIONS,
    generalActions: GENERAL_ACTIONS
  };
}