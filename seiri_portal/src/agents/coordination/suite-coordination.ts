import "server-only";

import { v4 as uuidv4 } from 'uuid';
import { runQuery, runSingleQuery } from '@/lib/neo4j';
import { agentLifecycleManager, StatefulAgent } from '../lifecycle/agent-lifecycle';
import { toolRegistry } from '../tools/tool-system';
import { AgentContext } from '../context-engine';

// ================================
// SIMPLIFIED COORDINATION INTERFACES
// ================================

export interface SuiteCoordination {
  id: string;
  suiteId: string;
  workspaceId: string;
  
  // Simple coordination patterns
  primaryAgent: string; // Main agent responsible for suite
  supportingAgents: string[]; // Other agents that assist
  
  // Coordination rules (simplified)
  coordinationRules: CoordinationRule[];
  
  // Status
  active: boolean;
  lastActivity: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CoordinationRule {
  id: string;
  name: string;
  trigger: string; // Simple trigger description
  action: 'delegate' | 'collaborate' | 'escalate' | 'notify';
  targetAgents: string[]; // Which agents to involve
  condition: string; // When this rule applies
  priority: number;
}

export interface AgentCollaboration {
  id: string;
  coordinationId: string;
  initiatingAgent: string;
  participatingAgents: string[];
  
  // Simple workflow
  type: 'sequential' | 'parallel' | 'review';
  status: 'pending' | 'active' | 'completed' | 'failed';
  
  // Context
  operation: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  
  // Timing
  startTime: Date;
  endTime?: Date;
  
  // Human oversight (simplified)
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

// ================================
// SUITE COORDINATION MANAGER
// ================================

export class SuiteCoordinationManager {
  
  /**
   * Set up coordination for a suite
   */
  async setupSuiteCoordination(
    suiteId: string,
    workspaceId: string,
    primaryAgentId: string,
    supportingAgentIds: string[] = []
  ): Promise<SuiteCoordination> {
    const coordinationId = uuidv4();
    
    // Create default coordination rules based on suite type
    const defaultRules = await this.createDefaultCoordinationRules(suiteId);
    
    const coordination: SuiteCoordination = {
      id: coordinationId,
      suiteId,
      workspaceId,
      primaryAgent: primaryAgentId,
      supportingAgents: supportingAgentIds,
      coordinationRules: defaultRules,
      active: true,
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.storeCoordination(coordination);
    return coordination;
  }
  
  /**
   * Execute operation with suite coordination
   */
  async coordinateOperation(
    suiteId: string,
    operation: string,
    context: AgentContext,
    inputs: Record<string, any>
  ): Promise<any> {
    const coordination = await this.getSuiteCoordination(suiteId);
    if (!coordination) {
      throw new Error(`No coordination setup for suite: ${suiteId}`);
    }
    
    // Determine coordination pattern based on operation
    const pattern = this.determineCoordinationPattern(operation, coordination);
    
    // Execute based on pattern
    switch (pattern.type) {
      case 'sequential':
        return await this.executeSequentialCoordination(coordination, operation, context, inputs);
      
      case 'parallel':
        return await this.executeParallelCoordination(coordination, operation, context, inputs);
      
      case 'review':
        return await this.executeReviewCoordination(coordination, operation, context, inputs);
      
      default:
        // Simple single-agent execution
        return await this.executeSingleAgent(coordination.primaryAgent, operation, context, inputs);
    }
  }
  
  /**
   * Sequential coordination - agents work one after another
   */
  private async executeSequentialCoordination(
    coordination: SuiteCoordination,
    operation: string,
    context: AgentContext,
    inputs: Record<string, any>
  ): Promise<any> {
    const collaborationId = uuidv4();
    const allAgents = [coordination.primaryAgent, ...coordination.supportingAgents];
    
    const collaboration: AgentCollaboration = {
      id: collaborationId,
      coordinationId: coordination.id,
      initiatingAgent: coordination.primaryAgent,
      participatingAgents: allAgents,
      type: 'sequential',
      status: 'active',
      operation,
      inputs,
      outputs: {},
      startTime: new Date(),
      requiresApproval: this.operationRequiresApproval(operation)
    };
    
    let currentInputs = inputs;
    let finalOutputs = {};
    
    try {
      // Execute agents sequentially
      for (const agentId of allAgents) {
        const agentResult = await agentLifecycleManager.executeAgent(
          agentId,
          operation,
          context,
          currentInputs
        );
        
        // Use output as input for next agent
        currentInputs = { ...currentInputs, ...agentResult.outputs };
        finalOutputs = { ...finalOutputs, [agentId]: agentResult.outputs };
      }
      
      collaboration.status = 'completed';
      collaboration.outputs = finalOutputs;
      collaboration.endTime = new Date();
      
      // Check if approval needed
      if (collaboration.requiresApproval) {
        await this.requestApproval(collaboration);
      }
      
      await this.storeCollaboration(collaboration);
      return finalOutputs;
      
    } catch (error) {
      collaboration.status = 'failed';
      collaboration.endTime = new Date();
      await this.storeCollaboration(collaboration);
      throw error;
    }
  }
  
  /**
   * Parallel coordination - agents work simultaneously
   */
  private async executeParallelCoordination(
    coordination: SuiteCoordination,
    operation: string,
    context: AgentContext,
    inputs: Record<string, any>
  ): Promise<any> {
    const collaborationId = uuidv4();
    const allAgents = [coordination.primaryAgent, ...coordination.supportingAgents];
    
    const collaboration: AgentCollaboration = {
      id: collaborationId,
      coordinationId: coordination.id,
      initiatingAgent: coordination.primaryAgent,
      participatingAgents: allAgents,
      type: 'parallel',
      status: 'active',
      operation,
      inputs,
      outputs: {},
      startTime: new Date(),
      requiresApproval: this.operationRequiresApproval(operation)
    };
    
    try {
      // Execute all agents in parallel
      const agentPromises = allAgents.map(agentId =>
        agentLifecycleManager.executeAgent(agentId, operation, context, inputs)
          .then(result => ({ agentId, result }))
          .catch(error => ({ agentId, error }))
      );
      
      const results = await Promise.allSettled(agentPromises);
      
      // Collect results and errors
      const outputs: Record<string, any> = {};
      const errors: Record<string, any> = {};
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const value = result.value;
          if ('error' in value) {
            errors[value.agentId] = value.error;
          } else {
            outputs[value.agentId] = value.result.outputs;
          }
        } else {
          errors[allAgents[index]] = result.reason;
        }
      });
      
      // If any critical errors, fail the collaboration
      if (Object.keys(errors).length > 0 && allAgents.includes(coordination.primaryAgent) && errors[coordination.primaryAgent]) {
        throw new Error(`Primary agent failed: ${errors[coordination.primaryAgent]}`);
      }
      
      collaboration.status = 'completed';
      collaboration.outputs = outputs;
      collaboration.endTime = new Date();
      
      if (collaboration.requiresApproval) {
        await this.requestApproval(collaboration);
      }
      
      await this.storeCollaboration(collaboration);
      return outputs;
      
    } catch (error) {
      collaboration.status = 'failed';
      collaboration.endTime = new Date();
      await this.storeCollaboration(collaboration);
      throw error;
    }
  }
  
  /**
   * Review coordination - primary agent works, others review
   */
  private async executeReviewCoordination(
    coordination: SuiteCoordination,
    operation: string,
    context: AgentContext,
    inputs: Record<string, any>
  ): Promise<any> {
    const collaborationId = uuidv4();
    
    const collaboration: AgentCollaboration = {
      id: collaborationId,
      coordinationId: coordination.id,
      initiatingAgent: coordination.primaryAgent,
      participatingAgents: [coordination.primaryAgent, ...coordination.supportingAgents],
      type: 'review',
      status: 'active',
      operation,
      inputs,
      outputs: {},
      startTime: new Date(),
      requiresApproval: true // Review always requires approval
    };
    
    try {
      // Primary agent does the work
      const primaryResult = await agentLifecycleManager.executeAgent(
        coordination.primaryAgent,
        operation,
        context,
        inputs
      );
      
      // Supporting agents review the work
      const reviewInputs = {
        ...inputs,
        reviewTarget: primaryResult.outputs,
        reviewType: 'quality_check'
      };
      
      const reviews: Record<string, any> = {};
      for (const reviewerAgentId of coordination.supportingAgents) {
        try {
          const reviewResult = await agentLifecycleManager.executeAgent(
            reviewerAgentId,
            'reviewWork',
            context,
            reviewInputs
          );
          reviews[reviewerAgentId] = reviewResult.outputs;
        } catch (error) {
          console.warn(`Review failed for agent ${reviewerAgentId}:`, error);
          reviews[reviewerAgentId] = { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) };
        }
      }
      
      const outputs = {
        primary: primaryResult.outputs,
        reviews,
        approved: this.calculateApprovalStatus(reviews)
      };
      
      collaboration.status = 'completed';
      collaboration.outputs = outputs;
      collaboration.endTime = new Date();
      
      await this.requestApproval(collaboration);
      await this.storeCollaboration(collaboration);
      
      return outputs;
      
    } catch (error) {
      collaboration.status = 'failed';
      collaboration.endTime = new Date();
      await this.storeCollaboration(collaboration);
      throw error;
    }
  }
  
  /**
   * Simple single-agent execution
   */
  private async executeSingleAgent(
    agentId: string,
    operation: string,
    context: AgentContext,
    inputs: Record<string, any>
  ): Promise<any> {
    return await agentLifecycleManager.executeAgent(agentId, operation, context, inputs);
  }
  
  /**
   * Determine coordination pattern for operation
   */
  private determineCoordinationPattern(
    operation: string,
    coordination: SuiteCoordination
  ): { type: 'sequential' | 'parallel' | 'review' | 'single' } {
    // Simple rules for coordination patterns
    
    // Complex operations that benefit from sequential processing
    if (['breakdownInitiative', 'planProject', 'createStrategy'].includes(operation)) {
      return { type: 'sequential' };
    }
    
    // Operations that can be done in parallel
    if (['analyzeMarket', 'gatherRequirements', 'researchCompetitors'].includes(operation)) {
      return { type: 'parallel' };
    }
    
    // Operations that need review
    if (['finalizeSpec', 'approveStrategy', 'validateRequirements'].includes(operation)) {
      return { type: 'review' };
    }
    
    // Default to single agent
    return { type: 'single' };
  }
  
  /**
   * Create default coordination rules for suite type
   */
  private async createDefaultCoordinationRules(suiteId: string): Promise<CoordinationRule[]> {
    // Get suite type
    const suite = await this.getSuite(suiteId);
    if (!suite) return [];
    
    const rules: CoordinationRule[] = [];
    
    switch (suite.type) {
      case 'PRODUCT':
        rules.push(
          {
            id: uuidv4(),
            name: 'Persona Validation',
            trigger: 'persona_created',
            action: 'collaborate',
            targetAgents: ['marketing-agent', 'research-agent'],
            condition: 'new_persona_requires_validation',
            priority: 1
          },
          {
            id: uuidv4(),
            name: 'Feature Feasibility Check',
            trigger: 'feature_proposed',
            action: 'delegate',
            targetAgents: ['development-agent'],
            condition: 'technical_feasibility_unknown',
            priority: 2
          }
        );
        break;
        
      case 'MARKETING':
        rules.push(
          {
            id: uuidv4(),
            name: 'Campaign Review',
            trigger: 'campaign_created',
            action: 'escalate',
            targetAgents: ['brand-agent', 'compliance-agent'],
            condition: 'campaign_needs_approval',
            priority: 1
          }
        );
        break;
        
      case 'DEVELOPMENT':
        rules.push(
          {
            id: uuidv4(),
            name: 'Architecture Review',
            trigger: 'architecture_proposed',
            action: 'collaborate',
            targetAgents: ['security-agent', 'performance-agent'],
            condition: 'architecture_impacts_multiple_areas',
            priority: 1
          }
        );
        break;
    }
    
    return rules;
  }
  
  /**
   * Determine if operation requires approval
   */
  private operationRequiresApproval(operation: string): boolean {
    const approvalRequired = [
      'finalizeSpec',
      'approveStrategy', 
      'launchCampaign',
      'deployArchitecture',
      'releaseFeature'
    ];
    
    return approvalRequired.includes(operation);
  }
  
  /**
   * Calculate approval status from reviews
   */
  private calculateApprovalStatus(reviews: Record<string, any>): boolean {
    const reviewResults = Object.values(reviews);
    const approvals = reviewResults.filter(review => 
      review.approved === true || review.status === 'approved'
    );
    
    // Simple majority rule
    return approvals.length > reviewResults.length / 2;
  }
  
  /**
   * Request human approval for collaboration
   */
  private async requestApproval(collaboration: AgentCollaboration): Promise<void> {
    // In a real system, this would integrate with a human approval workflow
    // For now, just log the request
    console.log(`Approval requested for collaboration ${collaboration.id}`);
    
    // Auto-approve for demo purposes
    collaboration.approvedBy = 'system';
    collaboration.approvedAt = new Date();
  }
  
  // ================================
  // STORAGE AND RETRIEVAL
  // ================================
  
  private async storeCoordination(coordination: SuiteCoordination): Promise<void> {
    await runQuery(`
      CREATE (sc:SuiteCoordination {
        id: $id,
        suiteId: $suiteId,
        workspaceId: $workspaceId,
        primaryAgent: $primaryAgent,
        supportingAgents: $supportingAgents,
        coordinationRules: $coordinationRules,
        active: $active,
        lastActivity: $lastActivity,
        createdAt: $createdAt,
        updatedAt: $updatedAt
      })
    `, {
      id: coordination.id,
      suiteId: coordination.suiteId,
      workspaceId: coordination.workspaceId,
      primaryAgent: coordination.primaryAgent,
      supportingAgents: JSON.stringify(coordination.supportingAgents),
      coordinationRules: JSON.stringify(coordination.coordinationRules),
      active: coordination.active,
      lastActivity: coordination.lastActivity.toISOString(),
      createdAt: coordination.createdAt.toISOString(),
      updatedAt: coordination.updatedAt.toISOString()
    });
  }
  
  private async storeCollaboration(collaboration: AgentCollaboration): Promise<void> {
    await runQuery(`
      CREATE (ac:AgentCollaboration {
        id: $id,
        coordinationId: $coordinationId,
        initiatingAgent: $initiatingAgent,
        participatingAgents: $participatingAgents,
        type: $type,
        status: $status,
        operation: $operation,
        inputs: $inputs,
        outputs: $outputs,
        startTime: $startTime,
        endTime: $endTime,
        requiresApproval: $requiresApproval,
        approvedBy: $approvedBy,
        approvedAt: $approvedAt
      })
    `, {
      id: collaboration.id,
      coordinationId: collaboration.coordinationId,
      initiatingAgent: collaboration.initiatingAgent,
      participatingAgents: JSON.stringify(collaboration.participatingAgents),
      type: collaboration.type,
      status: collaboration.status,
      operation: collaboration.operation,
      inputs: JSON.stringify(collaboration.inputs),
      outputs: JSON.stringify(collaboration.outputs),
      startTime: collaboration.startTime.toISOString(),
      endTime: collaboration.endTime?.toISOString() || null,
      requiresApproval: collaboration.requiresApproval,
      approvedBy: collaboration.approvedBy || null,
      approvedAt: collaboration.approvedAt?.toISOString() || null
    });
  }
  
  async getSuiteCoordination(suiteId: string): Promise<SuiteCoordination | null> {
    const query = `
      MATCH (sc:SuiteCoordination {suiteId: $suiteId, active: true})
      RETURN sc
    `;
    
    const result = await runSingleQuery(query, { suiteId });
    return result ? this.mapCoordinationFromNeo4j(result.sc) : null;
  }
  
  private async getSuite(suiteId: string): Promise<{ type: string } | null> {
    const query = `
      MATCH (s:Suite {id: $suiteId})
      RETURN s.type as type
    `;
    
    return await runSingleQuery(query, { suiteId });
  }
  
  private mapCoordinationFromNeo4j(data: any): SuiteCoordination {
    return {
      id: data.id,
      suiteId: data.suiteId,
      workspaceId: data.workspaceId,
      primaryAgent: data.primaryAgent,
      supportingAgents: JSON.parse(data.supportingAgents || '[]'),
      coordinationRules: JSON.parse(data.coordinationRules || '[]'),
      active: data.active,
      lastActivity: new Date(data.lastActivity),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }
  
  // ================================
  // PUBLIC API METHODS
  // ================================
  
  /**
   * Get active collaborations for a suite
   */
  async getActiveCollaborations(suiteId: string): Promise<AgentCollaboration[]> {
    const query = `
      MATCH (sc:SuiteCoordination {suiteId: $suiteId})<-[:BELONGS_TO]-(ac:AgentCollaboration)
      WHERE ac.status IN ['pending', 'active']
      RETURN ac
      ORDER BY ac.startTime DESC
    `;
    
    const results = await runQuery(query, { suiteId });
    return results.map(r => this.mapCollaborationFromNeo4j(r.ac));
  }
  
  /**
   * Get collaboration history for a suite
   */
  async getCollaborationHistory(
    suiteId: string, 
    limit: number = 50
  ): Promise<AgentCollaboration[]> {
    const query = `
      MATCH (sc:SuiteCoordination {suiteId: $suiteId})<-[:BELONGS_TO]-(ac:AgentCollaboration)
      RETURN ac
      ORDER BY ac.startTime DESC
      LIMIT $limit
    `;
    
    const results = await runQuery(query, { suiteId, limit });
    return results.map(r => this.mapCollaborationFromNeo4j(r.ac));
  }
  
  /**
   * Update coordination rules
   */
  async updateCoordinationRules(
    coordinationId: string,
    rules: CoordinationRule[]
  ): Promise<void> {
    await runQuery(`
      MATCH (sc:SuiteCoordination {id: $coordinationId})
      SET sc.coordinationRules = $rules,
          sc.updatedAt = datetime()
    `, {
      coordinationId,
      rules: JSON.stringify(rules)
    });
  }
  
  private mapCollaborationFromNeo4j(data: any): AgentCollaboration {
    return {
      id: data.id,
      coordinationId: data.coordinationId,
      initiatingAgent: data.initiatingAgent,
      participatingAgents: JSON.parse(data.participatingAgents || '[]'),
      type: data.type as 'sequential' | 'parallel' | 'review',
      status: data.status as 'pending' | 'active' | 'completed' | 'failed',
      operation: data.operation,
      inputs: JSON.parse(data.inputs || '{}'),
      outputs: JSON.parse(data.outputs || '{}'),
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      requiresApproval: data.requiresApproval,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined
    };
  }
}

// Export singleton instance
export const suiteCoordinationManager = new SuiteCoordinationManager();