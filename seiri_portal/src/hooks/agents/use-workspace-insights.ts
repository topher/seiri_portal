"use client";

import { useMutation, useApolloClient } from '@apollo/client/react'; import { gql } from '@apollo/client';
import { useCallback, useState } from 'react';
import { 
  GENERATE_WORKSPACE_INSIGHTS,
  OPTIMIZE_WORKSPACE,
  GENERATE_WORKSPACE_STRATEGY,
  PERFORM_WORKSPACE_HEALTH_CHECK 
} from '@/lib/apollo/mutations';
import { useWorkspaceRealtime } from '@/lib/apollo/realtime';
import { optimisticUpdates, cacheInvalidationPatterns } from '@/lib/apollo/cache-policies';
import type { GenerateWorkspaceInsightsResponse } from '@/types/graphql';

// Types
interface WorkspaceInsightsState {
  insights: any | null;
  optimization: any | null;
  strategy: any | null;
  healthCheck: any | null;
  loading: {
    insights: boolean;
    optimization: boolean;
    strategy: boolean;
    healthCheck: boolean;
  };
  errors: {
    insights: Error | null;
    optimization: Error | null;
    strategy: Error | null;
    healthCheck: Error | null;
  };
}

interface UseWorkspaceInsightsOptions {
  enableRealtime?: boolean;
  enableOptimisticUpdates?: boolean;
  onInsightsGenerated?: (insights: any) => void;
  onOptimizationCompleted?: (optimization: any) => void;
  onStrategyGenerated?: (strategy: any) => void;
  onHealthCheckCompleted?: (healthCheck: any) => void;
}

// Main hook for workspace insights operations
export function useWorkspaceInsights(
  workspaceId: string,
  options: UseWorkspaceInsightsOptions = {}
) {
  const {
    enableRealtime = true,
    enableOptimisticUpdates = true,
    onInsightsGenerated,
    onOptimizationCompleted,
    onStrategyGenerated,
    onHealthCheckCompleted,
  } = options;

  const client = useApolloClient();
  const [state, setState] = useState<WorkspaceInsightsState>({
    insights: null,
    optimization: null,
    strategy: null,
    healthCheck: null,
    loading: {
      insights: false,
      optimization: false,
      strategy: false,
      healthCheck: false,
    },
    errors: {
      insights: null,
      optimization: null,
      strategy: null,
      healthCheck: null,
    },
  });

  // Real-time updates
  const { latestInsights } = useWorkspaceRealtime(enableRealtime ? workspaceId : '');

  // Generate insights mutation
  const [generateInsightsMutation] = useMutation<GenerateWorkspaceInsightsResponse>(GENERATE_WORKSPACE_INSIGHTS, {
    onCompleted: (data) => {
      const result = data?.generateWorkspaceInsights;
      if (result?.success) {
        setState(prev => ({
          ...prev,
          insights: result.insights,
          loading: { ...prev.loading, insights: false },
          errors: { ...prev.errors, insights: null },
        }));
        onInsightsGenerated?.(result.insights);
      } else {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, insights: false },
          errors: { ...prev.errors, insights: new Error(result.error || 'Failed to generate insights') },
        }));
      }
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, insights: false },
        errors: { ...prev.errors, insights: error },
      }));
    },
    update: (cache, { data }) => {
      if (data?.generateWorkspaceInsights?.success) {
        // Update cache with new insights
        cache.modify({
          id: `Workspace:${workspaceId}`,
          fields: {
            insights: () => data.generateWorkspaceInsights.insights,
          },
        });
      }
    },
  });

  // Optimize workspace mutation
  const [optimizeWorkspaceMutation] = useMutation(OPTIMIZE_WORKSPACE, {
    onCompleted: (data) => {
      const result = (data as any).optimizeWorkspace;
      if (result.success) {
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
          errors: { ...prev.errors, optimization: new Error(result.error || 'Failed to optimize workspace') },
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

  // Generate strategy mutation
  const [generateStrategyMutation] = useMutation(GENERATE_WORKSPACE_STRATEGY, {
    onCompleted: (data) => {
      const result = (data as any).generateWorkspaceStrategy;
      if (result.success) {
        setState(prev => ({
          ...prev,
          strategy: result.strategy,
          loading: { ...prev.loading, strategy: false },
          errors: { ...prev.errors, strategy: null },
        }));
        onStrategyGenerated?.(result.strategy);
      } else {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, strategy: false },
          errors: { ...prev.errors, strategy: new Error(result.error || 'Failed to generate strategy') },
        }));
      }
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, strategy: false },
        errors: { ...prev.errors, strategy: error },
      }));
    },
  });

  // Health check mutation
  const [performHealthCheckMutation] = useMutation(PERFORM_WORKSPACE_HEALTH_CHECK, {
    onCompleted: (data) => {
      const result = (data as any).performWorkspaceHealthCheck;
      if (result.success) {
        setState(prev => ({
          ...prev,
          healthCheck: result.healthCheck,
          loading: { ...prev.loading, healthCheck: false },
          errors: { ...prev.errors, healthCheck: null },
        }));
        onHealthCheckCompleted?.(result.healthCheck);
      } else {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, healthCheck: false },
          errors: { ...prev.errors, healthCheck: new Error(result.error || 'Failed to perform health check') },
        }));
      }
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, healthCheck: false },
        errors: { ...prev.errors, healthCheck: error },
      }));
    },
  });

  // Generate insights
  const generateInsights = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, insights: true },
      errors: { ...prev.errors, insights: null },
    }));

    // Optimistic update
    if (enableOptimisticUpdates) {
      const optimisticInsights = optimisticUpdates.generateWorkspaceInsights(workspaceId);
      setState(prev => ({
        ...prev,
        insights: optimisticInsights.insights,
      }));
    }

    try {
      await generateInsightsMutation({
        variables: { workspaceId },
      });
    } catch (error) {
      console.error('Failed to generate insights:', error);
    }
  }, [workspaceId, generateInsightsMutation, enableOptimisticUpdates]);

  // Optimize workspace
  const optimizeWorkspace = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, optimization: true },
      errors: { ...prev.errors, optimization: null },
    }));

    try {
      await optimizeWorkspaceMutation({
        variables: { workspaceId },
      });
    } catch (error) {
      console.error('Failed to optimize workspace:', error);
    }
  }, [workspaceId, optimizeWorkspaceMutation]);

  // Generate strategy
  const generateStrategy = useCallback(async (input: any) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, strategy: true },
      errors: { ...prev.errors, strategy: null },
    }));

    try {
      await generateStrategyMutation({
        variables: { workspaceId, input },
      });
    } catch (error) {
      console.error('Failed to generate strategy:', error);
    }
  }, [workspaceId, generateStrategyMutation]);

  // Perform health check
  const performHealthCheck = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, healthCheck: true },
      errors: { ...prev.errors, healthCheck: null },
    }));

    try {
      await performHealthCheckMutation({
        variables: { workspaceId },
      });
    } catch (error) {
      console.error('Failed to perform health check:', error);
    }
  }, [workspaceId, performHealthCheckMutation]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    const invalidationTargets = cacheInvalidationPatterns.invalidateWorkspaceData(workspaceId);
    invalidationTargets.forEach(target => {
      client.cache.evict({ id: client.cache.identify(target) });
    });
    client.cache.gc();
  }, [client, workspaceId]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    const promises = [
      generateInsights(),
      optimizeWorkspace(),
      performHealthCheck(),
    ];

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Failed to refresh workspace data:', error);
    }
  }, [generateInsights, optimizeWorkspace, performHealthCheck]);

  return {
    // State
    insights: latestInsights?.insights || state.insights,
    optimization: state.optimization,
    strategy: state.strategy,
    healthCheck: state.healthCheck,
    loading: state.loading,
    errors: state.errors,
    
    // Computed state
    isLoading: Object.values(state.loading).some(Boolean),
    hasErrors: Object.values(state.errors).some(Boolean),
    hasData: !!(state.insights || state.optimization || state.strategy || state.healthCheck),
    
    // Actions
    generateInsights,
    optimizeWorkspace,
    generateStrategy,
    performHealthCheck,
    invalidateCache,
    refreshAll,
    
    // Real-time data
    latestInsights,
  };
}

// Hook for workspace insights with caching
export function useWorkspaceInsightsWithCache(workspaceId: string) {
  const client = useApolloClient();
  
  // Check cache first
  const cachedData = client.cache.readFragment({
    id: `Workspace:${workspaceId}`,
    fragment: gql`
      fragment WorkspaceInsightsCache on Workspace {
        insights {
          overallHealth
          keyMetrics {
            name
            value
            trend
          }
          recommendations {
            type
            priority
            title
          }
          generatedAt
        }
      }
    `,
  });

  const hook = useWorkspaceInsights(workspaceId, {
    enableOptimisticUpdates: !(cachedData as any)?.insights,
  });

  return {
    ...hook,
    cached: !!(cachedData as any)?.insights,
    insights: (cachedData as any)?.insights || hook.insights,
  };
}

// Hook for workspace optimization tracking
export function useWorkspaceOptimizationTracking(workspaceId: string) {
  const [optimizations, setOptimizations] = useState<any[]>([]);

  const hook = useWorkspaceInsights(workspaceId, {
    onOptimizationCompleted: (optimization) => {
      setOptimizations(prev => [optimization, ...prev]);
    },
  });

  const getOptimizationHistory = useCallback(() => {
    return optimizations.sort((a, b) => 
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }, [optimizations]);

  return {
    ...hook,
    optimizationHistory: getOptimizationHistory(),
    optimizationCount: optimizations.length,
  };
}