import "server-only";

import { v4 as uuidv4 } from 'uuid';
import { runQuery, runSingleQuery } from '@/lib/neo4j';
import { AgentContext } from '../context-engine';
import { GraphCapabilityAgent } from '../graph-capability-agent';

// Agent Coordination Pattern Types
export interface AgentCoordinationPattern {
  id: string;
  name: string;
  type: 'sequential' | 'parallel' | 'hybrid' | 'hierarchical';
  description: string;
  stages: CoordinationStage[];
  transitions: CoordinationTransition[];
  checkpoints: HumanCheckpoint[];
  metadata: {
    version: string;
    category: string;
    priority: number;
    estimatedDuration: number;
    requiredResources: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CoordinationStage {
  id: string;
  name: string;
  agentTemplateId: string;
  operation: string;
  inputs: string[];
  expectedOutputs: string[];
  validationRules: string[];
  dependencies: string[];
  parallelizable: boolean;
  timeout: number;
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

export interface CoordinationTransition {
  id: string;
  fromStage: string;
  toStage: string;
  condition: string;
  conditionParams: Record<string, any>;
  delay?: number;
  metadata: Record<string, any>;
}

export interface HumanCheckpoint {
  id: string;
  name: string;
  type: 'approval' | 'review' | 'input' | 'quality_gate';
  description: string;
  afterStage: string;
  timeout: number;
  escalationPath: string[];
  requiredRoles: string[];
  metadata: Record<string, any>;
}

export interface CoordinationExecution {
  id: string;
  patternId: string;
  workspaceId: string;
  initiatorId: string;
  context: AgentContext;
  status: 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';
  currentStageId?: string;
  stageExecutions: StageExecution[];
  checkpointApprovals: CheckpointApproval[];
  results: Record<string, any>;
  error?: string;
  startTime: Date;
  endTime?: Date;
  metadata: Record<string, any>;
}

export interface StageExecution {
  id: string;
  stageId: string;
  agentInstanceId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  error?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  retryCount: number;
  metadata: Record<string, any>;
}

export interface CheckpointApproval {
  id: string;
  checkpointId: string;
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
  approverIds: string[];
  comments: string;
  requestedAt: Date;
  respondedAt?: Date;
  metadata: Record<string, any>;
}

/**
 * Agent Coordination Service
 * Manages agent coordination patterns and orchestrates multi-agent workflows
 */
export class AgentCoordinationService {
  private patterns: Map<string, AgentCoordinationPattern> = new Map();
  private activeExecutions: Map<string, CoordinationExecution> = new Map();

  constructor() {
    this.initializeDefaultPatterns();
  }

  /**
   * Initialize default coordination patterns from existing services
   */
  private async initializeDefaultPatterns(): Promise<void> {
    // Convert PRD Suite Workflow Service to Agent Coordination Pattern
    const prdPattern: AgentCoordinationPattern = {
      id: 'prd-development-pattern',
      name: 'PRD Development Coordination',
      type: 'sequential',
      description: 'Coordinates Product, Marketing, and Development suites for PRD creation',
      stages: [
        {
          id: 'persona-generation',
          name: 'Persona Generation',
          agentTemplateId: 'product-suite-agent',
          operation: 'generatePersonas',
          inputs: ['workspace.context', 'market.requirements'],
          expectedOutputs: ['PersonaMap'],
          validationRules: ['minPersonas:3', 'hasValidation:true'],
          dependencies: [],
          parallelizable: false,
          timeout: 300000, // 5 minutes
          retryConfig: {
            maxRetries: 2,
            backoffMultiplier: 1.5
          }
        },
        {
          id: 'jobs-analysis',
          name: 'Jobs Analysis',
          agentTemplateId: 'product-suite-agent',
          operation: 'analyzeJobs',
          inputs: ['PersonaMap'],
          expectedOutputs: ['JobsMap'],
          validationRules: ['minJobs:5', 'aligned:personas'],
          dependencies: ['persona-generation'],
          parallelizable: false,
          timeout: 300000,
          retryConfig: {
            maxRetries: 2,
            backoffMultiplier: 1.5
          }
        },
        {
          id: 'marketing-validation',
          name: 'Marketing Validation',
          agentTemplateId: 'marketing-suite-agent',
          operation: 'validateMarketFit',
          inputs: ['PersonaMap', 'JobsMap'],
          expectedOutputs: ['MarketValidation'],
          validationRules: ['validated:true', 'hasSegmentation:true'],
          dependencies: ['jobs-analysis'],
          parallelizable: true,
          timeout: 240000,
          retryConfig: {
            maxRetries: 1,
            backoffMultiplier: 2.0
          }
        },
        {
          id: 'technical-requirements',
          name: 'Technical Requirements',
          agentTemplateId: 'development-suite-agent',
          operation: 'defineTechnicalRequirements',
          inputs: ['PersonaMap', 'JobsMap', 'MarketValidation'],
          expectedOutputs: ['TechnicalRequirements'],
          validationRules: ['feasible:true', 'estimated:true'],
          dependencies: ['marketing-validation'],
          parallelizable: true,
          timeout: 360000,
          retryConfig: {
            maxRetries: 2,
            backoffMultiplier: 1.5
          }
        },
        {
          id: 'prd-synthesis',
          name: 'PRD Synthesis',
          agentTemplateId: 'product-suite-agent',
          operation: 'synthesizePRD',
          inputs: ['PersonaMap', 'JobsMap', 'MarketValidation', 'TechnicalRequirements'],
          expectedOutputs: ['PRDDocument'],
          validationRules: ['complete:true', 'aligned:all'],
          dependencies: ['technical-requirements'],
          parallelizable: false,
          timeout: 480000,
          retryConfig: {
            maxRetries: 3,
            backoffMultiplier: 1.2
          }
        }
      ],
      transitions: [
        {
          id: 'persona-to-jobs',
          fromStage: 'persona-generation',
          toStage: 'jobs-analysis',
          condition: 'stage_completed',
          conditionParams: { minQuality: 0.8 },
          metadata: {}
        },
        {
          id: 'jobs-to-validation',
          fromStage: 'jobs-analysis',
          toStage: 'marketing-validation',
          condition: 'stage_completed',
          conditionParams: { minQuality: 0.7 },
          metadata: {}
        },
        {
          id: 'validation-to-tech',
          fromStage: 'marketing-validation',
          toStage: 'technical-requirements',
          condition: 'checkpoint_approved',
          conditionParams: { checkpointId: 'market-validation-review' },
          metadata: {}
        },
        {
          id: 'tech-to-synthesis',
          fromStage: 'technical-requirements',
          toStage: 'prd-synthesis',
          condition: 'all_dependencies_completed',
          conditionParams: {},
          metadata: {}
        }
      ],
      checkpoints: [
        {
          id: 'market-validation-review',
          name: 'Market Validation Review',
          type: 'review',
          description: 'Review market validation before proceeding to technical requirements',
          afterStage: 'marketing-validation',
          timeout: 3600000, // 1 hour
          escalationPath: ['suite-lead', 'workspace-owner'],
          requiredRoles: ['marketing-lead', 'product-lead'],
          metadata: {}
        },
        {
          id: 'prd-quality-gate',
          name: 'PRD Quality Gate',
          type: 'quality_gate',
          description: 'Final quality check before PRD completion',
          afterStage: 'prd-synthesis',
          timeout: 1800000, // 30 minutes
          escalationPath: ['product-lead', 'workspace-owner'],
          requiredRoles: ['product-lead'],
          metadata: {}
        }
      ],
      metadata: {
        version: '1.0.0',
        category: 'product-development',
        priority: 1,
        estimatedDuration: 1800000, // 30 minutes
        requiredResources: ['high-memory', 'domain-expertise']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Convert Business Model RACI Workflow to Agent Coordination Pattern
    const businessModelPattern: AgentCoordinationPattern = {
      id: 'business-model-raci-pattern',
      name: 'Business Model RACI Coordination',
      type: 'hierarchical',
      description: 'RACI-based business model development across Strategy, Marketing, and Sales suites',
      stages: [
        {
          id: 'strategic-foundation',
          name: 'Strategic Foundation',
          agentTemplateId: 'strategy-suite-agent',
          operation: 'defineStrategicFoundation',
          inputs: ['workspace.context', 'market.analysis'],
          expectedOutputs: ['StrategicFoundation'],
          validationRules: ['hasVision:true', 'hasObjectives:true'],
          dependencies: [],
          parallelizable: false,
          timeout: 360000,
          retryConfig: {
            maxRetries: 2,
            backoffMultiplier: 1.5
          }
        },
        {
          id: 'marketing-segmentation',
          name: 'Marketing Segmentation',
          agentTemplateId: 'marketing-suite-agent',
          operation: 'defineMarketSegmentation',
          inputs: ['StrategicFoundation'],
          expectedOutputs: ['MarketSegmentation'],
          validationRules: ['hasSegments:true', 'hasPositioning:true'],
          dependencies: ['strategic-foundation'],
          parallelizable: true,
          timeout: 300000,
          retryConfig: {
            maxRetries: 2,
            backoffMultiplier: 1.5
          }
        },
        {
          id: 'sales-model',
          name: 'Sales Model',
          agentTemplateId: 'sales-suite-agent',
          operation: 'defineSalesModel',
          inputs: ['StrategicFoundation', 'MarketSegmentation'],
          expectedOutputs: ['SalesModel'],
          validationRules: ['hasChannels:true', 'hasRevenue:true'],
          dependencies: ['marketing-segmentation'],
          parallelizable: true,
          timeout: 300000,
          retryConfig: {
            maxRetries: 2,
            backoffMultiplier: 1.5
          }
        },
        {
          id: 'business-model-canvas',
          name: 'Business Model Canvas',
          agentTemplateId: 'strategy-suite-agent',
          operation: 'synthesizeBusinessModel',
          inputs: ['StrategicFoundation', 'MarketSegmentation', 'SalesModel'],
          expectedOutputs: ['BusinessModelCanvas'],
          validationRules: ['complete:true', 'aligned:all'],
          dependencies: ['sales-model'],
          parallelizable: false,
          timeout: 480000,
          retryConfig: {
            maxRetries: 3,
            backoffMultiplier: 1.2
          }
        }
      ],
      transitions: [
        {
          id: 'foundation-to-segmentation',
          fromStage: 'strategic-foundation',
          toStage: 'marketing-segmentation',
          condition: 'checkpoint_approved',
          conditionParams: { checkpointId: 'strategic-review' },
          metadata: {}
        },
        {
          id: 'segmentation-to-sales',
          fromStage: 'marketing-segmentation',
          toStage: 'sales-model',
          condition: 'stage_completed',
          conditionParams: { minQuality: 0.8 },
          metadata: {}
        },
        {
          id: 'sales-to-canvas',
          fromStage: 'sales-model',
          toStage: 'business-model-canvas',
          condition: 'all_dependencies_completed',
          conditionParams: {},
          metadata: {}
        }
      ],
      checkpoints: [
        {
          id: 'strategic-review',
          name: 'Strategic Foundation Review',
          type: 'approval',
          description: 'Approve strategic foundation before cross-suite development',
          afterStage: 'strategic-foundation',
          timeout: 3600000,
          escalationPath: ['strategy-lead', 'workspace-owner'],
          requiredRoles: ['strategy-lead', 'c-suite'],
          metadata: {}
        },
        {
          id: 'business-model-approval',
          name: 'Business Model Approval',
          type: 'approval',
          description: 'Final approval of business model canvas',
          afterStage: 'business-model-canvas',
          timeout: 7200000, // 2 hours
          escalationPath: ['strategy-lead', 'workspace-owner'],
          requiredRoles: ['strategy-lead', 'c-suite'],
          metadata: {}
        }
      ],
      metadata: {
        version: '1.0.0',
        category: 'strategic-planning',
        priority: 2,
        estimatedDuration: 2400000, // 40 minutes
        requiredResources: ['high-memory', 'strategic-expertise']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store patterns in memory and Neo4j
    this.patterns.set(prdPattern.id, prdPattern);
    this.patterns.set(businessModelPattern.id, businessModelPattern);

    await this.storePatternInNeo4j(prdPattern);
    await this.storePatternInNeo4j(businessModelPattern);
  }

  /**
   * Execute coordination pattern
   */
  async executePattern(
    patternId: string,
    context: AgentContext,
    inputs: Record<string, any>
  ): Promise<CoordinationExecution> {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      throw new Error(`Coordination pattern not found: ${patternId}`);
    }

    const executionId = uuidv4();
    const execution: CoordinationExecution = {
      id: executionId,
      patternId,
      workspaceId: context.currentNode.workspaceId,
      initiatorId: context.user.id,
      context,
      status: 'pending',
      stageExecutions: [],
      checkpointApprovals: [],
      results: {},
      startTime: new Date(),
      metadata: { inputs }
    };

    this.activeExecutions.set(executionId, execution);

    // Start execution
    this.startExecution(execution);

    return execution;
  }

  /**
   * Start coordination pattern execution
   */
  private async startExecution(execution: CoordinationExecution): Promise<void> {
    const pattern = this.patterns.get(execution.patternId);
    if (!pattern) {
      throw new Error(`Pattern not found: ${execution.patternId}`);
    }

    execution.status = 'running';

    try {
      // Find initial stages (no dependencies)
      const initialStages = pattern.stages.filter(stage => 
        stage.dependencies.length === 0
      );

      // Execute initial stages
      for (const stage of initialStages) {
        await this.executeStage(execution, stage);
      }

      // Continue with subsequent stages
      await this.processTransitions(execution);

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
      execution.endTime = new Date();
      
      await this.storeExecutionInNeo4j(execution);
    }
  }

  /**
   * Execute individual stage
   */
  private async executeStage(
    execution: CoordinationExecution,
    stage: CoordinationStage
  ): Promise<void> {
    const stageExecution: StageExecution = {
      id: uuidv4(),
      stageId: stage.id,
      agentInstanceId: '', // Will be assigned by agent registry
      status: 'pending',
      inputs: this.buildStageInputs(execution, stage),
      outputs: {},
      startTime: new Date(),
      retryCount: 0,
      metadata: {}
    };

    execution.stageExecutions.push(stageExecution);

    try {
      // Find and assign agent
      const agent = await this.findCapableAgent(stage.agentTemplateId, stage.operation);
      if (!agent) {
        throw new Error(`No capable agent found for stage: ${stage.id}`);
      }

      stageExecution.agentInstanceId = (agent as any).instance?.id || 'unknown';
      stageExecution.status = 'running';

      // Execute stage operation
      const result = await agent.executeCapabilityOperation(
        stage.operation,
        execution.context,
        stageExecution.inputs,
        {
          timeout: stage.timeout,
          retries: stage.retryConfig.maxRetries
        }
      );

      stageExecution.outputs = result.data as Record<string, any>;
      stageExecution.status = 'completed';
      stageExecution.endTime = new Date();
      stageExecution.duration = stageExecution.endTime.getTime() - stageExecution.startTime.getTime();

      // Store outputs in execution results
      execution.results[stage.id] = result.data as Record<string, any>;

    } catch (error) {
      stageExecution.status = 'failed';
      stageExecution.error = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
      stageExecution.endTime = new Date();
      
      throw error;
    }
  }

  /**
   * Process stage transitions
   */
  private async processTransitions(execution: CoordinationExecution): Promise<void> {
    const pattern = this.patterns.get(execution.patternId);
    if (!pattern) return;

    let hasProgress = true;
    
    while (hasProgress) {
      hasProgress = false;

      for (const transition of pattern.transitions) {
        const fromStage = execution.stageExecutions.find(se => se.stageId === transition.fromStage);
        const toStage = execution.stageExecutions.find(se => se.stageId === transition.toStage);

        // Check if transition should be triggered
        if (fromStage && fromStage.status === 'completed' && !toStage) {
          const conditionMet = await this.checkTransitionCondition(execution, transition);
          
          if (conditionMet) {
            const nextStage = pattern.stages.find(s => s.id === transition.toStage);
            if (nextStage) {
              await this.executeStage(execution, nextStage);
              hasProgress = true;
            }
          }
        }
      }
    }

    // Check if execution is complete
    const completedStages = execution.stageExecutions.filter(se => se.status === 'completed');
    if (completedStages.length === pattern.stages.length) {
      execution.status = 'completed';
      execution.endTime = new Date();
      await this.storeExecutionInNeo4j(execution);
    }
  }

  /**
   * Check transition condition
   */
  private async checkTransitionCondition(
    execution: CoordinationExecution,
    transition: CoordinationTransition
  ): Promise<boolean> {
    switch (transition.condition) {
      case 'stage_completed':
        return true; // Already checked in processTransitions
      
      case 'checkpoint_approved':
        const checkpointId = transition.conditionParams.checkpointId;
        const approval = execution.checkpointApprovals.find(ca => ca.checkpointId === checkpointId);
        return approval?.status === 'approved';
      
      case 'all_dependencies_completed':
        const pattern = this.patterns.get(execution.patternId);
        const stage = pattern?.stages.find(s => s.id === transition.toStage);
        if (!stage) return false;
        
        return stage.dependencies.every(depId => 
          execution.stageExecutions.some(se => se.stageId === depId && se.status === 'completed')
        );
      
      default:
        return false;
    }
  }

  /**
   * Build stage inputs from execution context and previous results
   */
  private buildStageInputs(
    execution: CoordinationExecution,
    stage: CoordinationStage
  ): Record<string, any> {
    const inputs: Record<string, any> = {};

    for (const inputName of stage.inputs) {
      if (inputName.startsWith('workspace.')) {
        // Context input
        const contextKey = inputName.split('.')[1];
        inputs[inputName] = execution.context.currentNode[contextKey];
      } else if (execution.results[inputName]) {
        // Previous stage output
        inputs[inputName] = execution.results[inputName];
      } else {
        // Check if any previous stage produced this output
        for (const [stageId, result] of Object.entries(execution.results)) {
          if (result && typeof result === 'object' && inputName in result) {
            inputs[inputName] = result[inputName];
            break;
          }
        }
      }
    }

    return inputs;
  }

  /**
   * Find capable agent for stage
   */
  private async findCapableAgent(
    templateId: string,
    operation: string
  ): Promise<GraphCapabilityAgent | null> {
    // This would integrate with the agent registry
    // For now, return null to indicate implementation needed
    return null;
  }

  /**
   * Store coordination pattern in Neo4j
   */
  private async storePatternInNeo4j(pattern: AgentCoordinationPattern): Promise<void> {
    const query = `
      CREATE (cp:CoordinationPattern {
        id: $id,
        name: $name,
        type: $type,
        description: $description,
        stages: $stages,
        transitions: $transitions,
        checkpoints: $checkpoints,
        metadata: $metadata,
        createdAt: $createdAt,
        updatedAt: $updatedAt
      })
    `;

    await runQuery(query, {
      id: pattern.id,
      name: pattern.name,
      type: pattern.type,
      description: pattern.description,
      stages: JSON.stringify(pattern.stages),
      transitions: JSON.stringify(pattern.transitions),
      checkpoints: JSON.stringify(pattern.checkpoints),
      metadata: JSON.stringify(pattern.metadata),
      createdAt: pattern.createdAt.toISOString(),
      updatedAt: pattern.updatedAt.toISOString()
    });
  }

  /**
   * Store execution in Neo4j
   */
  private async storeExecutionInNeo4j(execution: CoordinationExecution): Promise<void> {
    const query = `
      CREATE (ce:CoordinationExecution {
        id: $id,
        patternId: $patternId,
        workspaceId: $workspaceId,
        initiatorId: $initiatorId,
        status: $status,
        currentStageId: $currentStageId,
        stageExecutions: $stageExecutions,
        checkpointApprovals: $checkpointApprovals,
        results: $results,
        error: $error,
        startTime: $startTime,
        endTime: $endTime,
        metadata: $metadata
      })
    `;

    await runQuery(query, {
      id: execution.id,
      patternId: execution.patternId,
      workspaceId: execution.workspaceId,
      initiatorId: execution.initiatorId,
      status: execution.status,
      currentStageId: execution.currentStageId || null,
      stageExecutions: JSON.stringify(execution.stageExecutions),
      checkpointApprovals: JSON.stringify(execution.checkpointApprovals),
      results: JSON.stringify(execution.results),
      error: execution.error || null,
      startTime: execution.startTime.toISOString(),
      endTime: execution.endTime?.toISOString() || null,
      metadata: JSON.stringify(execution.metadata)
    });
  }

  /**
   * Get pattern by ID
   */
  getPattern(patternId: string): AgentCoordinationPattern | undefined {
    return this.patterns.get(patternId);
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): AgentCoordinationPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): CoordinationExecution | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): CoordinationExecution[] {
    return Array.from(this.activeExecutions.values());
  }
}