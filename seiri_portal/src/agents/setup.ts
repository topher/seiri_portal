import "server-only";

import { agentRegistry } from './registry';
import { WorkspaceAgent } from './workspace-agent';
import { TaskAgent } from './task-agent';
import { SuiteAgent } from './suite-agent';
import { InitiativeAgent } from './initiative-agent';
import { llmService } from './llm-service';
import { cacheService } from './cache-service';
import { claudeDiscoveryService } from './discovery/claude-discovery.service';

// Agent instances
let workspaceAgent: WorkspaceAgent;
let taskAgent: TaskAgent;
let suiteAgent: SuiteAgent;
let initiativeAgent: InitiativeAgent;
let isSetup = false;

/**
 * Initialize and register all agents
 */
export function setupAgents(): void {
  if (isSetup) return;

  try {
    // Create agent instances
    workspaceAgent = new WorkspaceAgent(llmService, cacheService);
    taskAgent = new TaskAgent(llmService, cacheService);
    suiteAgent = new SuiteAgent(llmService, cacheService);
    initiativeAgent = new InitiativeAgent(llmService, cacheService);

    // Register agents with different priorities
    agentRegistry.register(workspaceAgent, 80); // High priority for workspace operations
    agentRegistry.register(taskAgent, 90); // Highest priority for task operations
    agentRegistry.register(suiteAgent, 85); // High priority for suite operations
    agentRegistry.register(initiativeAgent, 88); // Very high priority for initiative operations
    // agentRegistry.register(claudeDiscoveryService, 70); // Discovery service for external agents

    // Start Claude agent discovery
    claudeDiscoveryService.discoverClaudeAgents().catch(console.error);

    console.log('✅ Agents registered successfully:');
    console.log(`- ${workspaceAgent.name} (priority: 80)`);
    console.log(`- ${taskAgent.name} (priority: 90)`);
    console.log(`- ${suiteAgent.name} (priority: 85)`);
    console.log(`- ${initiativeAgent.name} (priority: 88)`);
    console.log(`- ${claudeDiscoveryService.name} (priority: 70)`);

    isSetup = true;
  } catch (error) {
    console.error('❌ Failed to setup agents:', error);
    throw error;
  }
}

/**
 * Get agent registry stats
 */
export async function getAgentStatus() {
  if (!isSetup) {
    setupAgents();
  }

  const stats = await agentRegistry.getStats();
  const agents = agentRegistry.getAllAgents();

  return {
    totalAgents: stats.totalAgents,
    enabledAgents: stats.enabledAgents,
    healthyAgents: stats.healthyAgents,
    agents: agents.map(agent => ({
      name: agent.name,
      type: agent.type,
      enabled: agent.enabled,
      health: agent.health,
      priority: agent.priority
    })),
    llmStatus: await llmService.getProviderStatus(),
    cacheStatus: {
      redisAvailable: cacheService.isRedisAvailable(),
      stats: await cacheService.getStats()
    }
  };
}

/**
 * Health check for all agents
 */
export async function performAgentHealthCheck() {
  if (!isSetup) {
    setupAgents();
  }

  await agentRegistry.performHealthCheck();
  
  const agents = agentRegistry.getAllAgents();
  return agents.map(agent => ({
    name: agent.name,
    type: agent.type,
    health: agent.health,
    enabled: agent.enabled
  }));
}

// Auto-setup on import in server environment
if (typeof window === 'undefined') {
  // Only setup in server environment
  try {
    setupAgents();
  } catch (error) {
    console.warn('Agent setup deferred due to initialization error:', error);
  }
}

export { workspaceAgent, taskAgent, suiteAgent, initiativeAgent, agentRegistry };