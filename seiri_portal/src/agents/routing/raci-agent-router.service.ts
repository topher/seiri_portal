// RACI-based Agent Router Service
// Routes agent requests based on RACI matrix and cross-suite coordination

import { SuiteType, RACIRole } from '@/core/suites/suite.model';
import { AgentType, AgentRequirements } from '@/core/tasks/task.model';
import { initiativeService } from '@/core/initiatives/initiative.service';
import { taskService } from '@/core/tasks/task.service';
import { suiteService } from '@/core/suites/suite.service';
import { agentPoolService, Agent, AllocationRequest, AgentAllocation } from '../pool/agent-pool.service';

export interface RACIRoutingRequest {
  taskId: string;
  initiativeId: string;
  requirements: AgentRequirements;
  context: {
    deliverableType: string;
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    crossSuiteCoordination: boolean;
    deadline?: Date;
  };
}

export interface RACIRoutingResult {
  allocation: AgentAllocation;
  routing: {
    primarySuite: SuiteType;
    supportingSuites: SuiteType[];
    consultedSuites: SuiteType[];
    informedSuites: SuiteType[];
  };
  coordination: {
    strategy: CrossSuiteCoordinationStrategy;
    communicationPlan: CommunicationPlan;
    escalationPath: EscalationPath;
  };
  executionPlan: {
    phases: ExecutionPhase[];
    dependencies: TaskDependency[];
    milestones: Milestone[];
  };
}

export interface CrossSuiteCoordinationStrategy {
  type: 'SEQUENTIAL' | 'PARALLEL' | 'HYBRID';
  coordinationPoints: CoordinationPoint[];
  reviewGates: ReviewGate[];
  conflictResolution: ConflictResolutionProtocol;
}

export interface CommunicationPlan {
  updates: {
    frequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'MILESTONE_BASED';
    recipients: RACIRole[];
    format: 'BRIEF' | 'DETAILED' | 'DASHBOARD';
  };
  notifications: {
    milestones: boolean;
    blockers: boolean;
    qualityIssues: boolean;
    completions: boolean;
  };
  channels: {
    primary: 'SYSTEM' | 'WEBHOOK' | 'EMAIL';
    backup: 'SYSTEM' | 'WEBHOOK' | 'EMAIL';
  };
}

export interface EscalationPath {
  levels: EscalationLevel[];
  triggers: EscalationTrigger[];
  resolvers: Record<string, SuiteType>;
}

export interface EscalationLevel {
  level: number;
  name: string;
  timeout: number; // minutes
  escalateTo: RACIRole;
  requiredApprovals: number;
}

export interface EscalationTrigger {
  type: 'DELAY' | 'QUALITY_ISSUE' | 'RESOURCE_CONFLICT' | 'SCOPE_CHANGE';
  threshold: any;
  autoEscalate: boolean;
}

export interface ExecutionPhase {
  id: string;
  name: string;
  description: string;
  responsibleSuite: SuiteType;
  supportingSuites: SuiteType[];
  estimatedDuration: number; // minutes
  prerequisites: string[];
  deliverables: string[];
}

export interface TaskDependency {
  from: string;
  to: string;
  type: 'BLOCKING' | 'PREFERENTIAL' | 'INFORMATIONAL';
  description: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  targetDate: Date;
  reviewers: RACIRole[];
  criteria: string[];
}

export interface CoordinationPoint {
  phaseId: string;
  type: 'HANDOFF' | 'REVIEW' | 'APPROVAL' | 'SYNC';
  participants: SuiteType[];
  duration: number; // minutes
  requirements: string[];
}

export interface ReviewGate {
  id: string;
  name: string;
  phase: string;
  reviewers: SuiteType[];
  criteria: string[];
  passingScore: number;
  escalationOnFail: boolean;
}

export interface ConflictResolutionProtocol {
  decisionMaker: RACIRole;
  votingThreshold: number;
  timeoutDays: number;
  fallbackProcedure: string;
}

export class RACIAgentRouterService {
  
  /**
   * Route agents based on RACI matrix and initiative context
   */
  async routeAgents(request: RACIRoutingRequest): Promise<RACIRoutingResult> {
    // 1. Get initiative and extract RACI matrix
    const initiative = await initiativeService.getInitiative(request.initiativeId);
    if (!initiative) {
      throw new Error(`Initiative ${request.initiativeId} not found`);
    }

    // 2. Analyze RACI matrix and determine routing strategy
    const routing = await this.analyzeRACIRouting(initiative.raci, request);

    // 3. Create enhanced allocation request with RACI context
    const allocationRequest = await this.createRACIAllocationRequest(request, routing);

    // 4. Allocate agents through pool service
    const allocation = await agentPoolService.allocateAgents(allocationRequest);

    // 5. Create coordination strategy
    const coordinationStrategy = await this.createCoordinationStrategy(initiative, routing, request);
    // Mock communication plan for now
    const communicationPlan: CommunicationPlan = {
      updates: {
        frequency: 'DAILY',
        recipients: [RACIRole.RESPONSIBLE],
        format: 'BRIEF'
      },
      notifications: {
        milestones: true,
        blockers: true,
        completions: true,
        qualityIssues: false
      },
      channels: {
        primary: 'SYSTEM',
        backup: 'EMAIL'
      }
    };
    
    // Mock escalation path for now  
    const escalationPath: EscalationPath = {
      levels: [
        { 
          level: 1, 
          name: 'Level 1 Escalation',
          timeout: 60,
          escalateTo: RACIRole.ACCOUNTABLE, 
          requiredApprovals: 1
        }
      ],
      triggers: [
        {
          type: 'DELAY',
          threshold: { minutes: 60 },
          autoEscalate: true
        }
      ],
      resolvers: {
        'DELAY': routing.primarySuite,
        'QUALITY_ISSUE': routing.primarySuite
      }
    };
    
    const coordination = {
      strategy: coordinationStrategy,
      communicationPlan,
      escalationPath
    };

    // 6. Generate execution plan
    const executionPlan = await this.generateExecutionPlan(initiative, routing, coordinationStrategy, request);

    return {
      allocation,
      routing,
      coordination,
      executionPlan
    };
  }

  /**
   * Analyze RACI matrix to determine routing strategy
   */
  private async analyzeRACIRouting(raci: any, request: RACIRoutingRequest): Promise<any> {
    // Determine primary suite based on task type and RACI accountable
    const primarySuite = await this.determinePrimarySuite(raci, request);
    
    // Map RACI roles to suites
    const supportingSuites = await this.getSuitesFromIds(raci.responsible.filter((id: string) => id !== raci.accountable));
    const consultedSuites = await this.getSuitesFromIds(raci.consulted);
    const informedSuites = await this.getSuitesFromIds(raci.informed);

    return {
      primarySuite,
      supportingSuites,
      consultedSuites,
      informedSuites
    };
  }

  /**
   * Determine primary suite for task execution
   */
  private async determinePrimarySuite(raci: any, request: RACIRoutingRequest): Promise<SuiteType> {
    // Get accountable suite
    const accountableSuite = await this.getSuiteFromId(raci.accountable);
    
    // For most cases, accountable suite is primary
    // However, we may need to route to a different suite based on deliverable type
    const deliverableBasedSuite = this.getSuiteFromDeliverableType(request.context.deliverableType);
    
    // If deliverable-based suite is in responsible or accountable role, prefer it
    if (deliverableBasedSuite === accountableSuite || 
        raci.responsible.some(async (id: string) => await this.getSuiteFromId(id) === deliverableBasedSuite)) {
      return deliverableBasedSuite;
    }
    
    return accountableSuite;
  }

  /**
   * Get suite type from deliverable type
   */
  private getSuiteFromDeliverableType(deliverableType: string): SuiteType {
    const deliverableSuiteMapping: Record<string, SuiteType> = {
      'PERSONA_SET': SuiteType.PRODUCT,
      'JOB_MAP': SuiteType.PRODUCT,
      'PRD_DOCUMENT': SuiteType.PRODUCT,
      'MARKET_ANALYSIS': SuiteType.MARKETING,
      'BUSINESS_MODEL': SuiteType.STRATEGY,
      'API_SPECIFICATION': SuiteType.DEVELOPMENT,
      'COMPONENT_INVENTORY': SuiteType.DEVELOPMENT,
      'TECHNICAL_ARCHITECTURE': SuiteType.DEVELOPMENT,
      'TEST_PLAN': SuiteType.DEVELOPMENT,
      'DEPLOYMENT_GUIDE': SuiteType.OPERATIONS
    };

    return deliverableSuiteMapping[deliverableType] || SuiteType.STRATEGY;
  }

  /**
   * Get suite type from suite ID (mock implementation)
   */
  private async getSuiteFromId(suiteId: string): Promise<SuiteType> {
    // In real implementation, this would query the database
    // For now, extract from the mock ID pattern
    if (suiteId.includes('product')) return SuiteType.PRODUCT;
    if (suiteId.includes('marketing')) return SuiteType.MARKETING;
    if (suiteId.includes('development')) return SuiteType.DEVELOPMENT;
    if (suiteId.includes('operations')) return SuiteType.OPERATIONS;
    if (suiteId.includes('strategy')) return SuiteType.STRATEGY;
    if (suiteId.includes('sales')) return SuiteType.SALES;
    
    return SuiteType.STRATEGY; // Default fallback
  }

  /**
   * Get suite types from suite IDs
   */
  private async getSuitesFromIds(suiteIds: string[]): Promise<SuiteType[]> {
    return Promise.all(suiteIds.map(id => this.getSuiteFromId(id)));
  }

  /**
   * Create allocation request with RACI context
   */
  private async createRACIAllocationRequest(
    request: RACIRoutingRequest, 
    routing: any
  ): Promise<AllocationRequest> {
    return {
      taskId: request.taskId,
      initiativeId: request.initiativeId,
      requirements: request.requirements,
      priority: this.determinePriority(request.context),
      deadline: request.context.deadline,
      context: {
        suiteContext: routing.primarySuite,
        domainContext: request.context.deliverableType,
        collaborationNeeds: [
          ...routing.supportingSuites.map((s: SuiteType) => `support:${s}`),
          ...routing.consultedSuites.map((s: SuiteType) => `consult:${s}`),
          ...routing.informedSuites.map((s: SuiteType) => `inform:${s}`)
        ]
      }
    };
  }

  /**
   * Determine priority based on context
   */
  private determinePriority(context: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (context.deadline && new Date(context.deadline) < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      return 'URGENT';
    }
    
    if (context.complexity === 'HIGH' || context.crossSuiteCoordination) {
      return 'HIGH';
    }
    
    if (context.complexity === 'MEDIUM') {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  /**
   * Create coordination strategy based on RACI and requirements
   */
  private async createCoordinationStrategy(
    initiative: any, 
    routing: any, 
    request: RACIRoutingRequest
  ): Promise<CrossSuiteCoordinationStrategy> {
    const totalSuites = 1 + routing.supportingSuites.length + routing.consultedSuites.length;
    const isComplex = request.context.complexity === 'HIGH';
    const hasCrossSuiteCoordination = request.context.crossSuiteCoordination;

    // Determine coordination type
    let coordinationType: 'SEQUENTIAL' | 'PARALLEL' | 'HYBRID' = 'PARALLEL';
    
    if (totalSuites > 3 || isComplex) {
      coordinationType = 'HYBRID';
    } else if (hasCrossSuiteCoordination) {
      coordinationType = 'SEQUENTIAL';
    }

    // Create coordination points
    const coordinationPoints: CoordinationPoint[] = [
      {
        phaseId: 'initiation',
        type: 'SYNC',
        participants: [routing.primarySuite, ...routing.supportingSuites],
        duration: 15,
        requirements: ['Align on objectives', 'Define success criteria', 'Establish communication protocols']
      },
      {
        phaseId: 'execution',
        type: 'HANDOFF',
        participants: [routing.primarySuite, ...routing.consultedSuites],
        duration: 10,
        requirements: ['Transfer deliverables', 'Share context', 'Update status']
      },
      {
        phaseId: 'review',
        type: 'REVIEW',
        participants: [routing.primarySuite, ...routing.supportingSuites, ...routing.consultedSuites],
        duration: 20,
        requirements: ['Quality assessment', 'Requirements validation', 'Stakeholder approval']
      }
    ];

    // Create review gates
    const reviewGates: ReviewGate[] = [
      {
        id: 'quality_gate_1',
        name: 'Initial Quality Check',
        phase: 'execution',
        reviewers: routing.consultedSuites,
        criteria: ['Meets requirements', 'Follows standards', 'Complete documentation'],
        passingScore: 80,
        escalationOnFail: true
      },
      {
        id: 'final_review',
        name: 'Final Approval',
        phase: 'completion',
        reviewers: [routing.primarySuite, ...routing.consultedSuites],
        criteria: ['All acceptance criteria met', 'Quality standards achieved', 'Stakeholder approval'],
        passingScore: 90,
        escalationOnFail: true
      }
    ];

    // Conflict resolution protocol
    const conflictResolution: ConflictResolutionProtocol = {
      decisionMaker: RACIRole.ACCOUNTABLE,
      votingThreshold: 0.6,
      timeoutDays: 2,
      fallbackProcedure: 'Escalate to Initiative Coordinator'
    };

    return {
      type: coordinationType,
      coordinationPoints,
      reviewGates,
      conflictResolution
    };
  }

  /**
   * Generate execution plan with phases and dependencies
   */
  private async generateExecutionPlan(
    initiative: any,
    routing: any,
    coordination: CrossSuiteCoordinationStrategy,
    request: RACIRoutingRequest
  ): Promise<any> {
    // Create execution phases based on deliverable type and coordination strategy
    const phases: ExecutionPhase[] = [];
    
    // Phase 1: Initiation and Planning
    phases.push({
      id: 'phase_1_initiation',
      name: 'Initiation & Planning',
      description: 'Initialize task execution and coordinate with all stakeholders',
      responsibleSuite: routing.primarySuite,
      supportingSuites: routing.supportingSuites,
      estimatedDuration: 30,
      prerequisites: [],
      deliverables: ['Execution plan', 'Resource allocation', 'Communication setup']
    });

    // Phase 2: Core Execution
    phases.push({
      id: 'phase_2_execution',
      name: 'Core Execution',
      description: 'Primary task execution with supporting suite coordination',
      responsibleSuite: routing.primarySuite,
      supportingSuites: routing.supportingSuites,
      estimatedDuration: this.estimateExecutionDuration(request.context),
      prerequisites: ['phase_1_initiation'],
      deliverables: [request.context.deliverableType]
    });

    // Phase 3: Review and Validation
    phases.push({
      id: 'phase_3_review',
      name: 'Review & Validation',
      description: 'Quality review and validation by consulted suites',
      responsibleSuite: routing.primarySuite,
      supportingSuites: routing.consultedSuites,
      estimatedDuration: 45,
      prerequisites: ['phase_2_execution'],
      deliverables: ['Quality report', 'Validation results', 'Approval status']
    });

    // Phase 4: Finalization
    phases.push({
      id: 'phase_4_finalization',
      name: 'Finalization & Handoff',
      description: 'Finalize deliverables and update informed parties',
      responsibleSuite: routing.primarySuite,
      supportingSuites: [],
      estimatedDuration: 15,
      prerequisites: ['phase_3_review'],
      deliverables: ['Final deliverable', 'Documentation', 'Status updates']
    });

    // Create dependencies
    const dependencies: TaskDependency[] = [
      {
        from: 'phase_1_initiation',
        to: 'phase_2_execution',
        type: 'BLOCKING',
        description: 'Planning must complete before execution begins'
      },
      {
        from: 'phase_2_execution',
        to: 'phase_3_review',
        type: 'BLOCKING',
        description: 'Execution must complete before review can begin'
      },
      {
        from: 'phase_3_review',
        to: 'phase_4_finalization',
        type: 'BLOCKING',
        description: 'Review must pass before finalization'
      }
    ];

    // Create milestones
    const milestones: Milestone[] = [
      {
        id: 'milestone_1',
        name: 'Execution Started',
        description: 'Task execution has begun with all stakeholders aligned',
        targetDate: new Date(Date.now() + 30 * 60000), // 30 minutes from now
        reviewers: [RACIRole.RESPONSIBLE],
        criteria: ['All agents allocated', 'Communication established', 'Objectives clear']
      },
      {
        id: 'milestone_2',
        name: 'Core Work Complete',
        description: 'Primary deliverable has been created',
        targetDate: new Date(Date.now() + (30 + this.estimateExecutionDuration(request.context)) * 60000),
        reviewers: [RACIRole.RESPONSIBLE, RACIRole.CONSULTED],
        criteria: ['Deliverable created', 'Quality standards met', 'Requirements satisfied']
      },
      {
        id: 'milestone_3',
        name: 'Task Complete',
        description: 'Task fully completed and validated',
        targetDate: new Date(Date.now() + (30 + this.estimateExecutionDuration(request.context) + 60) * 60000),
        reviewers: [RACIRole.RESPONSIBLE, RACIRole.ACCOUNTABLE, RACIRole.CONSULTED],
        criteria: ['All phases complete', 'Quality approved', 'Stakeholders informed']
      }
    ];

    return {
      phases,
      dependencies,
      milestones
    };
  }

  /**
   * Estimate execution duration based on context
   */
  private estimateExecutionDuration(context: any): number {
    let baseDuration = 60; // 1 hour base

    // Adjust for complexity
    if (context.complexity === 'HIGH') {
      baseDuration *= 2;
    } else if (context.complexity === 'MEDIUM') {
      baseDuration *= 1.5;
    }

    // Adjust for cross-suite coordination
    if (context.crossSuiteCoordination) {
      baseDuration *= 1.3;
    }

    return Math.round(baseDuration);
  }

  /**
   * Monitor and coordinate ongoing RACI execution
   */
  async monitorRACIExecution(requestId: string): Promise<{
    status: string;
    progress: number;
    currentPhase: string;
    blockers: string[];
    nextActions: string[];
    coordinationHealth: number;
  }> {
    // This would typically integrate with the agent execution monitoring
    // For now, return mock status
    return {
      status: 'IN_PROGRESS',
      progress: 45,
      currentPhase: 'Core Execution',
      blockers: [],
      nextActions: [
        'Complete persona validation',
        'Schedule review with Marketing suite',
        'Prepare deliverable documentation'
      ],
      coordinationHealth: 85
    };
  }

  /**
   * Handle RACI escalation
   */
  async handleEscalation(
    requestId: string,
    escalationType: string,
    details: any
  ): Promise<{
    escalationId: string;
    assignedTo: RACIRole;
    expectedResolution: Date;
    actions: string[];
  }> {
    const escalationId = `esc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Determine escalation assignment based on type
    let assignedTo: RACIRole = RACIRole.ACCOUNTABLE;
    let actions: string[] = [];
    
    switch (escalationType) {
      case 'QUALITY_ISSUE':
        assignedTo = RACIRole.ACCOUNTABLE;
        actions = [
          'Review quality standards',
          'Reassign agents if necessary',
          'Implement additional review gates'
        ];
        break;
      case 'RESOURCE_CONFLICT':
        assignedTo = RACIRole.RESPONSIBLE;
        actions = [
          'Reallocate agent resources',
          'Adjust timeline if necessary',
          'Coordinate with other initiatives'
        ];
        break;
      case 'SCOPE_CHANGE':
        assignedTo = RACIRole.ACCOUNTABLE;
        actions = [
          'Assess impact on deliverables',
          'Update requirements',
          'Communicate changes to all stakeholders'
        ];
        break;
      default:
        actions = ['Investigate issue', 'Determine resolution approach'];
    }

    return {
      escalationId,
      assignedTo,
      expectedResolution: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      actions
    };
  }

  /**
   * Generate RACI coordination report
   */
  async generateCoordinationReport(initiativeId: string): Promise<{
    summary: string;
    raciEffectiveness: Record<RACIRole, number>;
    crossSuiteCollaboration: number;
    recommendations: string[];
    metrics: any;
  }> {
    // Mock implementation - in reality this would analyze actual coordination data
    return {
      summary: 'RACI coordination operating effectively with strong cross-suite collaboration',
      raciEffectiveness: {
        RESPONSIBLE: 88,
        ACCOUNTABLE: 92,
        CONSULTED: 85,
        INFORMED: 90
      },
      crossSuiteCollaboration: 87,
      recommendations: [
        'Increase frequency of sync meetings between Product and Marketing suites',
        'Establish clearer handoff procedures for Development deliverables',
        'Improve notification system for informed stakeholders'
      ],
      metrics: {
        averageTaskCompletionTime: 95, // minutes
        qualityScoreAverage: 88,
        stakeholderSatisfaction: 91,
        escalationRate: 0.05 // 5% of tasks escalated
      }
    };
  }
}

// Export singleton instance
export const raciAgentRouter = new RACIAgentRouterService();