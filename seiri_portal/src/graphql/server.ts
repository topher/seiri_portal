import "server-only";

import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFileSync } from 'fs';
import { join } from 'path';

import { resolvers, GraphQLContext } from './resolvers';
import { agentResolvers } from './resolvers/agent-resolvers';
import { workspaceAgentResolvers } from './resolvers/workspace-agent-resolvers';
import { taskAgentResolvers } from './resolvers/task-agent-resolvers';
import { suiteAgentResolvers } from './resolvers/suite-agent-resolvers';
import { initiativeAgentResolvers } from './resolvers/initiative-agent-resolvers';
import { auth } from '@clerk/nextjs/server';

// Load schema files
const baseSchema = readFileSync(
  join(process.cwd(), 'src/graphql/schema.graphql'),
  'utf-8'
);

const agentSchema = readFileSync(
  join(process.cwd(), 'src/graphql/schema/agents.graphql'),
  'utf-8'
);

// Combine schemas
const typeDefs = [baseSchema, agentSchema].join('\n');

// Merge resolvers
const mergedResolvers = {
  ...resolvers,
  Query: {
    ...resolvers.Query,
    ...agentResolvers.Query
  },
  Mutation: {
    ...resolvers.Mutation,
    ...agentResolvers.Mutation,
    ...workspaceAgentResolvers.Mutation,
    ...taskAgentResolvers.Mutation,
    ...suiteAgentResolvers.Mutation,
    ...initiativeAgentResolvers.Mutation
  },
  Subscription: {
    ...resolvers.Subscription,
    ...agentResolvers.Subscription
  }
};

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers: mergedResolvers
});

// Create Apollo Server instance
export function createApolloServer() {
  return new ApolloServer<GraphQLContext>({
    schema,
    // Enable GraphQL playground in development
    introspection: process.env.NODE_ENV === 'development',
    plugins: []
  });
}

// Context function to extract user from Clerk
export async function createGraphQLContext(request: Request): Promise<GraphQLContext> {
  try {
    console.log('Creating GraphQL context...');
    
    // Temporarily disable auth to test GraphQL server
    // TODO: Re-enable auth once GraphQL server is working
    const userId = undefined;
    
    // If we have a userId, we could fetch additional user data from Neo4j here
    let user = undefined;
    if (userId) {
      // TODO: Fetch user details from Neo4j if needed
      user = { id: userId };
    }
    
    const context = {
      userId: userId || undefined,
      user
    };
    
    console.log('Created context:', context);
    return context;
  } catch (error) {
    console.error('Error creating GraphQL context:', error);
    // Return a basic context instead of empty object
    return {
      userId: undefined,
      user: undefined
    };
  }
}

// Create server instance
export const apolloServer = createApolloServer();