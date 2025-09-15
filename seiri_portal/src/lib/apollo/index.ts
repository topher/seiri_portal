// Main Apollo Client exports
export { apolloClient } from './client';
export { ApolloProviderWrapper } from './provider';

// Cache management exports
export * from './cache-policies';

// GraphQL documents exports
export * from './queries';
export * from './mutations';
export * from './subscriptions';

// Real-time functionality exports
export * from './realtime';

// React Query integration exports
export * from './react-query-integration';

// Re-export commonly used Apollo Client types and utilities
export type {
  ApolloClient,
  NormalizedCacheObject,
  TypedDocumentNode,
  OperationVariables,
  ApolloError,
  DocumentNode,
} from '@apollo/client';

export {
  gql,
  useQuery,
  useMutation,
  useSubscription,
  useLazyQuery,
  useApolloClient as useApolloClientBase,
} from '@apollo/client';