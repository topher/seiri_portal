"use client";

import { useMutation, useQuery, useApolloClient } from '@apollo/client/react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { 
  DISCOVER_AGENTS, 
  GET_AGENT_ANALYTICS, 
  GET_AGENT_OPERATION_HISTORY 
} from '@/lib/apollo/queries';
import { EXECUTE_AGENT_OPERATION } from '@/lib/apollo/mutations';
import { useAgentOperationProgress } from '@/lib/apollo/realtime';
import type { 
  DiscoverAgentsResponse,
  GetAgentAnalyticsResponse,
  GetAgentOperationHistoryResponse,
  ExecuteAgentOperationResponse 
} from '@/types/graphql';

// Types
interface AgentOperationOptions {
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  onProgress?: (progress: any) => void;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

interface UseAgentBaseOptions {
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableRealtime?: boolean;
}

interface AgentOperationState {
  loading: boolean;
  error: Error | null;
  data: any;
  progress: number;
  stage: string;
  operationId: string | null;
}

// Main hook for agent operations
export function useAgentBase(options: UseAgentBaseOptions = {}) {
  const {
    autoRetry = true,
    maxRetries = 3,
    retryDelay = 1000,
    enableRealtime = true,
  } = options;

  const client = useApolloClient();
  const [operationState, setOperationState] = useState<AgentOperationState>({
    loading: false,
    error: null,
    data: null,
    progress: 0,
    stage: 'idle',
    operationId: null,
  });

  const retryCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time progress tracking
  const { progress: realtimeProgress } = useAgentOperationProgress(
    operationState.operationId || '',
    (progressData) => {
      if (enableRealtime && progressData) {
        setOperationState(prev => ({
          ...prev,
          progress: progressData.progress,
          stage: progressData.stage,
        }));
      }
    },
    (completedData) => {
      if (enableRealtime && completedData) {
        setOperationState(prev => ({
          ...prev,
          loading: false,
          data: completedData.result,
          progress: 100,
          stage: 'completed',
          error: completedData.error ? new Error(completedData.error) : null,
        }));
      }
    }
  );

  // Execute agent operation mutation
  const [executeOperation] = useMutation<{
    executeAgentOperation: {
      success: boolean;
      result?: any;
      error?: string;
      operationId?: string;
    };
  }>(EXECUTE_AGENT_OPERATION, {
    onCompleted: (data) => {
      const result = data.executeAgentOperation;
      if (result.success) {
        setOperationState(prev => ({
          ...prev,
          loading: false,
          data: result.result,
          operationId: result.operationId ?? null,
          error: null,
          progress: enableRealtime ? prev.progress : 100,
          stage: enableRealtime ? prev.stage : 'completed',
        }));
        retryCountRef.current = 0;
      } else {
        handleOperationError(new Error(result.error || 'Operation failed'));
      }
    },
    onError: (error) => {
      handleOperationError(error);
    },
  });

  // Error handling with retry logic
  const handleOperationError = useCallback((error: Error) => {
    console.error('Agent operation error:', error);

    if (autoRetry && retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      console.log(`Retrying operation (attempt ${retryCountRef.current}/${maxRetries})`);
      
      timeoutRef.current = setTimeout(() => {
        // Retry the last operation
        // Note: In a real implementation, you'd need to store the last operation parameters
      }, retryDelay * Math.pow(2, retryCountRef.current - 1)); // Exponential backoff
    } else {
      setOperationState(prev => ({
        ...prev,
        loading: false,
        error,
        progress: 0,
        stage: 'error',
      }));
      retryCountRef.current = 0;
    }
  }, [autoRetry, maxRetries, retryDelay]);

  // Execute operation with enhanced error handling
  const execute = useCallback(async (
    operationInput: any,
    operationOptions: AgentOperationOptions = {}
  ) => {
    const {
      retryAttempts = maxRetries,
      timeout = 30000,
      onProgress,
      onSuccess,
      onError,
    } = operationOptions;

    setOperationState({
      loading: true,
      error: null,
      data: null,
      progress: 0,
      stage: 'starting',
      operationId: null,
    });

    try {
      // Set timeout
      if (timeout > 0) {
        timeoutRef.current = setTimeout(() => {
          handleOperationError(new Error('Operation timeout'));
        }, timeout);
      }

      // Execute the operation
      const result = await executeOperation({
        variables: { input: operationInput },
      });

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (result.data?.executeAgentOperation?.success) {
        onSuccess?.(result.data.executeAgentOperation.result);
      } else {
        const error = new Error(result.data?.executeAgentOperation?.error || 'Unknown error');
        onError?.(error);
        throw error;
      }

      return result.data?.executeAgentOperation;
    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      throw err;
    }
  }, [executeOperation, maxRetries, handleOperationError]);

  // Cancel operation
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setOperationState(prev => ({
      ...prev,
      loading: false,
      stage: 'cancelled',
    }));
  }, []);

  // Reset operation state
  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setOperationState({
      loading: false,
      error: null,
      data: null,
      progress: 0,
      stage: 'idle',
      operationId: null,
    });
    
    retryCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    loading: operationState.loading,
    error: operationState.error,
    data: operationState.data,
    progress: operationState.progress,
    stage: operationState.stage,
    operationId: operationState.operationId,
    retryCount: retryCountRef.current,
    
    // Actions
    execute,
    cancel,
    reset,
    
    // Real-time progress
    realtimeProgress,
  };
}

// Hook for agent discovery
export function useAgentDiscovery(capabilities?: string[], enabled?: boolean) {
  const { data, loading, error, refetch } = useQuery<DiscoverAgentsResponse>(DISCOVER_AGENTS, {
    variables: { capabilities, enabled },
    errorPolicy: 'all',
  });

  return {
    agents: data?.discoverAgents || [],
    loading,
    error,
    refetch,
  };
}

// Hook for agent analytics
export function useAgentAnalytics(agentId?: string, timeRange?: any) {
  const { data, loading, error, refetch } = useQuery<GetAgentAnalyticsResponse>(GET_AGENT_ANALYTICS, {
    variables: { agentId, timeRange },
    skip: !agentId,
    errorPolicy: 'all',
    pollInterval: 30000, // Poll every 30 seconds
  });

  return {
    analytics: data?.getAgentAnalytics,
    loading,
    error,
    refetch,
  };
}

// Hook for agent operation history
export function useAgentOperationHistory(agentId?: string, limit = 50, offset = 0) {
  const { data, loading, error, fetchMore } = useQuery<GetAgentOperationHistoryResponse>(GET_AGENT_OPERATION_HISTORY, {
    variables: { agentId, limit, offset },
    skip: !agentId,
    errorPolicy: 'all',
  });

  const loadMore = useCallback(() => {
    if (data?.getAgentOperationHistory?.hasMore) {
      fetchMore({
        variables: {
          offset: data.getAgentOperationHistory.operations.length,
        },
      });
    }
  }, [data, fetchMore]);

  return {
    operations: data?.getAgentOperationHistory?.operations || [],
    total: data?.getAgentOperationHistory?.total || 0,
    hasMore: data?.getAgentOperationHistory?.hasMore || false,
    loading,
    error,
    loadMore,
  };
}

// Hook for cache invalidation
export function useAgentCacheInvalidation() {
  const client = useApolloClient();

  const invalidateAgentCache = useCallback((agentId?: string) => {
    if (agentId) {
      client.cache.evict({ fieldName: 'getAgentAnalytics', args: { agentId } });
      client.cache.evict({ fieldName: 'getAgentOperationHistory', args: { agentId } });
    } else {
      client.cache.evict({ fieldName: 'discoverAgents' });
      client.cache.evict({ fieldName: 'getAgentAnalytics' });
      client.cache.evict({ fieldName: 'getAgentOperationHistory' });
    }
    client.cache.gc();
  }, [client]);

  const invalidateOperationCache = useCallback((operationId: string) => {
    client.cache.evict({ id: `AgentOperation:${operationId}` });
    client.cache.gc();
  }, [client]);

  return {
    invalidateAgentCache,
    invalidateOperationCache,
  };
}