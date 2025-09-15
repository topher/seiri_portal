import "server-only";

import { v4 as uuidv4 } from 'uuid';
import { agentRegistry } from '@/agents/registry';
import { contextEngine, NodeType } from '@/agents/context-engine';
import { runQuery, runSingleQuery } from '@/lib/neo4j';
import { GraphQLContext } from './index';

export const agentResolvers = {
  Query: {
    discoverAgents: async (
      _: any,
      { operation, contextNodeId, contextNodeType }: { 
        operation: string; 
        contextNodeId: string; 
        contextNodeType: NodeType;
      },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      // Build context for agent discovery
      const agentContext = await contextEngine.buildContext(
        contextNodeId,
        contextNodeType,
        context.userId
      );

      // Discover available agents
      const agents = await agentRegistry.discoverAgent(operation, agentContext);
      
      return agents;
    },

    getAgent: async (_: any, { name }: { name: string }) => {
      const agent = agentRegistry.getAgent(name);
      if (!agent) return null;

      const registryEntry = agentRegistry.getAllAgents().find(a => a.name === name);
      if (!registryEntry) return null;

      return {
        name: agent.name,
        type: agent.type,
        version: agent.version,
        capabilities: agent.capabilities,
        enabled: registryEntry.enabled,
        priority: registryEntry.priority,
        healthStatus: registryEntry.health.toUpperCase(),
        lastHealthCheck: new Date(), // Would come from registry
        errorCount: 0, // Would come from registry
        registeredAt: new Date() // Would come from registry
      };
    },

    listAgents: async (_: any, { type }: { type?: string }) => {
      const allAgents = agentRegistry.getAllAgents();
      const filteredAgents = type 
        ? allAgents.filter(agent => agent.type === type)
        : allAgents;

      return filteredAgents.map(registryEntry => {
        const agent = agentRegistry.getAgent(registryEntry.name);
        return agent ? {
          name: agent.name,
          type: agent.type,
          version: agent.version,
          capabilities: agent.capabilities,
          enabled: registryEntry.enabled,
          priority: registryEntry.priority,
          healthStatus: registryEntry.health.toUpperCase(),
          lastHealthCheck: new Date(),
          errorCount: 0,
          registeredAt: new Date()
        } : null;
      }).filter(Boolean);
    },

    getAgentStats: async () => {
      return await agentRegistry.getStats();
    },

    getAgentAnalytics: async (
      _: any,
      { agentName, timeRange }: { 
        agentName: string; 
        timeRange: { start: string; end: string };
      }
    ) => {
      const agent = agentRegistry.getAgent(agentName);
      if (!agent) {
        throw new Error(`Agent ${agentName} not found`);
      }

      const start = new Date(timeRange.start);
      const end = new Date(timeRange.end);

      // Get analytics from agent
      const analytics = await agent.getAnalytics({ start, end });

      // Get operation breakdown
      const operationQuery = `
        MATCH (interaction:AgentInteraction {agentName: $agentName})
        WHERE datetime(interaction.startTime) >= datetime($start)
          AND datetime(interaction.startTime) <= datetime($end)
        RETURN 
          interaction.operation as operation,
          count(*) as count,
          avg(interaction.duration) as avgResponseTime,
          sum(CASE WHEN interaction.status = 'completed' THEN 1 ELSE 0 END) * 100.0 / count(*) as successRate
        ORDER BY count DESC
      `;

      const operations = await runQuery(operationQuery, {
        agentName,
        start: start.toISOString(),
        end: end.toISOString()
      });

      // Get error breakdown
      const errorQuery = `
        MATCH (interaction:AgentInteraction {agentName: $agentName})
        WHERE datetime(interaction.startTime) >= datetime($start)
          AND datetime(interaction.startTime) <= datetime($end)
          AND interaction.status = 'failed'
          AND interaction.error IS NOT NULL
        RETURN 
          interaction.error as error,
          count(*) as count,
          max(interaction.startTime) as lastOccurrence
        ORDER BY count DESC
        LIMIT 10
      `;

      const errors = await runQuery(errorQuery, {
        agentName,
        start: start.toISOString(),
        end: end.toISOString()
      });

      return {
        agentName,
        timeRange: { start, end },
        totalInteractions: analytics.totalInteractions,
        successRate: 0.95, // Calculate from data
        avgResponseTime: analytics.avgDuration,
        cacheHitRate: analytics.cacheHitRate,
        operationBreakdown: operations.map((op: any) => ({
          operation: op.operation,
          count: op.count,
          avgResponseTime: op.avgResponseTime,
          successRate: op.successRate / 100
        })),
        errorBreakdown: errors.map((err: any) => ({
          error: err.error,
          count: err.count,
          lastOccurrence: new Date(err.lastOccurrence)
        }))
      };
    },

    getAgentInteractions: async (
      _: any,
      args: {
        agentName?: string;
        contextNodeId?: string;
        operation?: string;
        status?: string;
        limit?: number;
        offset?: number;
      }
    ) => {
      const { agentName, contextNodeId, operation, status, limit = 50, offset = 0 } = args;

      let whereConditions = [];
      let params: any = { limit, offset };

      if (agentName) {
        whereConditions.push('interaction.agentName = $agentName');
        params.agentName = agentName;
      }

      if (contextNodeId) {
        whereConditions.push('interaction.contextNodeId = $contextNodeId');
        params.contextNodeId = contextNodeId;
      }

      if (operation) {
        whereConditions.push('interaction.operation = $operation');
        params.operation = operation;
      }

      if (status) {
        whereConditions.push('interaction.status = $status');
        params.status = status;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const query = `
        MATCH (interaction:AgentInteraction)
        ${whereClause}
        RETURN interaction
        ORDER BY interaction.startTime DESC
        SKIP $offset
        LIMIT $limit
      `;

      const countQuery = `
        MATCH (interaction:AgentInteraction)
        ${whereClause}
        RETURN count(interaction) as total
      `;

      const [interactions, countResult] = await Promise.all([
        runQuery(query, params),
        runSingleQuery(countQuery, params)
      ]);

      const totalCount = countResult?.total || 0;

      return {
        nodes: interactions.map((row: any) => ({
          ...row.interaction,
          input: JSON.parse(row.interaction.input || '{}'),
          output: row.interaction.output ? JSON.parse(row.interaction.output) : null,
          metadata: JSON.parse(row.interaction.metadata || '{}'),
          startTime: new Date(row.interaction.startTime),
          endTime: row.interaction.endTime ? new Date(row.interaction.endTime) : null
        })),
        totalCount,
        hasNextPage: offset + limit < totalCount,
        hasPreviousPage: offset > 0
      };
    }
  },

  Mutation: {
    executeAgentOperation: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const operationId = uuidv4();

      try {
        // Build context
        const agentContext = await contextEngine.buildContext(
          input.contextNodeId,
          input.contextNodeType,
          context.userId
        );

        // Execute operation
        const result = await agentRegistry.executeOperation(
          input.operation,
          agentContext,
          input.input,
          {
            requireType: input.options?.requireType,
            preferAgent: input.options?.preferAgent,
            allowFallback: input.options?.allowFallback
          }
        );

        return {
          operationId,
          agentName: result.metadata.agentName,
          status: 'COMPLETED',
          data: result.data,
          error: null,
          metadata: result.metadata
        };
      } catch (error) {
        return {
          operationId,
          agentName: 'unknown',
          status: 'FAILED',
          data: null,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
          metadata: {
            duration: 0,
            cached: false,
            confidence: 0,
            modelUsed: 'unknown',
            interactionId: operationId
          }
        };
      }
    },

    enableAgent: async (_: any, { name, enabled }: { name: string; enabled: boolean }) => {
      return agentRegistry.setAgentEnabled(name, enabled);
    },

    setAgentPriority: async (_: any, { name, priority }: { name: string; priority: number }) => {
      return agentRegistry.setAgentPriority(name, priority);
    },

    performHealthCheck: async (_: any, { agentName }: { agentName?: string }) => {
      if (agentName) {
        // Check specific agent
        const agent = agentRegistry.getAgent(agentName);
        if (!agent) {
          throw new Error(`Agent ${agentName} not found`);
        }

        // Perform health check (simplified)
        const isHealthy = true; // Would implement actual health check
        
        return {
          agentName,
          status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
          lastCheck: new Date(),
          diagnostics: { status: 'ok' }
        };
      } else {
        // Check all agents
        await agentRegistry.performHealthCheck();
        
        return {
          agentName: 'all',
          status: 'HEALTHY',
          lastCheck: new Date(),
          diagnostics: { message: 'Health check completed for all agents' }
        };
      }
    },

    clearAgentCache: async (_: any, { agentName }: { agentName?: string }) => {
      // This would clear cache for specific agent
      // For now, return success
      return true;
    }
  },

  Subscription: {
    agentOperationProgress: {
      // TODO: Implement real-time progress tracking
      subscribe: () => {
        // Would use GraphQL subscriptions with pubsub
        throw new Error('Subscriptions not implemented yet');
      }
    },

    agentHealthUpdates: {
      // TODO: Implement real-time health updates
      subscribe: () => {
        throw new Error('Subscriptions not implemented yet');
      }
    },

    agentInteractionStream: {
      // TODO: Implement real-time interaction stream
      subscribe: () => {
        throw new Error('Subscriptions not implemented yet');
      }
    }
  }
};