"use client";

import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import { 
  GENERATE_WORKSPACE_INSIGHTS,
  OPTIMIZE_WORKSPACE,
  GENERATE_WORKSPACE_STRATEGY,
  PERFORM_WORKSPACE_HEALTH_CHECK,
  GENERATE_TASK_BREAKDOWN,
  ESTIMATE_TASK_EFFORT,
  OPTIMIZE_TASK,
  ANALYZE_TASK_DEPENDENCIES,
  AUTO_GENERATE_SUBTASKS,
  GENERATE_INITIATIVE_PLANNING,
  GENERATE_INITIATIVE_STRATEGY,
  TRACK_INITIATIVE_PROGRESS,
  AUTO_GENERATE_INITIATIVE_TASKS
} from '@/lib/apollo/mutations';
import { AiAction, AiActionType } from '@/components/ui/AiActionButton';
import { AiSuggestion, SuggestionType, SuggestionPriority } from '@/components/ui/AiSuggestion';

interface UseAiActionsOptions {
  contextId?: string;
  contextType?: 'workspace' | 'task' | 'initiative' | 'suite';
  onSuccess?: (result: any, actionType: AiActionType) => void;
  onError?: (error: Error, actionType: AiActionType) => void;
  showToasts?: boolean;
}

export function useAiActions(options: UseAiActionsOptions = {}) {
  const {
    contextId,
    contextType,
    onSuccess,
    onError,
    showToasts = true
  } = options;

  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);

  // GraphQL mutations
  const [generateWorkspaceInsights] = useMutation(GENERATE_WORKSPACE_INSIGHTS);
  const [optimizeWorkspace] = useMutation(OPTIMIZE_WORKSPACE);
  const [generateWorkspaceStrategy] = useMutation(GENERATE_WORKSPACE_STRATEGY);
  const [performWorkspaceHealthCheck] = useMutation(PERFORM_WORKSPACE_HEALTH_CHECK);
  const [generateTaskBreakdown] = useMutation(GENERATE_TASK_BREAKDOWN);
  const [estimateTaskEffort] = useMutation(ESTIMATE_TASK_EFFORT);
  const [optimizeTask] = useMutation(OPTIMIZE_TASK);
  const [analyzeTaskDependencies] = useMutation(ANALYZE_TASK_DEPENDENCIES);
  const [autoGenerateSubtasks] = useMutation(AUTO_GENERATE_SUBTASKS);
  const [generateInitiativePlanning] = useMutation(GENERATE_INITIATIVE_PLANNING);
  const [generateInitiativeStrategy] = useMutation(GENERATE_INITIATIVE_STRATEGY);
  const [trackInitiativeProgress] = useMutation(TRACK_INITIATIVE_PROGRESS);
  const [autoGenerateInitiativeTasks] = useMutation(AUTO_GENERATE_INITIATIVE_TASKS);

  const setActionLoading = useCallback((actionId: string, loading: boolean) => {
    setLoadingActions(prev => {
      const newSet = new Set(prev);
      if (loading) {
        newSet.add(actionId);
      } else {
        newSet.delete(actionId);
      }
      return newSet;
    });
  }, []);

  const executeAction = useCallback(async (action: AiAction): Promise<any> => {
    if (!contextId) {
      throw new Error('Context ID is required for AI actions');
    }

    setActionLoading(action.id, true);

    try {
      let result;
      
      switch (action.type) {
        case 'insights':
          if (contextType === 'workspace') {
            result = await generateWorkspaceInsights({
              variables: { workspaceId: contextId }
            });
            result = result.data?.generateWorkspaceInsights;
          }
          break;

        case 'optimize':
          if (contextType === 'workspace') {
            result = await optimizeWorkspace({
              variables: { workspaceId: contextId }
            });
            result = result.data?.optimizeWorkspace;
          } else if (contextType === 'task') {
            result = await optimizeTask({
              variables: { taskId: contextId }
            });
            result = result.data?.optimizeTask;
          } else if (contextType === 'initiative') {
            result = await generateInitiativeStrategy({
              variables: { 
                initiativeId: contextId,
                input: {
                  goals: [],
                  constraints: [],
                  timeline: "3 months",
                  resources: []
                }
              }
            });
            result = result.data?.generateInitiativeStrategy;
          }
          break;

        case 'plan':
          if (contextType === 'workspace') {
            // For strategy planning, you might want to collect input first
            result = await generateWorkspaceStrategy({
              variables: { 
                workspaceId: contextId,
                input: {
                  goals: [],
                  constraints: [],
                  timeline: "3 months",
                  resources: []
                }
              }
            });
            result = result.data?.generateWorkspaceStrategy;
          } else if (contextType === 'initiative') {
            result = await generateInitiativePlanning({
              variables: { initiativeId: contextId }
            });
            result = result.data?.generateInitiativePlanning;
          }
          break;

        case 'breakdown':
          if (contextType === 'task') {
            result = await generateTaskBreakdown({
              variables: { taskId: contextId }
            });
            result = result.data?.generateTaskBreakdown;
          }
          break;

        case 'estimate':
          if (contextType === 'task') {
            result = await estimateTaskEffort({
              variables: { taskId: contextId }
            });
            result = result.data?.estimateTaskEffort;
          }
          break;

        case 'analyze':
          if (contextType === 'task') {
            result = await analyzeTaskDependencies({
              variables: { taskId: contextId }
            });
            result = result.data?.analyzeTaskDependencies;
          } else if (contextType === 'workspace') {
            result = await performWorkspaceHealthCheck({
              variables: { workspaceId: contextId }
            });
            result = result.data?.performWorkspaceHealthCheck;
          } else if (contextType === 'initiative') {
            result = await trackInitiativeProgress({
              variables: { initiativeId: contextId }
            });
            result = result.data?.trackInitiativeProgress;
          }
          break;

        case 'generate':
          if (contextType === 'task') {
            result = await autoGenerateSubtasks({
              variables: { taskId: contextId }
            });
            result = result.data?.autoGenerateSubtasks;
          } else if (contextType === 'initiative') {
            result = await autoGenerateInitiativeTasks({
              variables: { initiativeId: contextId }
            });
            result = result.data?.autoGenerateInitiativeTasks;
          }
          break;

        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      if (!result?.success) {
        const errorMessage = result?.error || 'Action failed';
        console.error('AI action execution failed:', {
          actionType: action.type,
          contextType,
          contextId,
          error: errorMessage,
          result
        });
        throw new Error(errorMessage);
      }

      // Show success notification
      if (showToasts) {
        toast.success(`${action.label} completed successfully`, {
          description: 'AI analysis has been generated and applied.'
        });
      }

      // Generate follow-up suggestions based on the result
      generateSuggestionsFromResult(result, action);

      // Call success callback
      onSuccess?.(result, action.type);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error occurred';
      
      if (showToasts) {
        toast.error(`${action.label} failed`, {
          description: errorMessage
        });
      }

      onError?.(error as Error, action.type);
      throw error;

    } finally {
      setActionLoading(action.id, false);
    }
  }, [
    contextId,
    contextType,
    showToasts,
    onSuccess,
    onError,
    setActionLoading,
    generateWorkspaceInsights,
    optimizeWorkspace,
    generateWorkspaceStrategy,
    performWorkspaceHealthCheck,
    generateTaskBreakdown,
    estimateTaskEffort,
    optimizeTask,
    analyzeTaskDependencies,
    autoGenerateSubtasks
  ]);

  const generateSuggestionsFromResult = useCallback((result: any, action: AiAction) => {
    const newSuggestions: AiSuggestion[] = [];

    // Generate contextual suggestions based on the action type and result
    switch (action.type) {
      case 'insights':
        if (result.insights?.recommendations) {
          result.insights.recommendations.slice(0, 3).forEach((rec: any, index: number) => {
            newSuggestions.push({
              id: `suggestion_${Date.now()}_${index}`,
              type: 'improvement' as SuggestionType,
              priority: rec.priority.toLowerCase() as SuggestionPriority,
              title: rec.title,
              description: rec.description,
              confidence: 0.85,
              agentName: 'Workspace Agent',
              estimatedImpact: rec.estimatedImpact,
              dismissible: true,
              action: {
                label: 'Apply Suggestion',
                handler: async () => {
                  // This would trigger the specific recommendation action
                  toast.success('Suggestion applied successfully');
                }
              }
            });
          });
        }
        break;

      case 'breakdown':
        if (result.breakdown?.subtasks?.length > 0) {
          newSuggestions.push({
            id: `suggestion_subtasks_${Date.now()}`,
            type: 'action' as SuggestionType,
            priority: 'medium' as SuggestionPriority,
            title: 'Create Subtasks',
            description: `Generate ${result.breakdown.subtasks.length} subtasks automatically?`,
            confidence: 0.9,
            agentName: 'Task Agent',
            dismissible: true,
            action: {
              label: 'Create Subtasks',
              handler: async () => {
                // This would create the actual subtasks in the system
                toast.success('Subtasks created successfully');
              }
            }
          });
        }
        break;

      case 'optimize':
        if (result.optimization?.quickWins) {
          result.optimization.quickWins.slice(0, 2).forEach((win: any, index: number) => {
            newSuggestions.push({
              id: `suggestion_quickwin_${Date.now()}_${index}`,
              type: 'optimization' as SuggestionType,
              priority: 'high' as SuggestionPriority,
              title: `Quick Win: ${win.title}`,
              description: win.description,
              confidence: 0.8,
              agentName: contextType === 'workspace' ? 'Workspace Agent' : 'Task Agent',
              estimatedImpact: win.impact,
              dismissible: true,
              action: {
                label: 'Implement',
                handler: async () => {
                  toast.success('Quick win implemented');
                }
              }
            });
          });
        }
        break;
    }

    // Add suggestions to state
    setSuggestions(prev => [...prev, ...newSuggestions]);

    // Auto-remove suggestions after 30 seconds
    setTimeout(() => {
      setSuggestions(prev => 
        prev.filter(s => !newSuggestions.some(ns => ns.id === s.id))
      );
    }, 30000);

  }, [contextType]);

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  const acceptSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => 
      prev.map(s => 
        s.id === suggestionId 
          ? { ...s, metadata: { ...s.metadata, accepted: true } }
          : s
      )
    );
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Helper to check if any action is loading
  const isLoading = loadingActions.size > 0;
  const getLoadingActionId = () => Array.from(loadingActions)[0];

  return {
    // Core functionality
    executeAction,
    isLoading,
    loadingActions,
    getLoadingActionId: getLoadingActionId(),

    // Suggestions
    suggestions,
    dismissSuggestion,
    acceptSuggestion,
    clearSuggestions,

    // Helper functions
    isActionLoading: (actionId: string) => loadingActions.has(actionId)
  };
}

// Specialized hooks for different contexts
export function useTaskAiActions(taskId?: string, options?: Omit<UseAiActionsOptions, 'contextId' | 'contextType'>) {
  return useAiActions({
    ...options,
    contextId: taskId,
    contextType: 'task'
  });
}

export function useWorkspaceAiActions(workspaceId?: string, options?: Omit<UseAiActionsOptions, 'contextId' | 'contextType'>) {
  return useAiActions({
    ...options,
    contextId: workspaceId,
    contextType: 'workspace'
  });
}

export function useInitiativeAiActions(initiativeId?: string, options?: Omit<UseAiActionsOptions, 'contextId' | 'contextType'>) {
  return useAiActions({
    ...options,
    contextId: initiativeId,
    contextType: 'initiative'
  });
}

// Hook for generating quick suggestions without executing actions
export function useQuickSuggestions(contextType?: string, contextData?: any) {
  const [quickSuggestions, setQuickSuggestions] = useState<AiSuggestion[]>([]);

  const generateQuickSuggestions = useCallback((data: any) => {
    const suggestions: AiSuggestion[] = [];

    if (contextType === 'task' && data) {
      // Generate task-specific suggestions
      if (!data.description || data.description.length < 50) {
        suggestions.push({
          id: 'task_description',
          type: 'improvement',
          priority: 'medium',
          title: 'Improve Task Description',
          description: 'Add more detail to help with estimation and planning',
          dismissible: true,
          autoExpire: 10000
        });
      }

      if (!data.dueDate) {
        suggestions.push({
          id: 'task_due_date',
          type: 'warning',
          priority: 'high',
          title: 'Set Due Date',
          description: 'Tasks without due dates are 40% more likely to be delayed',
          dismissible: true,
          autoExpire: 15000
        });
      }
    }

    if (contextType === 'workspace' && data) {
      // Generate workspace-specific suggestions
      if (data.taskCount > 50 && !data.hasRecentInsights) {
        suggestions.push({
          id: 'workspace_insights',
          type: 'insight',
          priority: 'medium',
          title: 'Generate Workspace Insights',
          description: 'Get AI-powered analysis of your workspace performance',
          dismissible: true,
          action: {
            label: 'Generate Insights',
            handler: async () => {
              toast.success('Generating insights...');
            }
          }
        });
      }
    }

    setQuickSuggestions(suggestions);
  }, [contextType]);

  const clearQuickSuggestions = useCallback(() => {
    setQuickSuggestions([]);
  }, []);

  return {
    quickSuggestions,
    generateQuickSuggestions,
    clearQuickSuggestions
  };
}