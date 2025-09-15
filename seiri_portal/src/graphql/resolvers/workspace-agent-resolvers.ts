import "server-only";

import { v4 as uuidv4 } from 'uuid';
import { contextEngine } from '@/agents/context-engine';
import { WorkspaceAgent } from '@/agents/workspace-agent';
import { llmService } from '@/agents/llm-service';
import { cacheService } from '@/agents/cache-service';
import { GraphQLContext } from './index';

// Create workspace agent instance
const workspaceAgent = new WorkspaceAgent(llmService, cacheService);

export const workspaceAgentResolvers = {
  Mutation: {
    generateWorkspaceInsights: async (
      _: any,
      { workspaceId }: { workspaceId: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const operationId = uuidv4();

      try {
        // Build context
        const agentContext = await contextEngine.buildContext(
          workspaceId,
          'WORKSPACE',
          context.userId
        );

        // Execute agent operation
        const result = await workspaceAgent.generateInsights(agentContext);

        return {
          success: true,
          insights: {
            ...result.data,
            generatedAt: new Date()
          },
          operationId,
          error: null
        };
      } catch (error) {
        return {
          success: false,
          insights: null,
          operationId,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        };
      }
    },

    optimizeWorkspace: async (
      _: any,
      { workspaceId }: { workspaceId: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const operationId = uuidv4();

      try {
        const agentContext = await contextEngine.buildContext(
          workspaceId,
          'WORKSPACE',
          context.userId
        );

        const result = await workspaceAgent.optimizeWorkspace(agentContext);

        return {
          success: true,
          optimization: {
            ...result.data,
            generatedAt: new Date()
          },
          operationId,
          error: null
        };
      } catch (error) {
        return {
          success: false,
          optimization: null,
          operationId,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        };
      }
    },

    generateWorkspaceStrategy: async (
      _: any,
      { workspaceId, input }: { workspaceId: string; input: any },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const operationId = uuidv4();

      try {
        const agentContext = await contextEngine.buildContext(
          workspaceId,
          'WORKSPACE',
          context.userId
        );

        const result = await workspaceAgent.generateStrategy(agentContext, input);

        return {
          success: true,
          strategy: {
            ...result.data,
            generatedAt: new Date()
          },
          operationId,
          error: null
        };
      } catch (error) {
        return {
          success: false,
          strategy: null,
          operationId,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        };
      }
    },

    performWorkspaceHealthCheck: async (
      _: any,
      { workspaceId }: { workspaceId: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const operationId = uuidv4();

      try {
        const agentContext = await contextEngine.buildContext(
          workspaceId,
          'WORKSPACE',
          context.userId
        );

        const result = await workspaceAgent.healthCheck(agentContext);

        return {
          success: true,
          healthCheck: {
            ...result.data,
            checkedAt: new Date()
          },
          operationId,
          error: null
        };
      } catch (error) {
        return {
          success: false,
          healthCheck: null,
          operationId,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        };
      }
    }
  }
};