"use client";

import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import type { GraphQLError } from 'graphql';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

// HTTP Link
const httpLink = createHttpLink({
  uri: typeof window !== 'undefined' ? '/api/graphql' : 'http://localhost:3000/api/graphql',
});

// WebSocket Link for subscriptions (only on client)
const wsLink = typeof window !== 'undefined' ? new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:3000/api/graphql', // Update with your WebSocket endpoint
    connectionParams: () => {
      // Get auth token for WebSocket connection
      return {
        authorization: localStorage.getItem('clerk-token'),
      };
    },
    retryAttempts: 5,
    shouldRetry: () => true,
  })
) : null;

// Auth Link
const authLink = setContext(async (_, { headers }) => {
  // Get the authentication token from Clerk
  let token = '';
  
  // In client-side context, get token from Clerk
  if (typeof window !== 'undefined') {
    try {
      // Get token from Clerk's session storage or auth context
      const clerkToken = localStorage.getItem('clerk-token');
      if (clerkToken) {
        token = clerkToken;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }
  }

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error Link
const errorLink = onError(({ error }) => {
  if (error) {
    console.error(`[Error]: ${error.message || error}`);
    
    // Handle auth errors - check if it's a network error with 401 status
    if (error && typeof error === 'object' && 'statusCode' in error && (error as any).statusCode === 401) {
      // Clear any stored auth tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('clerk-token');
      }
      // Redirect to login or refresh token
    }
  }
});

// Split link for queries/mutations vs subscriptions
const splitLink = typeof window !== 'undefined' && wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      from([errorLink, authLink, httpLink])
    )
  : from([errorLink, authLink, httpLink]);

// Cache configuration
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Agent discovery caching
        discoverAgents: {
          keyArgs: ['capabilities', 'enabled'],
          merge(existing = [], incoming) {
            return incoming;
          },
        },
        // Agent analytics caching  
        getAgentAnalytics: {
          keyArgs: ['agentId', 'timeRange'],
          merge(existing, incoming) {
            return incoming;
          },
        },
        // Agent operation history
        getAgentOperationHistory: {
          keyArgs: ['agentId', 'limit', 'offset'],
          merge(existing, incoming) {
            if (!existing) return incoming;
            return {
              ...incoming,
              operations: [...(existing.operations || []), ...(incoming.operations || [])],
            };
          },
        },
        // Agent interactions caching
        getAgentInteractions: {
          keyArgs: ['contextNodeId', 'agentName'],
          merge(existing, incoming) {
            if (!existing) return incoming;
            return {
              ...incoming,
              edges: [...(existing.edges || []), ...(incoming.edges || [])],
            };
          },
        },
        // Workspace and task queries with agent-enhanced data
        workspace: {
          keyArgs: ['id'],
          merge(existing, incoming) {
            return { ...existing, ...incoming };
          },
        },
        task: {
          keyArgs: ['id'],
          merge(existing, incoming) {
            return { ...existing, ...incoming };
          },
        },
      },
    },
    Mutation: {
      fields: {
        // Agent operation mutations
        generateTaskBreakdown: {
          merge(existing, incoming) {
            return incoming;
          },
        },
        trackTaskProgress: {
          merge(existing, incoming) {
            return incoming;
          },
        },
        autoGenerateSubtasks: {
          merge(existing, incoming) {
            return incoming;
          },
        },
        generateWorkspaceInsights: {
          merge(existing, incoming) {
            return incoming;
          },
        },
        executeAgentOperation: {
          merge(existing, incoming) {
            return incoming;
          },
        },
      },
    },
    Agent: {
      keyFields: ['name'],
    },
    AgentInteraction: {
      keyFields: ['id'],
    },
    ChatMessage: {
      keyFields: ['id'],
    },
    // Agent operation results
    WorkspaceInsightsResult: {
      keyFields: false, // Don't cache these, always fetch fresh
    },
    TaskBreakdownResult: {
      keyFields: false,
    },
    Subscription: {
      fields: {
        // Real-time subscriptions
        agentOperationProgress: {
          merge(existing, incoming) {
            return incoming;
          },
        },
        agentOperationCompleted: {
          merge(existing, incoming) {
            return incoming;
          },
        },
        workspaceInsightsUpdated: {
          merge(existing, incoming) {
            return incoming;
          },
        },
        taskBreakdownUpdated: {
          merge(existing, incoming) {
            return incoming;
          },
        },
        taskProgressUpdated: {
          merge(existing, incoming) {
            return incoming;
          },
        },
        agentStatusChanged: {
          merge(existing, incoming) {
            return incoming;
          },
        },
      },
    },
  },
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache,
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Helper function to update auth token
export const updateAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('clerk-token', token);
    // Reset Apollo Client to use new token
    apolloClient.resetStore();
  }
};

// Helper function to clear auth
export const clearAuth = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('clerk-token');
    apolloClient.clearStore();
  }
};