import "server-only";

import { initiativeAgent } from '@/agents/initiative-agent';
import { contextEngine } from '@/agents/context-engine';

export const initiativeAgentResolvers = {
  Mutation: {
    generateInitiativePlanning: async (
      _parent: any,
      { initiativeId, requirements }: { initiativeId: string; requirements?: any },
      context: any
    ) => {
      try {
        const userId = context.userId;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        const result = await initiativeAgent.generatePlanning(initiativeId, requirements || {});
        
        return {
          success: true,
          planning: result.data,
          operationId: `initiative-planning-${initiativeId}-${Date.now()}`,
          error: null
        };
      } catch (error: any) {
        console.error('Initiative planning generation failed:', error);
        return {
          success: false,
          planning: null,
          operationId: `initiative-planning-${initiativeId}-${Date.now()}`,
          error: error instanceof Error ? error.message : String(error) || 'Failed to generate initiative planning'
        };
      }
    },

    generateInitiativeStrategy: async (
      _parent: any,
      { initiativeId, input }: { initiativeId: string; input: any },
      context: any
    ) => {
      try {
        const userId = context.userId;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        const result = await initiativeAgent.generateStrategy(initiativeId, input);
        
        return {
          success: true,
          strategy: result.data,
          operationId: `initiative-strategy-${initiativeId}-${Date.now()}`,
          error: null
        };
      } catch (error: any) {
        console.error('Initiative strategy generation failed:', error);
        return {
          success: false,
          strategy: null,
          operationId: `initiative-strategy-${initiativeId}-${Date.now()}`,
          error: error instanceof Error ? error.message : String(error) || 'Failed to generate initiative strategy'
        };
      }
    },

    trackInitiativeProgress: async (
      _parent: any,
      { initiativeId }: { initiativeId: string },
      context: any
    ) => {
      try {
        const userId = context.userId;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        const result = await initiativeAgent.trackProgress(initiativeId);
        
        return {
          success: true,
          progress: result.data,
          operationId: `initiative-progress-${initiativeId}-${Date.now()}`,
          error: null
        };
      } catch (error: any) {
        console.error('Initiative progress tracking failed:', error);
        return {
          success: false,
          progress: null,
          operationId: `initiative-progress-${initiativeId}-${Date.now()}`,
          error: error instanceof Error ? error.message : String(error) || 'Failed to track initiative progress'
        };
      }
    },

    autoGenerateInitiativeTasks: async (
      _parent: any,
      { initiativeId, requirements }: { initiativeId: string; requirements?: any },
      context: any
    ) => {
      try {
        const userId = context.userId;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        const result = await initiativeAgent.autoGenerateTasks(initiativeId, requirements || {});
        
        return {
          success: true,
          tasks: result.data,
          operationId: `initiative-tasks-${initiativeId}-${Date.now()}`,
          error: null
        };
      } catch (error: any) {
        console.error('Initiative task generation failed:', error);
        return {
          success: false,
          tasks: [],
          operationId: `initiative-tasks-${initiativeId}-${Date.now()}`,
          error: error instanceof Error ? error.message : String(error) || 'Failed to generate initiative tasks'
        };
      }
    }
  }
};