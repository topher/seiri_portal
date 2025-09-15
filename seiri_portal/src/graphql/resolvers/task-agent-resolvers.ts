import "server-only";

import { v4 as uuidv4 } from 'uuid';
import { contextEngine } from '@/agents/context-engine';
import { TaskAgent } from '@/agents/task-agent';
import { llmService } from '@/agents/llm-service';
import { cacheService } from '@/agents/cache-service';
import { GraphQLContext } from './index';

// Create task agent instance
const taskAgent = new TaskAgent(llmService, cacheService);

export const taskAgentResolvers = {
  Mutation: {
    generateTaskBreakdown: async (
      _: any,
      { taskId }: { taskId: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const operationId = uuidv4();

      try {
        // Build context
        const agentContext = await contextEngine.buildContext(
          taskId,
          'TASK',
          context.userId
        );

        // Execute agent operation
        const result = await taskAgent.generateBreakdown(agentContext);

        return {
          success: true,
          breakdown: {
            ...result.data,
            generatedAt: new Date()
          },
          operationId,
          error: null
        };
      } catch (error) {
        return {
          success: false,
          breakdown: null,
          operationId,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        };
      }
    },

    estimateTaskEffort: async (
      _: any,
      { taskId }: { taskId: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const operationId = uuidv4();

      try {
        const agentContext = await contextEngine.buildContext(
          taskId,
          'TASK',
          context.userId
        );

        const result = await taskAgent.estimateEffort(agentContext);

        return {
          success: true,
          estimation: {
            ...result.data,
            generatedAt: new Date()
          },
          operationId,
          error: null
        };
      } catch (error) {
        return {
          success: false,
          estimation: null,
          operationId,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        };
      }
    },

    optimizeTask: async (
      _: any,
      { taskId }: { taskId: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const operationId = uuidv4();

      try {
        const agentContext = await contextEngine.buildContext(
          taskId,
          'TASK',
          context.userId
        );

        const result = await taskAgent.optimizeTask(agentContext);

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

    analyzeTaskDependencies: async (
      _: any,
      { taskId }: { taskId: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const operationId = uuidv4();

      try {
        const agentContext = await contextEngine.buildContext(
          taskId,
          'TASK',
          context.userId
        );

        const result = await taskAgent.analyzeDependencies(agentContext);

        return {
          success: true,
          analysis: {
            ...result.data,
            generatedAt: new Date()
          },
          operationId,
          error: null
        };
      } catch (error) {
        return {
          success: false,
          analysis: null,
          operationId,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        };
      }
    },

    trackTaskProgress: async (
      _: any,
      { taskId, input }: { taskId: string; input: any },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const operationId = uuidv4();

      try {
        const agentContext = await contextEngine.buildContext(
          taskId,
          'TASK',
          context.userId
        );

        const result = await taskAgent.trackProgress(agentContext, input);

        return {
          success: true,
          progressUpdate: {
            taskId,
            progress: input.progress || 0,
            status: input.currentPhase || 'in_progress',
            completedSubtasks: [], // Would be calculated from actual data
            currentPhase: input.currentPhase || 'development',
            blockers: input.blockers || [],
            estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 1 week
            notes: input.notes || '',
            updatedAt: new Date()
          },
          operationId,
          error: null
        };
      } catch (error) {
        return {
          success: false,
          progressUpdate: null,
          operationId,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        };
      }
    },

    autoGenerateSubtasks: async (
      _: any,
      { taskId }: { taskId: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const operationId = uuidv4();

      try {
        const agentContext = await contextEngine.buildContext(
          taskId,
          'TASK',
          context.userId
        );

        const result = await taskAgent.autoGenerateSubtasks(agentContext);

        return {
          success: true,
          subtasks: result.data,
          operationId,
          error: null
        };
      } catch (error) {
        return {
          success: false,
          subtasks: [],
          operationId,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        };
      }
    }
  }
};