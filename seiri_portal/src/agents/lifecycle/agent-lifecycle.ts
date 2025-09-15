import "server-only";

import { v4 as uuidv4 } from 'uuid';
import { runQuery, runSingleQuery } from '@/lib/neo4j';
import { toolRegistry, Tool, Resource } from '../tools/tool-system';
import { AgentContext } from '../context-engine';

// ================================
// AGENT LIFECYCLE INTERFACES
// ================================

export enum AgentLifecycleStage {
  TEMPLATE = 'template',
  INITIALIZING = 'initializing',
  LEARNING = 'learning',
  ACTIVE = 'active',
  IMPROVING = 'improving',
  PAUSED = 'paused',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived'
}

export interface AgentLifecycle {
  currentStage: AgentLifecycleStage;
  stageHistory: Array<{
    stage: AgentLifecycleStage;
    enteredAt: Date;
    reason: string;
    metrics?: Record<string, number>;
  }>;
}

export interface StatefulAgent {
  id: string;
  templateId: string;
  workspaceId: string;
  suiteId?: string;
  
  // Core characteristics (different from tools)
  stateful: true; // Agents are always stateful
  contextAware: true; // Agents maintain workspace context
  
  // Lifecycle management
  lifecycle: AgentLifecycle;
  
  // Learning and adaptation
  learningModel?: string;
  contextWindow: number; // days of history to maintain
  successRate: number;
  
  // Tool and resource connections
  toolIds: string[];
  resourceIds: string[];
  
  // Performance tracking
  totalExecutions: number;
  avgExecutionTime: number;
  lastExecution?: Date;
  
  // Configuration
  config: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  operation: string;
  context: AgentContext;
  
  // Tool usage during execution
  toolExecutions: string[];
  resourceAccesses: string[];
  
  // Results
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  success: boolean;
  executionTime: number;
  error?: string;
  
  // Learning data
  userFeedback?: {
    rating: number; // 1-5
    comments?: string;
    modifications?: Record<string, any>;
  };
  
  timestamp: Date;
}

export interface TransitionContext {
  reason: string;
  triggeredBy: 'user' | 'system' | 'scheduled';
  metadata?: Record<string, any>;
  kaizenConfig?: KaizenConfig;
}

export interface KaizenConfig {
  enabled: boolean;
  minExecutions: number;
  analysisWindow: number; // days
  improvementThreshold: number; // minimum improvement to adopt changes
}

// ================================
// AGENT LIFECYCLE MANAGER
// ================================

export class AgentLifecycleManager {
  
  /**
   * Create agent instance from template
   */
  async instantiateAgent(
    templateId: string,
    workspaceId: string,
    suiteId?: string,
    config: Record<string, any> = {}
  ): Promise<StatefulAgent> {
    const agentId = uuidv4();
    
    // Load template configuration
    const template = await this.loadAgentTemplate(templateId);
    if (!template) {
      throw new Error(`Agent template not found: ${templateId}`);
    }
    
    // Create agent in initializing state
    const agent: StatefulAgent = {
      id: agentId,
      templateId,
      workspaceId,
      suiteId,
      stateful: true,
      contextAware: true,
      
      lifecycle: {
        currentStage: AgentLifecycleStage.INITIALIZING,
        stageHistory: [{
          stage: AgentLifecycleStage.INITIALIZING,
          enteredAt: new Date(),
          reason: 'Agent instantiation started'
        }]
      },
      
      contextWindow: config.contextWindow || 30,
      successRate: 1.0, // Start optimistic
      
      toolIds: template.toolIds || [],
      resourceIds: template.resourceIds || [],
      
      totalExecutions: 0,
      avgExecutionTime: 0,
      
      config: { ...template.defaultConfig, ...config },
      
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Store in Neo4j
    await this.storeAgent(agent);
    
    // Connect tools and resources
    await this.connectAgentTools(agent);
    await this.connectAgentResources(agent);
    
    // Transition to learning state
    await this.transitionAgent(agentId, AgentLifecycleStage.LEARNING, {
      reason: 'Agent successfully instantiated',
      triggeredBy: 'system'
    });
    
    return agent;
  }
  
  /**
   * Transition agent between lifecycle stages
   */
  async transitionAgent(
    agentId: string,
    toStage: AgentLifecycleStage,
    context: TransitionContext
  ): Promise<StatefulAgent> {
    const agent = await this.loadAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Validate transition
    if (!this.isValidTransition(agent.lifecycle.currentStage, toStage)) {
      throw new Error(
        `Invalid transition: ${agent.lifecycle.currentStage} → ${toStage}`
      );
    }
    
    const fromStage = agent.lifecycle.currentStage;
    
    // Stage-specific logic
    await this.executeStageTransition(agent, toStage, context);
    
    // Update lifecycle
    agent.lifecycle.currentStage = toStage;
    agent.lifecycle.stageHistory.push({
      stage: toStage,
      enteredAt: new Date(),
      reason: context.reason,
      metrics: context.metadata
    });
    agent.updatedAt = new Date();
    
    // Store transition in Neo4j
    await this.storeLifecycleTransition(agent, fromStage, toStage, context);
    
    return agent;
  }
  
  /**
   * Execute agent operation with full lifecycle tracking
   */
  async executeAgent(
    agentId: string,
    operation: string,
    context: AgentContext,
    inputs: Record<string, any>
  ): Promise<AgentExecution> {
    const agent = await this.loadAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Verify agent is in active state
    if (agent.lifecycle.currentStage !== AgentLifecycleStage.ACTIVE) {
      throw new Error(`Agent not active. Current stage: ${agent.lifecycle.currentStage}`);
    }
    
    const executionId = uuidv4();
    const startTime = Date.now();
    
    const execution: AgentExecution = {
      id: executionId,
      agentId,
      operation,
      context,
      toolExecutions: [],
      resourceAccesses: [],
      inputs,
      success: false,
      executionTime: 0,
      timestamp: new Date()
    };
    
    try {
      // Execute the agent operation
      const result = await this.performAgentOperation(agent, operation, context, inputs, execution);
      
      execution.outputs = result;
      execution.success = true;
      execution.executionTime = Date.now() - startTime;
      
      // Update agent metrics
      await this.updateAgentMetrics(agent, execution);
      
      // Check if improvement cycle should trigger
      await this.checkForKaizenTrigger(agent);
      
      return execution;
      
    } catch (error) {
      execution.success = false;
      execution.executionTime = Date.now() - startTime;
      execution.error = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
      
      // Update agent metrics (including failure)
      await this.updateAgentMetrics(agent, execution);
      
      throw error;
    } finally {
      // Always log execution
      await this.logAgentExecution(execution);
    }
  }
  
  /**
   * Perform the actual agent operation
   * This is where agents orchestrate tools and resources
   */
  private async performAgentOperation(
    agent: StatefulAgent,
    operation: string,
    context: AgentContext,
    inputs: Record<string, any>,
    execution: AgentExecution
  ): Promise<Record<string, any>> {
    // Load agent's workspace context and history
    const agentContext = await this.buildAgentContext(agent, context);
    
    // Example operation: task breakdown
    if (operation === 'breakdownTask') {
      return await this.executeTaskBreakdown(agent, agentContext, inputs as any, execution);
    }
    
    // Example operation: analyze initiative
    if (operation === 'analyzeInitiative') {
      return await this.executeInitiativeAnalysis(agent, agentContext, inputs as any, execution);
    }
    
    throw new Error(`Unknown operation: ${operation}`);
  }
  
  /**
   * Example: Task breakdown orchestration using tools and resources
   */
  private async executeTaskBreakdown(
    agent: StatefulAgent,
    context: Record<string, any>,
    inputs: { taskId: string; description: string },
    execution: AgentExecution
  ): Promise<Record<string, any>> {
    const { taskId, description } = inputs;
    
    // Step 1: Access team velocity resource
    const velocityAccess = await toolRegistry.accessResource(
      'resource_team_velocity',
      { timeRange: '30d' },
      { agentId: agent.id, cacheStrategy: 'ttl_300' }
    );
    execution.resourceAccesses.push(velocityAccess.id);
    
    // Step 2: Access historical task patterns
    const patternsAccess = await toolRegistry.accessResource(
      'resource_task_patterns',
      { similarTo: description, limit: 10 },
      { agentId: agent.id, cacheStrategy: 'ttl_1800' }
    );
    execution.resourceAccesses.push(patternsAccess.id);
    
    // Step 3: Analyze dependencies using tool
    const dependencyTool = await toolRegistry.executeTool(
      'tool_dependency_analyzer',
      { 
        tasks: [{ id: taskId, title: description }],
        context: context
      },
      { agentId: agent.id, cacheEnabled: true }
    );
    execution.toolExecutions.push(dependencyTool.id);
    
    // Step 4: Format output using tool
    const breakdown = {
      subtasks: [
        { title: 'Research and planning', estimatedHours: 4 },
        { title: 'Implementation', estimatedHours: 8 },
        { title: 'Testing', estimatedHours: 2 },
        { title: 'Documentation', estimatedHours: 1 }
      ],
      dependencies: dependencyTool.outputs?.dependencies || [],
      totalEstimate: 15,
      riskFactors: dependencyTool.outputs?.risks || []
    };
    
    const formattedOutput = await toolRegistry.executeTool(
      'tool_json_validator',
      { json: JSON.stringify(breakdown) },
      { agentId: agent.id, cacheEnabled: true }
    );
    execution.toolExecutions.push(formattedOutput.id);
    
    return breakdown;
  }
  
  /**
   * Example: Initiative analysis orchestration
   */
  private async executeInitiativeAnalysis(
    agent: StatefulAgent,
    context: Record<string, any>,
    inputs: { initiativeId: string },
    execution: AgentExecution
  ): Promise<Record<string, any>> {
    // Similar orchestration pattern for initiative analysis
    // Using different combinations of tools and resources
    
    return {
      analysis: 'Initiative analysis completed',
      recommendations: [],
      riskAssessment: {}
    };
  }
  
  /**
   * Build enriched context for agent operations
   */
  private async buildAgentContext(
    agent: StatefulAgent,
    baseContext: AgentContext
  ): Promise<Record<string, any>> {
    // Load agent's execution history within context window
    const history = await this.getAgentExecutionHistory(
      agent.id,
      agent.contextWindow
    );
    
    // Load workspace-specific context
    const workspaceContext = await this.getWorkspaceContext(agent.workspaceId);
    
    // Load suite-specific context if applicable
    const suiteContext = agent.suiteId 
      ? await this.getSuiteContext(agent.suiteId)
      : null;
    
    return {
      baseContext,
      history,
      workspace: workspaceContext,
      suite: suiteContext,
      agentConfig: agent.config
    };
  }
  
  // ================================
  // STAGE TRANSITION LOGIC
  // ================================
  
  private async executeStageTransition(
    agent: StatefulAgent,
    toStage: AgentLifecycleStage,
    context: TransitionContext
  ): Promise<void> {
    switch (toStage) {
      case AgentLifecycleStage.LEARNING:
        await this.initiateLearning(agent, context);
        break;
        
      case AgentLifecycleStage.ACTIVE:
        await this.activateAgent(agent, context);
        break;
        
      case AgentLifecycleStage.IMPROVING:
        await this.startKaizenCycle(agent, context);
        break;
        
      case AgentLifecycleStage.PAUSED:
        await this.pauseAgent(agent, context);
        break;
        
      case AgentLifecycleStage.DEPRECATED:
        await this.deprecateAgent(agent, context);
        break;
        
      case AgentLifecycleStage.ARCHIVED:
        await this.archiveAgent(agent, context);
        break;
    }
  }
  
  private async initiateLearning(
    agent: StatefulAgent,
    context: TransitionContext
  ): Promise<void> {
    // Load historical data for initial learning
    const historicalData = await this.loadHistoricalData(agent.workspaceId);
    
    // Initialize baseline metrics
    agent.config.baselineMetrics = await this.calculateBaselineMetrics(
      agent.workspaceId
    );
    
    // Automatically transition to active after learning
    setTimeout(async () => {
      await this.transitionAgent(agent.id, AgentLifecycleStage.ACTIVE, {
        reason: 'Learning phase completed',
        triggeredBy: 'system'
      });
    }, 5000); // 5 second learning phase for demo
  }
  
  private async activateAgent(
    agent: StatefulAgent,
    context: TransitionContext
  ): Promise<void> {
    // Perform activation checks
    await this.validateAgentReadiness(agent);
    
    // Load and validate tool connections
    await this.validateToolConnections(agent);
    
    // Load and validate resource connections
    await this.validateResourceConnections(agent);
    
    // Agent is now ready for operations
  }
  
  private async startKaizenCycle(
    agent: StatefulAgent,
    context: TransitionContext
  ): Promise<void> {
    if (!context.kaizenConfig?.enabled) {
      return;
    }
    
    // Analyze recent performance
    const performanceAnalysis = await this.analyzeAgentPerformance(
      agent.id,
      context.kaizenConfig.analysisWindow
    );
    
    // Identify improvement opportunities
    const improvements = await this.identifyImprovements(performanceAnalysis);
    
    // Apply improvements if they meet threshold
    if (improvements.some(i => i.expectedImprovement > context.kaizenConfig!.improvementThreshold)) {
      await this.applyImprovements(agent, improvements);
    }
    
    // Transition back to active
    setTimeout(async () => {
      await this.transitionAgent(agent.id, AgentLifecycleStage.ACTIVE, {
        reason: 'Kaizen cycle completed',
        triggeredBy: 'system'
      });
    }, 10000); // 10 second improvement cycle for demo
  }
  
  private async pauseAgent(
    agent: StatefulAgent,
    context: TransitionContext
  ): Promise<void> {
    // Stop accepting new operations
    // Complete any in-flight operations
    // Maintain state for resumption
  }
  
  private async deprecateAgent(
    agent: StatefulAgent,
    context: TransitionContext
  ): Promise<void> {
    // Mark as deprecated
    // Set up replacement if specified in context
    // Migrate critical data
  }
  
  private async archiveAgent(
    agent: StatefulAgent,
    context: TransitionContext
  ): Promise<void> {
    // Archive all historical data
    // Remove from active agent pool
    // Maintain for historical reference only
  }
  
  // ================================
  // VALIDATION AND CHECKS
  // ================================
  
  private isValidTransition(
    fromStage: AgentLifecycleStage,
    toStage: AgentLifecycleStage
  ): boolean {
    const validTransitions: Record<AgentLifecycleStage, AgentLifecycleStage[]> = {
      [AgentLifecycleStage.TEMPLATE]: [AgentLifecycleStage.INITIALIZING],
      [AgentLifecycleStage.INITIALIZING]: [AgentLifecycleStage.LEARNING, AgentLifecycleStage.ACTIVE],
      [AgentLifecycleStage.LEARNING]: [AgentLifecycleStage.ACTIVE, AgentLifecycleStage.PAUSED],
      [AgentLifecycleStage.ACTIVE]: [AgentLifecycleStage.IMPROVING, AgentLifecycleStage.PAUSED, AgentLifecycleStage.DEPRECATED],
      [AgentLifecycleStage.IMPROVING]: [AgentLifecycleStage.ACTIVE, AgentLifecycleStage.PAUSED],
      [AgentLifecycleStage.PAUSED]: [AgentLifecycleStage.ACTIVE, AgentLifecycleStage.DEPRECATED],
      [AgentLifecycleStage.DEPRECATED]: [AgentLifecycleStage.ARCHIVED],
      [AgentLifecycleStage.ARCHIVED]: []
    };
    
    return validTransitions[fromStage]?.includes(toStage) || false;
  }
  
  private async validateAgentReadiness(agent: StatefulAgent): Promise<void> {
    // Check tool availability
    for (const toolId of agent.toolIds) {
      const tool = toolRegistry.getTool(toolId);
      if (!tool) {
        throw new Error(`Required tool not available: ${toolId}`);
      }
    }
    
    // Check resource accessibility
    for (const resourceId of agent.resourceIds) {
      const resource = toolRegistry.getResource(resourceId);
      if (!resource) {
        throw new Error(`Required resource not available: ${resourceId}`);
      }
    }
  }
  
  private async validateToolConnections(agent: StatefulAgent): Promise<void> {
    // Test tool connections
    for (const toolId of agent.toolIds) {
      try {
        // Simple validation call
        await toolRegistry.executeTool(
          toolId,
          { test: true },
          { agentId: agent.id }
        );
      } catch (error) {
        console.warn(`Tool connection warning for ${toolId}:`, error);
      }
    }
  }
  
  private async validateResourceConnections(agent: StatefulAgent): Promise<void> {
    // Test resource connections
    for (const resourceId of agent.resourceIds) {
      try {
        // Simple validation call
        await toolRegistry.accessResource(
          resourceId,
          { test: true },
          { agentId: agent.id }
        );
      } catch (error) {
        console.warn(`Resource connection warning for ${resourceId}:`, error);
      }
    }
  }
  
  // ================================
  // HELPER METHODS
  // ================================
  
  private async loadAgentTemplate(templateId: string): Promise<any> {
    const query = `
      MATCH (at:AgentTemplate {id: $templateId})
      OPTIONAL MATCH (at)-[:USES_TOOL]->(t:Tool)
      OPTIONAL MATCH (at)-[:CONSUMES_RESOURCE]->(r:Resource)
      RETURN at {
        .*,
        toolIds: collect(DISTINCT t.id),
        resourceIds: collect(DISTINCT r.id)
      }
    `;
    
    return await runSingleQuery(query, { templateId });
  }
  
  private async loadAgent(agentId: string): Promise<StatefulAgent | null> {
    const query = `
      MATCH (a:Agent {id: $agentId})
      RETURN a
    `;
    
    const result = await runSingleQuery(query, { agentId });
    return result ? this.mapAgentFromNeo4j(result) : null;
  }
  
  private async storeAgent(agent: StatefulAgent): Promise<void> {
    const query = `
      CREATE (a:Agent {
        id: $id,
        templateId: $templateId,
        workspaceId: $workspaceId,
        suiteId: $suiteId,
        stateful: true,
        contextAware: true,
        lifecycleStage: $lifecycleStage,
        contextWindow: $contextWindow,
        successRate: $successRate,
        toolIds: $toolIds,
        resourceIds: $resourceIds,
        totalExecutions: $totalExecutions,
        avgExecutionTime: $avgExecutionTime,
        config: $config,
        createdAt: $createdAt,
        updatedAt: $updatedAt
      })
    `;
    
    await runQuery(query, {
      id: agent.id,
      templateId: agent.templateId,
      workspaceId: agent.workspaceId,
      suiteId: agent.suiteId || null,
      lifecycleStage: agent.lifecycle.currentStage,
      contextWindow: agent.contextWindow,
      successRate: agent.successRate,
      toolIds: JSON.stringify(agent.toolIds),
      resourceIds: JSON.stringify(agent.resourceIds),
      totalExecutions: agent.totalExecutions,
      avgExecutionTime: agent.avgExecutionTime,
      config: JSON.stringify(agent.config),
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString()
    });
  }
  
  private async connectAgentTools(agent: StatefulAgent): Promise<void> {
    for (const toolId of agent.toolIds) {
      await runQuery(`
        MATCH (a:Agent {id: $agentId})
        MATCH (t:Tool {id: $toolId})
        CREATE (a)-[:USES_TOOL {
          connectedAt: datetime(),
          purpose: 'operational'
        }]->(t)
      `, { agentId: agent.id, toolId });
    }
  }
  
  private async connectAgentResources(agent: StatefulAgent): Promise<void> {
    for (const resourceId of agent.resourceIds) {
      await runQuery(`
        MATCH (a:Agent {id: $agentId})
        MATCH (r:Resource {id: $resourceId})
        CREATE (a)-[:CONSUMES_RESOURCE {
          connectedAt: datetime(),
          usage: 'reference'
        }]->(r)
      `, { agentId: agent.id, resourceId });
    }
  }
  
  private async storeLifecycleTransition(
    agent: StatefulAgent,
    fromStage: AgentLifecycleStage,
    toStage: AgentLifecycleStage,
    context: TransitionContext
  ): Promise<void> {
    await runQuery(`
      MATCH (a:Agent {id: $agentId})
      SET a.lifecycleStage = $newStage,
          a.updatedAt = datetime()
      CREATE (a)-[:TRANSITIONED_TO {
        fromStage: $fromStage,
        toStage: $toStage,
        timestamp: datetime(),
        reason: $reason,
        triggeredBy: $triggeredBy,
        metadata: $metadata
      }]->(ls:LifecycleStage {name: $toStage})
    `, {
      agentId: agent.id,
      newStage: toStage,
      fromStage,
      toStage,
      reason: context.reason,
      triggeredBy: context.triggeredBy,
      metadata: JSON.stringify(context.metadata || {})
    });
  }
  
  private mapAgentFromNeo4j(data: any): StatefulAgent {
    return {
      id: data.id,
      templateId: data.templateId,
      workspaceId: data.workspaceId,
      suiteId: data.suiteId,
      stateful: true,
      contextAware: true,
      lifecycle: {
        currentStage: data.lifecycleStage as AgentLifecycleStage,
        stageHistory: [] // Would load from relationships
      },
      contextWindow: data.contextWindow,
      successRate: data.successRate,
      toolIds: JSON.parse(data.toolIds || '[]'),
      resourceIds: JSON.parse(data.resourceIds || '[]'),
      totalExecutions: data.totalExecutions,
      avgExecutionTime: data.avgExecutionTime,
      config: JSON.parse(data.config || '{}'),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }
  
  // Stub methods for various operations
  private async updateAgentMetrics(agent: StatefulAgent, execution: AgentExecution): Promise<void> {
    // Update success rate, execution time, etc.
  }
  
  private async checkForKaizenTrigger(agent: StatefulAgent): Promise<void> {
    // Check if improvement cycle should trigger
  }
  
  private async logAgentExecution(execution: AgentExecution): Promise<void> {
    // Log execution to Neo4j
  }
  
  private async getAgentExecutionHistory(agentId: string, days: number): Promise<any[]> {
    return [];
  }
  
  private async getWorkspaceContext(workspaceId: string): Promise<any> {
    return {};
  }
  
  private async getSuiteContext(suiteId: string): Promise<any> {
    return {};
  }
  
  private async loadHistoricalData(workspaceId: string): Promise<any> {
    return {};
  }
  
  private async calculateBaselineMetrics(workspaceId: string): Promise<any> {
    return {};
  }
  
  private async analyzeAgentPerformance(agentId: string, days: number): Promise<any> {
    return {};
  }
  
  private async identifyImprovements(analysis: any): Promise<any[]> {
    return [];
  }
  
  private async applyImprovements(agent: StatefulAgent, improvements: any[]): Promise<void> {
    // Apply improvements to agent configuration
  }
}

// Export singleton instance
export const agentLifecycleManager = new AgentLifecycleManager();