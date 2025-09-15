/**
 * GraphQL client for Agent Mesh Service
 * Connects to the dockerized agent-mesh-service GraphQL gateway
 */

import { GraphQLClient } from 'graphql-request';
import { getSdk } from './agent-mesh-sdk';

// Agent Mesh Service Configuration
const AGENT_MESH_SERVICE_URL = process.env.NEXT_PUBLIC_AGENT_MESH_SERVICE_URL || 'http://localhost:4000/graphql';
const AGENT_MESH_API_KEY = process.env.AGENT_MESH_API_KEY;

class AgentMeshClient {
  private client: GraphQLClient;
  private sdk: ReturnType<typeof getSdk>;

  constructor() {
    this.client = new GraphQLClient(AGENT_MESH_SERVICE_URL, {
      headers: {
        'Content-Type': 'application/json',
        ...(AGENT_MESH_API_KEY && { 'Authorization': `Bearer ${AGENT_MESH_API_KEY}` }),
        'X-Client-Name': 'seiri-admin-portal',
        'X-Client-Version': '1.0.0'
      },
    });

    this.sdk = getSdk(this.client);
  }

  // Agent Management
  async getAgents() {
    return this.sdk.GetAgents();
  }

  async getAgent(id: string) {
    return this.sdk.GetAgent({ id });
  }

  async createAgent(input: any) {
    return this.sdk.CreateAgent({ input });
  }

  async updateAgent(id: string, input: any) {
    return this.sdk.UpdateAgent({ id, input });
  }

  async deleteAgent(id: string) {
    return this.sdk.DeleteAgent({ id });
  }

  // Service Orchestration
  async getServices() {
    return this.sdk.GetServices();
  }

  async executeService(serviceId: string, input: any) {
    return this.sdk.ExecuteService({ serviceId, input });
  }

  async getServiceExecution(executionId: string) {
    return this.sdk.GetServiceExecution({ executionId });
  }

  // System Monitoring
  async getSystemMetrics() {
    return this.sdk.GetSystemMetrics();
  }

  async getAgentMetrics(agentId: string) {
    return this.sdk.GetAgentMetrics({ agentId });
  }

  async getServiceMetrics(serviceId: string) {
    return this.sdk.GetServiceMetrics({ serviceId });
  }

  // Knowledge Graph
  async queryKnowledgeGraph(query: string) {
    return this.sdk.QueryKnowledgeGraph({ query });
  }

  async getOntologies() {
    return this.sdk.GetOntologies();
  }

  async updateOntology(id: string, content: string) {
    return this.sdk.UpdateOntology({ id, content });
  }

  // Vector Database
  async getVectorStats() {
    return this.sdk.GetVectorStats();
  }

  async searchVectors(query: string, filters?: any) {
    return this.sdk.SearchVectors({ query, filters });
  }

  async rebuildVectorIndex() {
    return this.sdk.RebuildVectorIndex();
  }

  // Health Check
  async healthCheck() {
    try {
      const response = await this.client.request(`
        query HealthCheck {
          health {
            status
            version
            uptime
            services {
              name
              status
              lastCheck
            }
          }
        }
      `);
      return response;
    } catch (error) {
      console.error('Agent Mesh Service health check failed:', error);
      throw error;
    }
  }

  // Subscriptions for real-time updates
  subscribe(query: string, variables?: any) {
    // WebSocket subscription setup
    // Note: This would need a WebSocket client for real-time updates
    console.warn('Subscriptions not yet implemented');
  }

  // Error handling wrapper
  private async withErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      console.error('Agent Mesh Service error:', error);
      
      // Handle specific error types
      if (error.response?.status === 401) {
        throw new Error('Unauthorized: Invalid API key');
      }
      
      if (error.response?.status === 503) {
        throw new Error('Agent Mesh Service unavailable');
      }
      
      throw error;
    }
  }
}

// Singleton instance
export const agentMeshClient = new AgentMeshClient();

// Export types for use in components
export type AgentMeshClientType = InstanceType<typeof AgentMeshClient>;

// React hooks for easier component integration
export const useAgentMeshClient = () => agentMeshClient;