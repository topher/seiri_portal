import { FieldPolicy, TypedDocumentNode } from '@apollo/client';

// Cache policies for agent operations
export const agentCachePolicies = {
  // Agent discovery - cache for 5 minutes
  discoverAgents: {
    merge: (existing: any[] = [], incoming: any[]) => {
      return incoming; // Always use latest agent list
    },
  } as FieldPolicy,

  // Agent analytics - merge with existing data
  getAgentAnalytics: {
    merge: (existing: any = {}, incoming: any) => {
      return { ...existing, ...incoming };
    },
  } as FieldPolicy,

  // Agent operations history - append new results
  getAgentOperationHistory: {
    merge: (existing: any[] = [], incoming: any[]) => {
      // Merge and deduplicate by operationId
      const merged = [...existing];
      incoming.forEach((item: any) => {
        const existingIndex = merged.findIndex(
          (existing: any) => existing.operationId === item.operationId
        );
        if (existingIndex >= 0) {
          merged[existingIndex] = item;
        } else {
          merged.push(item);
        }
      });
      return merged.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
  } as FieldPolicy,
};

// Cache policies for workspace operations
export const workspaceCachePolicies = {
  // Workspace insights - cache with timestamp-based invalidation
  insights: {
    merge: (existing: any, incoming: any) => {
      // Always use the latest insights
      return incoming;
    },
  } as FieldPolicy,

  // Workspace optimization - cache recommendations
  optimization: {
    merge: (existing: any, incoming: any) => {
      return incoming;
    },
  } as FieldPolicy,

  // Workspace strategy - cache strategic plans
  strategy: {
    merge: (existing: any, incoming: any) => {
      return incoming;
    },
  } as FieldPolicy,

  // Workspace health check - cache health reports
  healthCheck: {
    merge: (existing: any, incoming: any) => {
      return incoming;
    },
  } as FieldPolicy,
};

// Cache policies for task operations
export const taskCachePolicies = {
  // Task breakdown - cache breakdown results
  breakdown: {
    merge: (existing: any, incoming: any) => {
      return incoming;
    },
  } as FieldPolicy,

  // Task estimation - cache effort estimates
  estimation: {
    merge: (existing: any, incoming: any) => {
      return incoming;
    },
  } as FieldPolicy,

  // Task optimization - cache optimization suggestions
  optimization: {
    merge: (existing: any, incoming: any) => {
      return incoming;
    },
  } as FieldPolicy,

  // Task dependencies - cache dependency analysis
  dependencies: {
    merge: (existing: any, incoming: any) => {
      return incoming;
    },
  } as FieldPolicy,

  // Subtasks - append new subtasks to existing list
  subtasks: {
    merge: (existing: any[] = [], incoming: any[]) => {
      // Merge and deduplicate by subtask ID
      const merged = [...existing];
      incoming.forEach((subtask: any) => {
        const existingIndex = merged.findIndex(
          (existing: any) => existing.id === subtask.id
        );
        if (existingIndex >= 0) {
          merged[existingIndex] = subtask;
        } else {
          merged.push(subtask);
        }
      });
      return merged;
    },
  } as FieldPolicy,

  // Progress tracking - keep history of progress updates
  progressHistory: {
    merge: (existing: any[] = [], incoming: any[]) => {
      return [...existing, ...incoming].sort((a: any, b: any) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },
  } as FieldPolicy,
};

// Cache invalidation patterns
export const cacheInvalidationPatterns = {
  // After workspace operations, invalidate workspace-related data
  invalidateWorkspaceData: (workspaceId: string) => [
    { __typename: 'Workspace', id: workspaceId },
    { __typename: 'WorkspaceInsights', workspaceId },
    { __typename: 'WorkspaceOptimization', workspaceId },
    { __typename: 'WorkspaceStrategy', workspaceId },
    { __typename: 'WorkspaceHealthCheck', workspaceId },
  ],

  // After task operations, invalidate task-related data
  invalidateTaskData: (taskId: string) => [
    { __typename: 'Task', id: taskId },
    { __typename: 'TaskBreakdown', taskId },
    { __typename: 'TaskEstimation', taskId },
    { __typename: 'TaskOptimization', taskId },
    { __typename: 'TaskDependencyAnalysis', taskId },
  ],

  // After agent operations, invalidate agent analytics
  invalidateAgentData: () => [
    { __typename: 'AgentAnalytics' },
    { __typename: 'AgentOperationHistory' },
  ],
};

// Optimistic update helpers
export const optimisticUpdates = {
  // Optimistic update for task breakdown generation
  generateTaskBreakdown: (taskId: string) => ({
    __typename: 'TaskBreakdownResult',
    success: true,
    breakdown: {
      __typename: 'TaskBreakdown',
      taskId,
      subtasks: [],
      complexity: 'MEDIUM',
      estimatedHours: 0,
      dependencies: [],
      risks: [],
      generatedAt: new Date().toISOString(),
    },
    operationId: `optimistic-${Date.now()}`,
    error: null,
  }),

  // Optimistic update for workspace insights generation
  generateWorkspaceInsights: (workspaceId: string) => ({
    __typename: 'WorkspaceInsightsResult',
    success: true,
    insights: {
      __typename: 'WorkspaceInsights',
      workspaceId,
      overallHealth: 75,
      keyMetrics: [],
      trends: [],
      recommendations: [],
      generatedAt: new Date().toISOString(),
    },
    operationId: `optimistic-${Date.now()}`,
    error: null,
  }),

  // Optimistic update for task progress tracking
  trackTaskProgress: (taskId: string, progress: number) => ({
    __typename: 'TaskProgressResult',
    success: true,
    progressUpdate: {
      __typename: 'TaskProgressUpdate',
      taskId,
      progress,
      status: 'IN_PROGRESS',
      completedSubtasks: [],
      currentPhase: 'DEVELOPMENT',
      blockers: [],
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: '',
      updatedAt: new Date().toISOString(),
    },
    operationId: `optimistic-${Date.now()}`,
    error: null,
  }),
};

// Cache timing configurations
export const cacheTimings = {
  // Short-lived cache for real-time data (30 seconds)
  realTime: 30 * 1000,
  
  // Medium-lived cache for analytics (5 minutes)
  analytics: 5 * 60 * 1000,
  
  // Long-lived cache for generated content (30 minutes)
  generated: 30 * 60 * 1000,
  
  // Very long-lived cache for static data (2 hours)
  static: 2 * 60 * 60 * 1000,
};