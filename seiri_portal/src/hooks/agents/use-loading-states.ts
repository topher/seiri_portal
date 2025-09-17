"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useApolloClient } from '@apollo/client/react';

// Types
interface LoadingState {
  isLoading: boolean;
  stage: string;
  progress: number;
  message: string;
  startTime: number | null;
  duration: number;
}

interface GlobalLoadingState {
  [operationId: string]: LoadingState;
}

interface UseLoadingStatesOptions {
  autoTimeout?: number;
  showProgress?: boolean;
  trackDuration?: boolean;
  groupOperations?: boolean;
}

// Global loading state management
class LoadingStateManager {
  private states: GlobalLoadingState = {};
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  setLoading(operationId: string, loading: boolean, stage?: string, progress?: number, message?: string) {
    if (loading) {
      this.states[operationId] = {
        isLoading: true,
        stage: stage || 'starting',
        progress: progress || 0,
        message: message || '',
        startTime: Date.now(),
        duration: 0,
      };
    } else {
      const existing = this.states[operationId];
      if (existing) {
        this.states[operationId] = {
          ...existing,
          isLoading: false,
          stage: stage || 'completed',
          progress: progress || 100,
          message: message || 'Completed',
          duration: existing.startTime ? Date.now() - existing.startTime : 0,
        };
        
        // Clean up completed operations after a delay
        setTimeout(() => {
          delete this.states[operationId];
          this.notify();
        }, 5000);
      }
    }
    this.notify();
  }

  updateProgress(operationId: string, progress: number, stage?: string, message?: string) {
    const existing = this.states[operationId];
    if (existing) {
      this.states[operationId] = {
        ...existing,
        progress,
        stage: stage || existing.stage,
        message: message || existing.message,
        duration: existing.startTime ? Date.now() - existing.startTime : 0,
      };
      this.notify();
    }
  }

  getState(operationId: string): LoadingState | null {
    return this.states[operationId] || null;
  }

  getAllStates(): GlobalLoadingState {
    return { ...this.states };
  }

  getActiveOperations(): string[] {
    return Object.keys(this.states).filter(id => this.states[id].isLoading);
  }

  clearCompleted() {
    Object.keys(this.states).forEach(id => {
      if (!this.states[id].isLoading) {
        delete this.states[id];
      }
    });
    this.notify();
  }

  clearAll() {
    this.states = {};
    this.notify();
  }
}

// Global instance
const loadingStateManager = new LoadingStateManager();

// Hook for managing loading states
export function useLoadingStates(options: UseLoadingStatesOptions = {}) {
  const {
    autoTimeout = 30000,
    showProgress = true,
    trackDuration = true,
    groupOperations = false,
  } = options;

  const [localStates, setLocalStates] = useState<GlobalLoadingState>({});
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = loadingStateManager.subscribe(() => {
      setLocalStates(loadingStateManager.getAllStates());
    });
    return unsubscribe as any;
  }, []);

  // Start loading operation
  const startLoading = useCallback((
    operationId: string,
    initialStage = 'starting',
    initialMessage = 'Starting operation...'
  ) => {
    loadingStateManager.setLoading(operationId, true, initialStage, 0, initialMessage);

    // Set auto-timeout
    if (autoTimeout > 0) {
      const timeout = setTimeout(() => {
        loadingStateManager.setLoading(operationId, false, 'timeout', 0, 'Operation timed out');
      }, autoTimeout);
      
      timeoutsRef.current.set(operationId, timeout);
    }
  }, [autoTimeout]);

  // Update progress
  const updateProgress = useCallback((
    operationId: string,
    progress: number,
    stage?: string,
    message?: string
  ) => {
    loadingStateManager.updateProgress(operationId, progress, stage, message);
  }, []);

  // Complete loading operation
  const completeLoading = useCallback((
    operationId: string,
    finalStage = 'completed',
    finalMessage = 'Operation completed'
  ) => {
    // Clear timeout
    const timeout = timeoutsRef.current.get(operationId);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(operationId);
    }

    loadingStateManager.setLoading(operationId, false, finalStage, 100, finalMessage);
  }, []);

  // Fail loading operation
  const failLoading = useCallback((
    operationId: string,
    errorMessage = 'Operation failed'
  ) => {
    // Clear timeout
    const timeout = timeoutsRef.current.get(operationId);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(operationId);
    }

    loadingStateManager.setLoading(operationId, false, 'error', 0, errorMessage);
  }, []);

  // Get loading state for specific operation
  const getLoadingState = useCallback((operationId: string) => {
    return loadingStateManager.getState(operationId);
  }, []);

  // Get all active operations
  const getActiveOperations = useCallback(() => {
    return loadingStateManager.getActiveOperations();
  }, []);

  // Check if any operations are loading
  const isAnyLoading = useCallback(() => {
    return getActiveOperations().length > 0;
  }, [getActiveOperations]);

  // Clear completed operations
  const clearCompleted = useCallback(() => {
    loadingStateManager.clearCompleted();
  }, []);

  // Clear all operations
  const clearAll = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
    
    loadingStateManager.clearAll();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  return {
    // State
    states: localStates,
    activeOperations: getActiveOperations(),
    isAnyLoading: isAnyLoading(),
    
    // Actions
    startLoading,
    updateProgress,
    completeLoading,
    failLoading,
    getLoadingState,
    getActiveOperations,
    clearCompleted,
    clearAll,
  };
}

// Hook for operation-specific loading state
export function useOperationLoading(operationId: string) {
  const { states, startLoading, updateProgress, completeLoading, failLoading } = useLoadingStates();
  const state = states[operationId];

  return {
    isLoading: state?.isLoading || false,
    stage: state?.stage || 'idle',
    progress: state?.progress || 0,
    message: state?.message || '',
    duration: state?.duration || 0,
    startLoading: () => startLoading(operationId),
    updateProgress: (progress: number, stage?: string, message?: string) => 
      updateProgress(operationId, progress, stage, message),
    completeLoading: (stage?: string, message?: string) => 
      completeLoading(operationId, stage, message),
    failLoading: (message?: string) => failLoading(operationId, message),
  };
}

// Hook for cache invalidation management
export function useCacheInvalidation() {
  const client = useApolloClient();
  const [invalidationQueue, setInvalidationQueue] = useState<string[]>([]);
  const processingRef = useRef(false);

  // Queue cache invalidation
  const queueInvalidation = useCallback((cacheKey: string) => {
    setInvalidationQueue(prev => [...prev, cacheKey]);
  }, []);

  // Process invalidation queue
  const processInvalidationQueue = useCallback(async () => {
    if (processingRef.current || invalidationQueue.length === 0) return;

    processingRef.current = true;
    
    try {
      // Batch process invalidations
      const uniqueKeys = Array.from(new Set(invalidationQueue));
      
      uniqueKeys.forEach(key => {
        client.cache.evict({ fieldName: key });
      });
      
      client.cache.gc();
      setInvalidationQueue([]);
    } catch (error) {
      console.error('Failed to process cache invalidation:', error);
    } finally {
      processingRef.current = false;
    }
  }, [client, invalidationQueue]);

  // Auto-process queue with debouncing
  useEffect(() => {
    const timer = setTimeout(processInvalidationQueue, 1000);
    return () => clearTimeout(timer);
  }, [invalidationQueue, processInvalidationQueue]);

  // Invalidate specific cache keys
  const invalidateCache = useCallback((cacheKeys: string | string[]) => {
    const keys = Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys];
    keys.forEach(key => queueInvalidation(key));
  }, [queueInvalidation]);

  // Invalidate workspace-related cache
  const invalidateWorkspaceCache = useCallback((workspaceId: string) => {
    const keys = [
      'generateWorkspaceInsights',
      'optimizeWorkspace',
      'generateWorkspaceStrategy',
      'performWorkspaceHealthCheck',
      `Workspace:${workspaceId}`,
    ];
    invalidateCache(keys);
  }, [invalidateCache]);

  // Invalidate task-related cache
  const invalidateTaskCache = useCallback((taskId: string) => {
    const keys = [
      'generateTaskBreakdown',
      'estimateTaskEffort',
      'optimizeTask',
      'analyzeTaskDependencies',
      'trackTaskProgress',
      'autoGenerateSubtasks',
      `Task:${taskId}`,
    ];
    invalidateCache(keys);
  }, [invalidateCache]);

  // Invalidate agent-related cache
  const invalidateAgentCache = useCallback((agentId?: string) => {
    const keys = [
      'discoverAgents',
      'getAgentAnalytics',
      'getAgentOperationHistory',
      'executeAgentOperation',
    ];
    
    if (agentId) {
      keys.push(`Agent:${agentId}`);
    }
    
    invalidateCache(keys);
  }, [invalidateCache]);

  return {
    queueLength: invalidationQueue.length,
    isProcessing: processingRef.current,
    invalidateCache,
    invalidateWorkspaceCache,
    invalidateTaskCache,
    invalidateAgentCache,
    processInvalidationQueue,
  };
}

// Hook for coordinated loading and cache management
export function useCoordinatedOperations() {
  const loadingHook = useLoadingStates();
  const cacheHook = useCacheInvalidation();

  const executeWithLoadingAndCache = useCallback(async (
    operationId: string,
    operation: () => Promise<any>,
    cacheKeys?: string[]
  ) => {
    loadingHook.startLoading(operationId);
    
    try {
      const result = await operation();
      loadingHook.completeLoading(operationId);
      
      if (cacheKeys) {
        cacheHook.invalidateCache(cacheKeys);
      }
      
      return result;
    } catch (error) {
      loadingHook.failLoading(operationId, error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Operation failed');
      throw error;
    }
  }, [loadingHook, cacheHook]);

  return {
    ...loadingHook,
    ...cacheHook,
    executeWithLoadingAndCache,
  };
}