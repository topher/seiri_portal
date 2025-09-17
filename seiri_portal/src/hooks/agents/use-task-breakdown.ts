"use client";

import { useMutation, useApolloClient } from '@apollo/client/react'; import { gql } from '@apollo/client';
import { useCallback, useState } from 'react';
import { 
  GENERATE_TASK_BREAKDOWN,
  ESTIMATE_TASK_EFFORT,
  OPTIMIZE_TASK,
  ANALYZE_TASK_DEPENDENCIES,
  TRACK_TASK_PROGRESS,
  AUTO_GENERATE_SUBTASKS
} from '@/lib/apollo/mutations';
import { useTaskRealtime } from '@/lib/apollo/realtime';
import { optimisticUpdates, cacheInvalidationPatterns } from '@/lib/apollo/cache-policies';
import type { 
  GenerateTaskBreakdownResponse,
  EstimateTaskEffortResponse,
  TrackTaskProgressResponse
} from '@/types/graphql';

// Types
interface TaskBreakdownState {
  breakdown: any | null;
  estimation: any | null;
  optimization: any | null;
  dependencies: any | null;
  progress: any | null;
  subtasks: any[] | null;
  loading: {
    breakdown: boolean;
    estimation: boolean;
    optimization: boolean;
    dependencies: boolean;
    progress: boolean;
    subtasks: boolean;
  };
  errors: {
    breakdown: Error | null;
    estimation: Error | null;
    optimization: Error | null;
    dependencies: Error | null;
    progress: Error | null;
    subtasks: Error | null;
  };
}

interface UseTaskBreakdownOptions {
  enableRealtime?: boolean;
  enableOptimisticUpdates?: boolean;
  onBreakdownGenerated?: (breakdown: any) => void;
  onEstimationCompleted?: (estimation: any) => void;
  onOptimizationCompleted?: (optimization: any) => void;
  onDependenciesAnalyzed?: (dependencies: any) => void;
  onProgressUpdated?: (progress: any) => void;
  onSubtasksGenerated?: (subtasks: any[]) => void;
}

// Main hook for task breakdown operations
export function useTaskBreakdown(
  taskId: string,
  options: UseTaskBreakdownOptions = {}
) {
  const {
    enableRealtime = true,
    enableOptimisticUpdates = true,
    onBreakdownGenerated,
    onEstimationCompleted,
    onOptimizationCompleted,
    onDependenciesAnalyzed,
    onProgressUpdated,
    onSubtasksGenerated,
  } = options;

  const client = useApolloClient();
  const [state, setState] = useState<TaskBreakdownState>({
    breakdown: null,
    estimation: null,
    optimization: null,
    dependencies: null,
    progress: null,
    subtasks: null,
    loading: {
      breakdown: false,
      estimation: false,
      optimization: false,
      dependencies: false,
      progress: false,
      subtasks: false,
    },
    errors: {
      breakdown: null,
      estimation: null,
      optimization: null,
      dependencies: null,
      progress: null,
      subtasks: null,
    },
  });

  // Real-time updates
  const { latestBreakdown, latestProgress } = useTaskRealtime(enableRealtime ? taskId : '');

  // Generate breakdown mutation
  const [generateBreakdownMutation] = useMutation<GenerateTaskBreakdownResponse>(GENERATE_TASK_BREAKDOWN, {
    onCompleted: (data) => {
      const result = data?.generateTaskBreakdown;
      if (result?.success) {
        setState(prev => ({
          ...prev,
          breakdown: result.breakdown,
          loading: { ...prev.loading, breakdown: false },
          errors: { ...prev.errors, breakdown: null },
        }));
        onBreakdownGenerated?.(result.breakdown);
      } else {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, breakdown: false },
          errors: { ...prev.errors, breakdown: new Error(result.error || 'Failed to generate breakdown') },
        }));
      }
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, breakdown: false },
        errors: { ...prev.errors, breakdown: error },
      }));
    },
    optimisticResponse: enableOptimisticUpdates ? {
      generateTaskBreakdown: optimisticUpdates.generateTaskBreakdown(taskId),
    } : undefined,
    update: (cache, result) => {
      const { data } = result;
      if (data?.generateTaskBreakdown?.success) {
        cache.modify({
          id: `Task:${taskId}`,
          fields: {
            breakdown: () => data.generateTaskBreakdown.breakdown,
          },
        });
      }
    },
  });

  // Estimate effort mutation
  const [estimateEffortMutation] = useMutation<EstimateTaskEffortResponse>(ESTIMATE_TASK_EFFORT, {
    onCompleted: (data) => {
      const result = data?.estimateTaskEffort;
      if (result?.success) {
        setState(prev => ({
          ...prev,
          estimation: result.estimation,
          loading: { ...prev.loading, estimation: false },
          errors: { ...prev.errors, estimation: null },
        }));
        onEstimationCompleted?.(result.estimation);
      } else {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, estimation: false },
          errors: { ...prev.errors, estimation: new Error(result.error || 'Failed to estimate effort') },
        }));
      }
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, estimation: false },
        errors: { ...prev.errors, estimation: error },
      }));
    },
  });

  // Optimize task mutation
  const [optimizeTaskMutation] = useMutation(OPTIMIZE_TASK, {
    onCompleted: (data) => {
      const result = (data as any)?.optimizeTask;
      if (result?.success) {
        setState(prev => ({
          ...prev,
          optimization: result.optimization,
          loading: { ...prev.loading, optimization: false },
          errors: { ...prev.errors, optimization: null },
        }));
        onOptimizationCompleted?.(result.optimization);
      } else {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, optimization: false },
          errors: { ...prev.errors, optimization: new Error(result.error || 'Failed to optimize task') },
        }));
      }
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, optimization: false },
        errors: { ...prev.errors, optimization: error },
      }));
    },
  });

  // Analyze dependencies mutation
  const [analyzeDependenciesMutation] = useMutation(ANALYZE_TASK_DEPENDENCIES, {
    onCompleted: (data) => {
      const result = (data as any)?.analyzeTaskDependencies;
      if (result?.success) {
        setState(prev => ({
          ...prev,
          dependencies: result.analysis,
          loading: { ...prev.loading, dependencies: false },
          errors: { ...prev.errors, dependencies: null },
        }));
        onDependenciesAnalyzed?.(result.analysis);
      } else {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, dependencies: false },
          errors: { ...prev.errors, dependencies: new Error(result.error || 'Failed to analyze dependencies') },
        }));
      }
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, dependencies: false },
        errors: { ...prev.errors, dependencies: error },
      }));
    },
  });

  // Track progress mutation
  const [trackProgressMutation] = useMutation<TrackTaskProgressResponse>(TRACK_TASK_PROGRESS, {
    onCompleted: (data) => {
      const result = data?.trackTaskProgress;
      if (result?.success) {
        setState(prev => ({
          ...prev,
          progress: result.progressUpdate,
          loading: { ...prev.loading, progress: false },
          errors: { ...prev.errors, progress: null },
        }));
        onProgressUpdated?.(result.progressUpdate);
      } else {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, progress: false },
          errors: { ...prev.errors, progress: new Error(result.error || 'Failed to track progress') },
        }));
      }
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, progress: false },
        errors: { ...prev.errors, progress: error },
      }));
    },
    optimisticResponse: enableOptimisticUpdates ? (variables: any) => ({
      trackTaskProgress: {
        __typename: 'TrackTaskProgressResponse',
        success: true,
        progressUpdate: {
          __typename: 'TaskProgressUpdate', 
          taskId: taskId,
          progress: variables.input?.progress || 0,
          status: 'IN_PROGRESS',
          completedSubtasks: 0,
          currentPhase: 'In progress',
          blockers: [],
          estimatedCompletion: new Date().toISOString(),
          notes: 'Optimistic update',
          updatedAt: new Date().toISOString()
        },
        operationId: 'optimistic',
        error: null
      }
    }) : undefined,
    update: (cache, { data }) => {
      if (data?.trackTaskProgress?.success) {
        const progressUpdate = data.trackTaskProgress.progressUpdate;
        if (progressUpdate) {
          cache.modify({
            id: `Task:${taskId}`,
            fields: {
              progress: () => progressUpdate.progress,
              status: () => progressUpdate.status,
              currentPhase: () => progressUpdate.currentPhase,
            },
          });
        }
      }
    },
  });

  // Generate subtasks mutation
  const [generateSubtasksMutation] = useMutation(AUTO_GENERATE_SUBTASKS, {
    onCompleted: (data) => {
      const result = (data as any)?.autoGenerateSubtasks;
      if (result?.success) {
        setState(prev => ({
          ...prev,
          subtasks: result.subtasks,
          loading: { ...prev.loading, subtasks: false },
          errors: { ...prev.errors, subtasks: null },
        }));
        onSubtasksGenerated?.(result.subtasks);
      } else {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, subtasks: false },
          errors: { ...prev.errors, subtasks: new Error(result.error || 'Failed to generate subtasks') },
        }));
      }
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, subtasks: false },
        errors: { ...prev.errors, subtasks: error },
      }));
    },
    update: (cache, { data }) => {
      const result = (data as any)?.autoGenerateSubtasks;
      if (result?.success) {
        cache.modify({
          id: `Task:${taskId}`,
          fields: {
            subtasks: (existing = []) => [...existing, ...result.subtasks],
          },
        });
      }
    },
  });

  // Generate breakdown
  const generateBreakdown = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, breakdown: true },
      errors: { ...prev.errors, breakdown: null },
    }));

    try {
      await generateBreakdownMutation({
        variables: { taskId },
      });
    } catch (error) {
      console.error('Failed to generate breakdown:', error);
    }
  }, [taskId, generateBreakdownMutation]);

  // Estimate effort
  const estimateEffort = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, estimation: true },
      errors: { ...prev.errors, estimation: null },
    }));

    try {
      await estimateEffortMutation({
        variables: { taskId },
      });
    } catch (error) {
      console.error('Failed to estimate effort:', error);
    }
  }, [taskId, estimateEffortMutation]);

  // Optimize task
  const optimizeTask = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, optimization: true },
      errors: { ...prev.errors, optimization: null },
    }));

    try {
      await optimizeTaskMutation({
        variables: { taskId },
      });
    } catch (error) {
      console.error('Failed to optimize task:', error);
    }
  }, [taskId, optimizeTaskMutation]);

  // Analyze dependencies
  const analyzeDependencies = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, dependencies: true },
      errors: { ...prev.errors, dependencies: null },
    }));

    try {
      await analyzeDependenciesMutation({
        variables: { taskId },
      });
    } catch (error) {
      console.error('Failed to analyze dependencies:', error);
    }
  }, [taskId, analyzeDependenciesMutation]);

  // Track progress
  const trackProgress = useCallback(async (input: any) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, progress: true },
      errors: { ...prev.errors, progress: null },
    }));

    try {
      await trackProgressMutation({
        variables: { taskId, input },
      });
    } catch (error) {
      console.error('Failed to track progress:', error);
    }
  }, [taskId, trackProgressMutation]);

  // Generate subtasks
  const generateSubtasks = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, subtasks: true },
      errors: { ...prev.errors, subtasks: null },
    }));

    try {
      await generateSubtasksMutation({
        variables: { taskId },
      });
    } catch (error) {
      console.error('Failed to generate subtasks:', error);
    }
  }, [taskId, generateSubtasksMutation]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    const invalidationTargets = cacheInvalidationPatterns.invalidateTaskData(taskId);
    invalidationTargets.forEach(target => {
      client.cache.evict({ id: client.cache.identify(target) });
    });
    client.cache.gc();
  }, [client, taskId]);

  // Run full analysis
  const runFullAnalysis = useCallback(async () => {
    const operations = [
      generateBreakdown(),
      estimateEffort(),
      analyzeDependencies(),
      optimizeTask(),
    ];

    try {
      await Promise.allSettled(operations);
    } catch (error) {
      console.error('Failed to run full analysis:', error);
    }
  }, [generateBreakdown, estimateEffort, analyzeDependencies, optimizeTask]);

  return {
    // State
    breakdown: latestBreakdown?.breakdown || state.breakdown,
    estimation: state.estimation,
    optimization: state.optimization,
    dependencies: state.dependencies,
    progress: latestProgress?.progressUpdate || state.progress,
    subtasks: state.subtasks,
    loading: state.loading,
    errors: state.errors,
    
    // Computed state
    isLoading: Object.values(state.loading).some(Boolean),
    hasErrors: Object.values(state.errors).some(Boolean),
    hasData: !!(state.breakdown || state.estimation || state.optimization || state.dependencies),
    
    // Actions
    generateBreakdown,
    estimateEffort,
    optimizeTask,
    analyzeDependencies,
    trackProgress,
    generateSubtasks,
    invalidateCache,
    runFullAnalysis,
    
    // Real-time data
    latestBreakdown,
    latestProgress,
  };
}

// Hook for task progress tracking with history
export function useTaskProgressTracking(taskId: string) {
  const [progressHistory, setProgressHistory] = useState<any[]>([]);

  const hook = useTaskBreakdown(taskId, {
    onProgressUpdated: (progress) => {
      setProgressHistory(prev => [progress, ...prev]);
    },
  });

  const getProgressTrend = useCallback(() => {
    if (progressHistory.length < 2) return 'stable';
    
    const recent = progressHistory[0]?.progress || 0;
    const previous = progressHistory[1]?.progress || 0;
    
    if (recent > previous) return 'increasing';
    if (recent < previous) return 'decreasing';
    return 'stable';
  }, [progressHistory]);

  const getEstimatedCompletion = useCallback(() => {
    if (progressHistory.length < 2 || !hook.progress) return null;
    
    const currentProgress = hook.progress.progress || 0;
    const progressRate = progressHistory.reduce((acc, curr, index) => {
      if (index === 0) return acc;
      const prev = progressHistory[index - 1];
      const timeDiff = new Date(curr.updatedAt).getTime() - new Date(prev.updatedAt).getTime();
      const progressDiff = curr.progress - prev.progress;
      return acc + (progressDiff / timeDiff);
    }, 0) / (progressHistory.length - 1);

    if (progressRate <= 0) return null;

    const remainingProgress = 100 - currentProgress;
    const remainingTime = remainingProgress / progressRate;
    
    return new Date(Date.now() + remainingTime);
  }, [progressHistory, hook.progress]);

  return {
    ...hook,
    progressHistory: progressHistory.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
    progressTrend: getProgressTrend(),
    estimatedCompletion: getEstimatedCompletion(),
  };
}

// Hook for batch task operations
export function useBatchTaskBreakdown(taskIds: string[]) {
  const hooks = taskIds.map(taskId => useTaskBreakdown(taskId));

  const generateAllBreakdowns = useCallback(async () => {
    const promises = hooks.map(hook => hook.generateBreakdown());
    await Promise.allSettled(promises);
  }, [hooks]);

  const runAllAnalyses = useCallback(async () => {
    const promises = hooks.map(hook => hook.runFullAnalysis());
    await Promise.allSettled(promises);
  }, [hooks]);

  return {
    tasks: hooks.map((hook, index) => ({
      taskId: taskIds[index],
      ...hook,
    })),
    isLoading: hooks.some(hook => hook.isLoading),
    hasErrors: hooks.some(hook => hook.hasErrors),
    generateAllBreakdowns,
    runAllAnalyses,
  };
}