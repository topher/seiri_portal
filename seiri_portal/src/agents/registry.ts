import "server-only";

import { BaseAgent, AgentType, AgentCapabilities, AgentResponse } from './base-agent';
import { AgentContext, NodeType } from './context-engine';
import { LLMService, llmService } from './llm-service';
import { CacheService, cacheService } from './cache-service';
import { runQuery, runSingleQuery } from '@/lib/neo4j';

export interface AgentRegistryEntry {
  agent: BaseAgent;
  registered: Date;
  enabled: boolean;
  priority: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  lastHealthCheck: Date;
  errorCount: number;
}

export interface AgentDiscoveryResult {
  agentName: string;
  agentType: AgentType;
  capabilities: AgentCapabilities;
  availableOperations: string[];
  canHandle: boolean;
  priority: number;
  healthStatus: string;
}

export interface RegistryStats {
  totalAgents: number;
  enabledAgents: number;
  healthyAgents: number;
  totalInteractions: number;
  avgResponseTime: number;
  topAgents: Array<{
    name: string;
    type: AgentType;
    interactions: number;
    avgResponseTime: number;
  }>;
}

export class AgentRegistry {
  private agents: Map<string, AgentRegistryEntry> = new Map();
  private typeIndex: Map<AgentType, BaseAgent[]> = new Map();
  private operationIndex: Map<string, BaseAgent[]> = new Map();
  private llm: LLMService;
  private cache: CacheService;

  constructor(llmServiceParam?: LLMService, cacheServiceParam?: CacheService) {
    this.llm = llmServiceParam || llmService;
    this.cache = cacheServiceParam || cacheService;
    
    // Initialize type index
    const agentTypes: AgentType[] = ['WORKSPACE', 'SUITE', 'INITIATIVE', 'TASK', 'GENERAL'];
    agentTypes.forEach(type => this.typeIndex.set(type, []));
    
    // Start health check interval
    this.startHealthChecks();
  }

  /**
   * Register a new agent
   */
  register(agent: BaseAgent, priority: number = 50): void {
    const entry: AgentRegistryEntry = {
      agent,
      registered: new Date(),
      enabled: true,
      priority,
      healthStatus: 'healthy',
      lastHealthCheck: new Date(),
      errorCount: 0
    };

    this.agents.set(agent.name, entry);
    
    // Update type index
    const typeAgents = this.typeIndex.get(agent.type) || [];
    typeAgents.push(agent);
    typeAgents.sort((a, b) => {
      const entryA = this.agents.get(a.name)!;
      const entryB = this.agents.get(b.name)!;
      return entryB.priority - entryA.priority; // Higher priority first
    });
    this.typeIndex.set(agent.type, typeAgents);

    console.log(`Registered agent: ${agent.name} (${agent.type}) with priority ${priority}`);
  }

  /**
   * Unregister an agent
   */
  unregister(agentName: string): boolean {
    const entry = this.agents.get(agentName);
    if (!entry) return false;

    // Remove from agents map
    this.agents.delete(agentName);

    // Remove from type index
    const typeAgents = this.typeIndex.get(entry.agent.type) || [];
    const filteredAgents = typeAgents.filter(agent => agent.name !== agentName);
    this.typeIndex.set(entry.agent.type, filteredAgents);

    // Remove from operation index
    this.rebuildOperationIndex();

    console.log(`Unregistered agent: ${agentName}`);
    return true;
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): BaseAgent | null {
    const entry = this.agents.get(name);
    return entry?.enabled ? entry.agent : null;
  }

  /**
   * Get all agents of a specific type
   */
  getAgentsByType(type: AgentType, enabledOnly: boolean = true): BaseAgent[] {
    const typeAgents = this.typeIndex.get(type) || [];
    
    if (!enabledOnly) return typeAgents;
    
    return typeAgents.filter(agent => {
      const entry = this.agents.get(agent.name);
      return entry?.enabled;
    });
  }

  /**
   * Discover the best agent for a specific operation and context
   */
  async discoverAgent(
    operation: string,
    context: AgentContext,
    requireType?: AgentType
  ): Promise<AgentDiscoveryResult[]> {
    const candidates: AgentDiscoveryResult[] = [];

    this.agents.forEach((entry, name) => {
      if (!entry.enabled) return;
      
      // Filter by type if specified
      if (requireType && entry.agent.type !== requireType) return;

      // Check if agent can handle the operation
      const canHandle = entry.agent.canHandleOperation(operation, context);
      if (!canHandle) return;

      // Get available operations
      const availableOperations = entry.agent.getAvailableOperations(context);

      candidates.push({
        agentName: entry.agent.name,
        agentType: entry.agent.type,
        capabilities: entry.agent.capabilities,
        availableOperations,
        canHandle,
        priority: entry.priority,
        healthStatus: entry.healthStatus
      });
    });

    // Sort by priority and health
    return candidates.sort((a, b) => {
      if (a.healthStatus !== b.healthStatus) {
        const healthOrder = { healthy: 3, degraded: 2, unhealthy: 1 };
        return healthOrder[b.healthStatus as keyof typeof healthOrder] - 
               healthOrder[a.healthStatus as keyof typeof healthOrder];
      }
      return b.priority - a.priority;
    });
  }

  /**
   * Execute an operation using the best available agent
   */
  async executeOperation<T>(
    operation: string,
    context: AgentContext,
    input: any,
    options: {
      requireType?: AgentType;
      preferAgent?: string;
      allowFallback?: boolean;
    } = {}
  ): Promise<AgentResponse<T>> {
    // Try preferred agent first
    if (options.preferAgent) {
      const preferredAgent = this.getAgent(options.preferAgent);
      if (preferredAgent && preferredAgent.canHandleOperation(operation, context)) {
        try {
          return await this.executeWithAgent(preferredAgent, operation, context, input);
        } catch (error) {
          console.warn(`Preferred agent ${options.preferAgent} failed, trying fallback:`, error);
          if (!options.allowFallback) throw error;
        }
      }
    }

    // Discover available agents
    const candidates = await this.discoverAgent(operation, context, options.requireType);
    
    if (candidates.length === 0) {
      throw new Error(`No agent available to handle operation '${operation}' for ${context.nodeType}`);
    }

    // Try agents in priority order
    let lastError: Error | null = null;
    
    for (const candidate of candidates) {
      if (candidate.healthStatus === 'unhealthy') continue;
      
      const agent = this.getAgent(candidate.agentName);
      if (!agent) continue;

      try {
        const result = await this.executeWithAgent(agent, operation, context, input);
        
        // Success - update health status
        await this.updateAgentHealth(candidate.agentName, true);
        
        return result as AgentResponse<T>;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Agent ${candidate.agentName} failed:`, error);
        
        // Update health status
        await this.updateAgentHealth(candidate.agentName, false);
        
        // Continue to next agent if fallback is allowed
        if (options.allowFallback) continue;
        break;
      }
    }

    throw lastError || new Error('All agents failed to execute operation');
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<RegistryStats> {
    const totalAgents = this.agents.size;
    const enabledAgents = Array.from(this.agents.values()).filter(entry => entry.enabled).length;
    const healthyAgents = Array.from(this.agents.values()).filter(entry => 
      entry.enabled && entry.healthStatus === 'healthy'
    ).length;

    // Get interaction stats from Neo4j
    const statsQuery = `
      MATCH (interaction:AgentInteraction)
      WHERE datetime(interaction.startTime) >= datetime() - duration('P7D')
      RETURN 
        count(interaction) as totalInteractions,
        avg(interaction.duration) as avgResponseTime,
        interaction.agentName as agentName,
        interaction.agentType as agentType,
        count(*) as agentInteractions,
        avg(interaction.duration) as agentAvgResponseTime
      ORDER BY agentInteractions DESC
      LIMIT 10
    `;

    const statsResult = await runQuery(statsQuery);
    
    const topAgents = statsResult.map(row => ({
      name: row.agentName,
      type: row.agentType as AgentType,
      interactions: row.agentInteractions,
      avgResponseTime: row.agentAvgResponseTime || 0
    }));

    return {
      totalAgents,
      enabledAgents,
      healthyAgents,
      totalInteractions: statsResult[0]?.totalInteractions || 0,
      avgResponseTime: statsResult[0]?.avgResponseTime || 0,
      topAgents: topAgents.slice(0, 5)
    };
  }

  /**
   * Enable or disable an agent
   */
  setAgentEnabled(name: string, enabled: boolean): boolean {
    const entry = this.agents.get(name);
    if (!entry) return false;

    entry.enabled = enabled;
    console.log(`Agent ${name} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Update agent priority
   */
  setAgentPriority(name: string, priority: number): boolean {
    const entry = this.agents.get(name);
    if (!entry) return false;

    entry.priority = priority;
    
    // Rebuild type index to maintain priority order
    this.rebuildTypeIndex();
    
    console.log(`Agent ${name} priority updated to ${priority}`);
    return true;
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): Array<{ name: string; type: AgentType; enabled: boolean; priority: number; health: string }> {
    return Array.from(this.agents.entries()).map(([name, entry]) => ({
      name,
      type: entry.agent.type,
      enabled: entry.enabled,
      priority: entry.priority,
      health: entry.healthStatus
    }));
  }

  /**
   * Health check for all agents
   */
  async performHealthCheck(): Promise<void> {
    const promises = Array.from(this.agents.keys()).map(name => 
      this.checkAgentHealth(name)
    );
    
    await Promise.all(promises);
  }

  // Private methods
  private async executeWithAgent<T>(
    agent: BaseAgent,
    operation: string,
    context: AgentContext,
    input: any
  ): Promise<AgentResponse<T>> {
    // This would call the agent's execute method
    // For now, we'll define a simple interface
    if (typeof (agent as any).execute === 'function') {
      return await (agent as any).execute(operation, context, input);
    }
    
    throw new Error(`Agent ${agent.name} does not implement execute method`);
  }

  private async updateAgentHealth(name: string, success: boolean): Promise<void> {
    const entry = this.agents.get(name);
    if (!entry) return;

    if (success) {
      entry.errorCount = Math.max(0, entry.errorCount - 1);
    } else {
      entry.errorCount++;
    }

    // Update health status based on error count
    if (entry.errorCount === 0) {
      entry.healthStatus = 'healthy';
    } else if (entry.errorCount < 5) {
      entry.healthStatus = 'degraded';
    } else {
      entry.healthStatus = 'unhealthy';
    }

    entry.lastHealthCheck = new Date();
  }

  private async checkAgentHealth(name: string): Promise<void> {
    const entry = this.agents.get(name);
    if (!entry) return;

    try {
      // Simple health check - you could extend this
      const isHealthy = entry.agent.name.length > 0; // Basic check
      
      if (isHealthy) {
        entry.healthStatus = 'healthy';
        entry.errorCount = Math.max(0, entry.errorCount - 1);
      } else {
        entry.healthStatus = 'unhealthy';
        entry.errorCount++;
      }
    } catch (error) {
      entry.healthStatus = 'unhealthy';
      entry.errorCount++;
    }

    entry.lastHealthCheck = new Date();
  }

  private rebuildTypeIndex(): void {
    this.typeIndex.clear();
    
    const agentTypes: AgentType[] = ['WORKSPACE', 'SUITE', 'INITIATIVE', 'TASK', 'GENERAL'];
    agentTypes.forEach(type => this.typeIndex.set(type, []));

    this.agents.forEach((entry) => {
      const typeAgents = this.typeIndex.get(entry.agent.type) || [];
      typeAgents.push(entry.agent);
      this.typeIndex.set(entry.agent.type, typeAgents);
    });

    // Sort by priority
    this.typeIndex.forEach((agents, type) => {
      agents.sort((a, b) => {
        const entryA = this.agents.get(a.name)!;
        const entryB = this.agents.get(b.name)!;
        return entryB.priority - entryA.priority;
      });
    });
  }

  private rebuildOperationIndex(): void {
    this.operationIndex.clear();
    
    // This would be built based on agent capabilities
    // For now, keeping it simple
  }

  private startHealthChecks(): void {
    // Perform health checks every 5 minutes
    setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('Health check failed:', error);
      });
    }, 5 * 60 * 1000);
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry();