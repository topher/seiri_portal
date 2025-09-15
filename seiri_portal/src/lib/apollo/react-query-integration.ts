"use client";

import { QueryClient, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApolloClient, DocumentNode } from '@apollo/client';
import { useCallback, useMemo } from 'react';

// Types
interface GraphQLQueryOptions {
  variables?: any;
  fetchPolicy?: 'cache-first' | 'cache-and-network' | 'network-only' | 'cache-only' | 'no-cache';
  errorPolicy?: 'none' | 'ignore' | 'all';
}

interface GraphQLMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onSettled?: (data: any, error: any) => void;
}

interface ReactQueryGraphQLOptions extends GraphQLQueryOptions {
  reactQueryOptions?: {
    staleTime?: number;
    cacheTime?: number;
    retry?: boolean | number;
    retryDelay?: number;
    refetchOnWindowFocus?: boolean;
    enabled?: boolean;
  };
}

// Hook to bridge Apollo Client with React Query
export function useGraphQLQuery<TData = any, TVariables = any>(
  query: DocumentNode,
  options: ReactQueryGraphQLOptions = {}
) {
  const apolloClient = useApolloClient();
  const { variables, fetchPolicy = 'cache-first', errorPolicy = 'all', reactQueryOptions = {} } = options;

  const queryKey = useMemo(() => {
    return ['graphql', query.loc?.source.body, variables];
  }, [query, variables]);

  const reactQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await apolloClient.query({
        query,
        variables,
        fetchPolicy: fetchPolicy as any,
        errorPolicy,
      });
      
      if (result.errors && errorPolicy === 'none') {
        throw new Error(result.errors[0]?.message || 'GraphQL query failed');
      }
      
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes default
    cacheTime: 10 * 60 * 1000, // 10 minutes default
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...reactQueryOptions,
  });

  return {
    ...reactQuery,
    apolloClient,
  };
}

// Hook to bridge Apollo mutations with React Query
export function useGraphQLMutation<TData = any, TVariables = any>(
  mutation: DocumentNode,
  options: GraphQLMutationOptions = {}
) {
  const apolloClient = useApolloClient();
  const queryClient = useQueryClient();
  const { onSuccess, onError, onSettled } = options;

  const reactMutation = useMutation({
    mutationFn: async (variables: TVariables) => {
      const result = await apolloClient.mutate({
        mutation,
        variables: variables as any,
        errorPolicy: 'all',
      });
      
      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'GraphQL mutation failed');
      }
      
      return result.data;
    },
    onSuccess: (data, variables, context) => {
      onSuccess?.(data);
      
      // Invalidate related React Query caches
      queryClient.invalidateQueries({ queryKey: ['graphql'] });
    },
    onError: (error, variables, context) => {
      onError?.(error);
    },
    onSettled: (data, error, variables, context) => {
      onSettled?.(data, error);
    },
  });

  return {
    ...reactMutation,
    apolloClient,
  };
}

// Hook for coordinated data fetching between Apollo and React Query
export function useHybridDataFetching() {
  const apolloClient = useApolloClient();
  const queryClient = useQueryClient();

  // Sync Apollo cache with React Query
  const syncCaches = useCallback(async (cacheKey: string[], apolloQueryKey?: string) => {
    try {
      // Get data from Apollo cache
      if (apolloQueryKey) {
        const apolloData = apolloClient.cache.readQuery({ query: apolloQueryKey as any });
        if (apolloData) {
          queryClient.setQueryData(cacheKey, apolloData);
        }
      }
    } catch (error) {
      console.warn('Failed to sync caches:', error);
    }
  }, [apolloClient, queryClient]);

  // Invalidate both caches
  const invalidateBothCaches = useCallback(async (
    reactQueryKeys?: string[][],
    apolloFieldNames?: string[]
  ) => {
    try {
      // Invalidate React Query caches
      if (reactQueryKeys) {
        reactQueryKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Invalidate Apollo caches
      if (apolloFieldNames) {
        apolloFieldNames.forEach(fieldName => {
          apolloClient.cache.evict({ fieldName });
        });
        apolloClient.cache.gc();
      }
    } catch (error) {
      console.error('Failed to invalidate caches:', error);
    }
  }, [apolloClient, queryClient]);

  // Prefetch data in both systems
  const prefetchBoth = useCallback(async (
    query: DocumentNode,
    variables?: any,
    reactQueryKey?: string[]
  ) => {
    try {
      // Prefetch in Apollo
      await apolloClient.query({
        query,
        variables,
        fetchPolicy: 'cache-first',
      });

      // Prefetch in React Query if key provided
      if (reactQueryKey) {
        await queryClient.prefetchQuery({
          queryKey: reactQueryKey,
          queryFn: async () => {
            const result = await apolloClient.query({
              query,
              variables,
              fetchPolicy: 'cache-first',
            });
            return result.data;
          },
        });
      }
    } catch (error) {
      console.error('Failed to prefetch data:', error);
    }
  }, [apolloClient, queryClient]);

  return {
    syncCaches,
    invalidateBothCaches,
    prefetchBoth,
    apolloClient,
    queryClient,
  };
}

// Hook for agent operations with React Query integration
export function useAgentOperationsWithReactQuery() {
  const hybridHook = useHybridDataFetching();

  // Invalidate agent-related caches in both systems
  const invalidateAgentCaches = useCallback(async (agentId?: string) => {
    const reactQueryKeys = [
      ['agents'],
      ['agent-analytics'],
      ['agent-operations'],
    ];

    const apolloFieldNames = [
      'discoverAgents',
      'getAgentAnalytics',
      'getAgentOperationHistory',
    ];

    if (agentId) {
      reactQueryKeys.push(['agent', agentId]);
      apolloFieldNames.push(`Agent:${agentId}`);
    }

    await hybridHook.invalidateBothCaches(reactQueryKeys, apolloFieldNames);
  }, [hybridHook]);

  // Invalidate workspace-related caches
  const invalidateWorkspaceCaches = useCallback(async (workspaceId: string) => {
    const reactQueryKeys = [
      ['workspace', workspaceId],
      ['workspace-insights', workspaceId],
      ['workspace-optimization', workspaceId],
    ];

    const apolloFieldNames = [
      'generateWorkspaceInsights',
      'optimizeWorkspace',
      'generateWorkspaceStrategy',
      'performWorkspaceHealthCheck',
    ];

    await hybridHook.invalidateBothCaches(reactQueryKeys, apolloFieldNames);
  }, [hybridHook]);

  // Invalidate task-related caches
  const invalidateTaskCaches = useCallback(async (taskId: string) => {
    const reactQueryKeys = [
      ['task', taskId],
      ['task-breakdown', taskId],
      ['task-estimation', taskId],
      ['task-progress', taskId],
    ];

    const apolloFieldNames = [
      'generateTaskBreakdown',
      'estimateTaskEffort',
      'optimizeTask',
      'analyzeTaskDependencies',
      'trackTaskProgress',
    ];

    await hybridHook.invalidateBothCaches(reactQueryKeys, apolloFieldNames);
  }, [hybridHook]);

  return {
    ...hybridHook,
    invalidateAgentCaches,
    invalidateWorkspaceCaches,
    invalidateTaskCaches,
  };
}

// Hook for migration from React Query to Apollo Client
export function useMigrationHelper() {
  const queryClient = useQueryClient();
  const apolloClient = useApolloClient();

  // Migrate React Query data to Apollo cache
  const migrateToApollo = useCallback((
    reactQueryKey: string[],
    apolloQuery: DocumentNode,
    variables?: any
  ) => {
    try {
      const reactQueryData = queryClient.getQueryData(reactQueryKey);
      if (reactQueryData) {
        apolloClient.cache.writeQuery({
          query: apolloQuery,
          variables,
          data: reactQueryData,
        });
      }
    } catch (error) {
      console.warn('Failed to migrate data to Apollo:', error);
    }
  }, [queryClient, apolloClient]);

  // Migrate Apollo data to React Query
  const migrateToReactQuery = useCallback((
    apolloQuery: DocumentNode,
    reactQueryKey: string[],
    variables?: any
  ) => {
    try {
      const apolloData = apolloClient.cache.readQuery({
        query: apolloQuery,
        variables,
      });
      if (apolloData) {
        queryClient.setQueryData(reactQueryKey, apolloData);
      }
    } catch (error) {
      console.warn('Failed to migrate data to React Query:', error);
    }
  }, [apolloClient, queryClient]);

  // Check if data exists in either cache
  const hasDataInEitherCache = useCallback((
    reactQueryKey: string[],
    apolloQuery: DocumentNode,
    variables?: any
  ) => {
    try {
      const reactQueryData = queryClient.getQueryData(reactQueryKey);
      const apolloData = apolloClient.cache.readQuery({
        query: apolloQuery,
        variables,
      });
      
      return !!(reactQueryData || apolloData);
    } catch (error) {
      return false;
    }
  }, [queryClient, apolloClient]);

  return {
    migrateToApollo,
    migrateToReactQuery,
    hasDataInEitherCache,
  };
}

// Configuration for seamless integration
export const integrationConfig = {
  // React Query default options that work well with Apollo
  reactQueryDefaults: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  },

  // Apollo Client options that work well with React Query
  apolloDefaults: {
    fetchPolicy: 'cache-first' as const,
    errorPolicy: 'all' as const,
    notifyOnNetworkStatusChange: true,
  },

  // Cache key patterns for consistency
  cacheKeyPatterns: {
    agents: (id?: string) => id ? ['agent', id] : ['agents'],
    workspace: (id: string) => ['workspace', id],
    task: (id: string) => ['task', id],
    agentOperation: (id: string) => ['agent-operation', id],
  },
};