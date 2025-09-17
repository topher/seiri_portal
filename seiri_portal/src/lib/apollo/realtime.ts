"use client";

import { useSubscription, useApolloClient } from '@apollo/client/react';
import { useCallback, useEffect, useRef } from 'react';
import React from 'react';
import { 
  AGENT_OPERATION_PROGRESS,
  AGENT_OPERATION_COMPLETED,
  WORKSPACE_INSIGHTS_UPDATED,
  TASK_BREAKDOWN_UPDATED,
  TASK_PROGRESS_UPDATED,
  AGENT_STATUS_CHANGED 
} from './subscriptions';

// Types for subscription data
interface AgentOperationProgress {
  operationId: string;
  agentId: string;
  status: string;
  progress: number;
  stage: string;
  message: string;
  result?: any;
  error?: string;
  timestamp: string;
}

interface AgentOperationCompleted {
  operationId: string;
  agentId: string;
  operationType: string;
  result: any;
  status: string;
  duration: number;
  error?: string;
  completedAt: string;
}

// Hook for tracking agent operation progress
export function useAgentOperationProgress(
  operationId: string,
  onProgress?: (data: AgentOperationProgress) => void,
  onCompleted?: (data: AgentOperationCompleted) => void
) {
  const { data: progressData, loading: progressLoading, error: progressError } = useSubscription(
    AGENT_OPERATION_PROGRESS,
    {
      variables: { operationId },
      skip: !operationId,
      onData: ({ data }) => {
        if ((data as any)?.agentOperationProgress && onProgress) {
          onProgress((data as any).agentOperationProgress);
        }
      },
    }
  );

  const { data: completedData, loading: completedLoading, error: completedError } = useSubscription(
    AGENT_OPERATION_COMPLETED,
    {
      onData: ({ data }) => {
        const completed = (data as any)?.agentOperationCompleted;
        if (completed?.operationId === operationId && onCompleted) {
          onCompleted(completed);
        }
      },
    }
  );

  return {
    progress: (progressData as any)?.agentOperationProgress,
    completed: (completedData as any)?.agentOperationCompleted,
    loading: progressLoading || completedLoading,
    error: progressError || completedError,
  };
}

// Hook for workspace real-time updates
export function useWorkspaceRealtime(workspaceId: string) {
  const client = useApolloClient();

  const { data: insightsData } = useSubscription(WORKSPACE_INSIGHTS_UPDATED, {
    variables: { workspaceId },
    skip: !workspaceId,
    onData: ({ data }) => {
      // Update Apollo cache when insights are updated
      const insights = (data as any)?.workspaceInsightsUpdated;
      if (insights) {
        client.cache.modify({
          id: `Workspace:${workspaceId}`,
          fields: {
            insights: () => insights.insights,
          },
        });
      }
    },
  });

  return {
    latestInsights: (insightsData as any)?.workspaceInsightsUpdated,
  };
}

// Hook for task real-time updates
export function useTaskRealtime(taskId: string) {
  const client = useApolloClient();

  const { data: breakdownData } = useSubscription(TASK_BREAKDOWN_UPDATED, {
    variables: { taskId },
    skip: !taskId,
    onData: ({ data }) => {
      const breakdown = (data as any)?.taskBreakdownUpdated;
      if (breakdown) {
        client.cache.modify({
          id: `Task:${taskId}`,
          fields: {
            breakdown: () => breakdown.breakdown,
          },
        });
      }
    },
  });

  const { data: progressData } = useSubscription(TASK_PROGRESS_UPDATED, {
    variables: { taskId },
    skip: !taskId,
    onData: ({ data }) => {
      const progress = (data as any)?.taskProgressUpdated;
      if (progress) {
        client.cache.modify({
          id: `Task:${taskId}`,
          fields: {
            progress: () => progress.progressUpdate.progress,
            status: () => progress.progressUpdate.status,
            currentPhase: () => progress.progressUpdate.currentPhase,
          },
        });
      }
    },
  });

  return {
    latestBreakdown: (breakdownData as any)?.taskBreakdownUpdated,
    latestProgress: (progressData as any)?.taskProgressUpdated,
  };
}

// Hook for agent status monitoring
export function useAgentStatusMonitoring(onStatusChange?: (data: any) => void) {
  const { data } = useSubscription(AGENT_STATUS_CHANGED, {
    onData: ({ data }) => {
      const statusChange = (data as any)?.agentStatusChanged;
      if (statusChange && onStatusChange) {
        onStatusChange(statusChange);
      }
    },
  });

  return {
    latestStatusChange: (data as any)?.agentStatusChanged,
  };
}

// Custom hook for managing subscription connections
export function useSubscriptionManager() {
  const activeSubscriptions = useRef<Set<string>>(new Set());
  const client = useApolloClient();

  const subscribe = useCallback((subscriptionKey: string) => {
    activeSubscriptions.current.add(subscriptionKey);
  }, []);

  const unsubscribe = useCallback((subscriptionKey: string) => {
    activeSubscriptions.current.delete(subscriptionKey);
  }, []);

  const unsubscribeAll = useCallback(() => {
    activeSubscriptions.current.clear();
    // Clean up any active subscriptions
    client.stop();
  }, [client]);

  useEffect(() => {
    return () => {
      unsubscribeAll();
    };
  }, [unsubscribeAll]);

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll,
    activeCount: activeSubscriptions.current.size,
  };
}

// Real-time connection status hook
export function useConnectionStatus() {
  const client = useApolloClient();
  const [isConnected, setIsConnected] = React.useState(true);
  const [reconnectAttempts, setReconnectAttempts] = React.useState(0);

  useEffect(() => {
    // Monitor WebSocket connection status
    const link = client.link;
    
    // This is a simplified connection monitoring
    // In a real implementation, you'd hook into the WebSocket events
    const checkConnection = () => {
      // Implementation would depend on the specific WebSocket client
      // For now, we'll assume connection is always available
      setIsConnected(true);
    };

    const interval = setInterval(checkConnection, 5000);
    
    return () => clearInterval(interval);
  }, [client]);

  const reconnect = useCallback(() => {
    setReconnectAttempts(prev => prev + 1);
    // Implement reconnection logic
    client.resetStore();
  }, [client]);

  return {
    isConnected,
    reconnectAttempts,
    reconnect,
  };
}

// Hook for batch subscription management
export function useBatchSubscriptions(subscriptions: Array<{
  query: any;
  variables?: any;
  onData?: (data: any) => void;
}>) {
  const results = subscriptions.map(({ query, variables, onData }) => 
    useSubscription(query, {
      variables,
      onData: onData ? ({ data }) => onData(data) : undefined,
    })
  );

  return {
    results,
    loading: results.some(r => r.loading),
    errors: results.filter(r => r.error).map(r => r.error),
    hasErrors: results.some(r => r.error),
  };
}