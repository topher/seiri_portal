import "server-only";

import { SuiteAgent } from '@/agents/suite-agent';
import { contextEngine } from '@/agents/context-engine';

export const suiteAgentResolvers = {
  Mutation: {
    generateSuiteAnalysis: async (
      _parent: any,
      { suiteId }: { suiteId: string },
      context: any
    ) => {
      try {
        const userId = context.userId;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        const result = await (SuiteAgent as any).generateAnalysis(suiteId);
        
        return {
          success: true,
          analysis: result.data,
          operationId: `suite-analysis-${suiteId}-${Date.now()}`,
          error: null
        };
      } catch (error: any) {
        console.error('Suite analysis generation failed:', error);
        return {
          success: false,
          analysis: null,
          operationId: `suite-analysis-${suiteId}-${Date.now()}`,
          error: error instanceof Error ? error.message : String(error) || 'Failed to generate suite analysis'
        };
      }
    },

    optimizeSuite: async (
      _parent: any,
      { suiteId }: { suiteId: string },
      context: any
    ) => {
      try {
        const userId = context.userId;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        const result = await (SuiteAgent as any).optimizeSuite(suiteId);
        
        return {
          success: true,
          optimization: result.data,
          operationId: `suite-optimization-${suiteId}-${Date.now()}`,
          error: null
        };
      } catch (error: any) {
        console.error('Suite optimization failed:', error);
        return {
          success: false,
          optimization: null,
          operationId: `suite-optimization-${suiteId}-${Date.now()}`,
          error: error instanceof Error ? error.message : String(error) || 'Failed to optimize suite'
        };
      }
    },

    generateSuiteStrategy: async (
      _parent: any,
      { suiteId, input }: { suiteId: string; input: any },
      context: any
    ) => {
      try {
        const userId = context.userId;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        const result = await (SuiteAgent as any).generateStrategy(suiteId, input);
        
        return {
          success: true,
          strategy: result.data,
          operationId: `suite-strategy-${suiteId}-${Date.now()}`,
          error: null
        };
      } catch (error: any) {
        console.error('Suite strategy generation failed:', error);
        return {
          success: false,
          strategy: null,
          operationId: `suite-strategy-${suiteId}-${Date.now()}`,
          error: error instanceof Error ? error.message : String(error) || 'Failed to generate suite strategy'
        };
      }
    },

    performSuiteHealthCheck: async (
      _parent: any,
      { suiteId }: { suiteId: string },
      context: any
    ) => {
      try {
        const userId = context.userId;
        if (!userId) {
          throw new Error('Unauthorized');
        }

        const result = await (SuiteAgent as any).performHealthCheck(suiteId);
        
        return {
          success: true,
          healthCheck: result.data,
          operationId: `suite-health-${suiteId}-${Date.now()}`,
          error: null
        };
      } catch (error: any) {
        console.error('Suite health check failed:', error);
        return {
          success: false,
          healthCheck: null,
          operationId: `suite-health-${suiteId}-${Date.now()}`,
          error: error instanceof Error ? error.message : String(error) || 'Failed to perform suite health check'
        };
      }
    }
  }
};