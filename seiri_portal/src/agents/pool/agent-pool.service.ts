// Agent Pool Service
// Manages pools of AI agents organized by suite type with allocation and coordination

import { SuiteType } from '@/core/suites/suite.model';
import { AgentType, AgentRequirements } from '@/core/tasks/task.model';
import { RACIRole } from '@/core/suites/suite.model';

export enum AgentStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE'
}

export enum AgentCapabilityLevel {
  BASIC = 'BASIC',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

export interface Agent {
  id: string;
  type: AgentType;
  suiteType: SuiteType;
  name: string;
  description: string;
  status: AgentStatus;
  capabilities: AgentCapability[];
  performance: AgentPerformance;
  availability: AgentAvailability;
  collaboration: AgentCollaboration;
  metadata: AgentMetadata;
}

export interface AgentCapability {
  domain: string;                    // e.g., 'persona_development', 'market_analysis'
  level: AgentCapabilityLevel;       // proficiency level
  specializations: string[];         // specific areas of expertise
  validatedAt: Date;                 // when capability was last validated
}

export interface AgentPerformance {
  tasksCompleted: number;
  averageQualityScore: number;       // 0-100 quality rating
  averageCompletionTime: number;     // minutes
  collaborationRating: number;       // 0-100 how well they work with others
  reliabilityScore: number;          // 0-100 consistency rating
  lastUpdated: Date;
}

export interface AgentAvailability {
  maxConcurrentTasks: number;
  currentTaskCount: number;
  estimatedAvailableAt: Date | null;
  timezone: string;
  workingHours: {
    start: string;  // "09:00"
    end: string;    // "17:00"
  };
}

export interface AgentCollaboration {
  preferredPartners: string[];       // Agent IDs they work well with
  successfulCollaborations: number;
  crossSuiteExperience: SuiteType[]; // Other suites they've worked with
  communicationStyle: 'DIRECT' | 'COLLABORATIVE' | 'ANALYTICAL' | 'CREATIVE';
}

export interface AgentMetadata {
  version: string;
  createdAt: Date;
  lastActive: Date;
  configuration: Record<string, any>;
  tags: string[];
}

export interface AgentAllocation {
  requestId: string;
  taskId: string;
  initiativeId: string;
  agents: {
    primary: Agent;
    supporting: Agent[];
    reviewers: Agent[];
  };
  allocationStrategy: string;
  estimatedDuration: number;         // minutes
  allocatedAt: Date;
  expectedCompletion: Date;
}

export interface AllocationRequest {
  taskId: string;
  initiativeId: string;
  requirements: AgentRequirements;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  deadline?: Date;
  context: {
    suiteContext: SuiteType;
    domainContext: string;
    collaborationNeeds: string[];
  };
}

export class AgentPoolService {
  private agentPools: Map<SuiteType, Map<AgentType, Agent[]>> = new Map();
  private activeAllocations: Map<string, AgentAllocation> = new Map();
  private allocationHistory: AgentAllocation[] = [];

  constructor() {
    this.initializeAgentPools();
  }

  /**
   * Initialize agent pools for all suite types
   */
  private initializeAgentPools(): void {
    // Initialize pools for each suite type
    Object.values(SuiteType).forEach(suiteType => {
      this.agentPools.set(suiteType, new Map());
      this.createDefaultAgentsForSuite(suiteType);
    });
  }

  /**
   * Create default agents for a suite type
   */
  private createDefaultAgentsForSuite(suiteType: SuiteType): void {
    const suitePool = this.agentPools.get(suiteType)!;
    
    switch (suiteType) {
      case SuiteType.PRODUCT:
        this.createProductAgents(suitePool);
        break;
      case SuiteType.MARKETING:
        this.createMarketingAgents(suitePool);
        break;
      case SuiteType.DEVELOPMENT:
        this.createDevelopmentAgents(suitePool);
        break;
      case SuiteType.OPERATIONS:
        this.createOperationsAgents(suitePool);
        break;
      case SuiteType.STRATEGY:
        this.createStrategyAgents(suitePool);
        break;
      case SuiteType.SALES:
        this.createSalesAgents(suitePool);
        break;
    }
  }

  /**
   * Create Product Suite agents
   */
  private createProductAgents(suitePool: Map<AgentType, Agent[]>): void {
    // Persona Agent
    const personaAgent = this.createAgent({
      type: AgentType.PERSONA_AGENT,
      suiteType: SuiteType.PRODUCT,
      name: 'Product Persona Specialist',
      description: 'Expert in user persona development and validation',
      capabilities: [
        {
          domain: 'persona_development',
          level: AgentCapabilityLevel.EXPERT,
          specializations: ['user_research', 'demographic_analysis', 'behavioral_patterns'],
          validatedAt: new Date()
        },
        {
          domain: 'user_research',
          level: AgentCapabilityLevel.ADVANCED,
          specializations: ['interview_analysis', 'survey_interpretation'],
          validatedAt: new Date()
        }
      ]
    });

    // JTBD Agent
    const jtbdAgent = this.createAgent({
      type: AgentType.JTBD_AGENT,
      suiteType: SuiteType.PRODUCT,
      name: 'Jobs-to-be-Done Analyst',
      description: 'Specialist in jobs-to-be-done framework and opportunity analysis',
      capabilities: [
        {
          domain: 'jobs_analysis',
          level: AgentCapabilityLevel.EXPERT,
          specializations: ['opportunity_scoring', 'job_mapping', 'outcome_definition'],
          validatedAt: new Date()
        }
      ]
    });

    // Research Agent (Product focus)
    const researchAgent = this.createAgent({
      type: AgentType.RESEARCH_AGENT,
      suiteType: SuiteType.PRODUCT,
      name: 'Product Research Specialist',
      description: 'Expert in product research and market analysis',
      capabilities: [
        {
          domain: 'market_research',
          level: AgentCapabilityLevel.ADVANCED,
          specializations: ['competitive_analysis', 'trend_analysis', 'user_insights'],
          validatedAt: new Date()
        }
      ]
    });

    // Store agents in pool
    suitePool.set(AgentType.PERSONA_AGENT, [personaAgent]);
    suitePool.set(AgentType.JTBD_AGENT, [jtbdAgent]);
    suitePool.set(AgentType.RESEARCH_AGENT, [researchAgent]);
  }

  /**
   * Create Marketing Suite agents
   */
  private createMarketingAgents(suitePool: Map<AgentType, Agent[]>): void {
    // Segmentation Agent
    const segmentationAgent = this.createAgent({
      type: AgentType.SEGMENTATION_AGENT,
      suiteType: SuiteType.MARKETING,
      name: 'Customer Segmentation Expert',
      description: 'Specialist in customer segmentation and targeting',
      capabilities: [
        {
          domain: 'customer_segmentation',
          level: AgentCapabilityLevel.EXPERT,
          specializations: ['demographic_segmentation', 'behavioral_segmentation', 'psychographic_analysis'],
          validatedAt: new Date()
        }
      ]
    });

    // Marketing Research Agent
    const marketingResearchAgent = this.createAgent({
      type: AgentType.RESEARCH_AGENT,
      suiteType: SuiteType.MARKETING,
      name: 'Marketing Research Analyst',
      description: 'Expert in marketing research and competitive intelligence',
      capabilities: [
        {
          domain: 'marketing_research',
          level: AgentCapabilityLevel.EXPERT,
          specializations: ['brand_research', 'campaign_analysis', 'market_sizing'],
          validatedAt: new Date()
        }
      ]
    });

    suitePool.set(AgentType.SEGMENTATION_AGENT, [segmentationAgent]);
    suitePool.set(AgentType.RESEARCH_AGENT, [marketingResearchAgent]);
  }

  /**
   * Create Development Suite agents
   */
  private createDevelopmentAgents(suitePool: Map<AgentType, Agent[]>): void {
    // API Spec Agent
    const apiSpecAgent = this.createAgent({
      type: AgentType.API_SPEC_AGENT,
      suiteType: SuiteType.DEVELOPMENT,
      name: 'API Specification Expert',
      description: 'Specialist in API design and specification',
      capabilities: [
        {
          domain: 'api_design',
          level: AgentCapabilityLevel.EXPERT,
          specializations: ['restful_design', 'graphql_design', 'api_security'],
          validatedAt: new Date()
        }
      ]
    });

    // Architecture Agent
    const architectureAgent = this.createAgent({
      type: AgentType.ARCHITECTURE_AGENT,
      suiteType: SuiteType.DEVELOPMENT,
      name: 'Technical Architecture Specialist',
      description: 'Expert in system architecture and technical design',
      capabilities: [
        {
          domain: 'system_architecture',
          level: AgentCapabilityLevel.EXPERT,
          specializations: ['microservices', 'scalability', 'security_architecture'],
          validatedAt: new Date()
        }
      ]
    });

    suitePool.set(AgentType.API_SPEC_AGENT, [apiSpecAgent]);
    suitePool.set(AgentType.ARCHITECTURE_AGENT, [architectureAgent]);
  }

  /**
   * Create Strategy Suite agents
   */
  private createStrategyAgents(suitePool: Map<AgentType, Agent[]>): void {
    // Strategy Agent
    const strategyAgent = this.createAgent({
      type: AgentType.STRATEGY_AGENT,
      suiteType: SuiteType.STRATEGY,
      name: 'Strategic Planning Expert',
      description: 'Specialist in strategic planning and business analysis',
      capabilities: [
        {
          domain: 'strategic_planning',
          level: AgentCapabilityLevel.EXPERT,
          specializations: ['business_strategy', 'competitive_strategy', 'growth_strategy'],
          validatedAt: new Date()
        }
      ]
    });

    // Financial Modeling Agent
    const financialAgent = this.createAgent({
      type: AgentType.FINANCIAL_MODELING_AGENT,
      suiteType: SuiteType.STRATEGY,
      name: 'Financial Modeling Specialist',
      description: 'Expert in financial analysis and modeling',
      capabilities: [
        {
          domain: 'financial_modeling',
          level: AgentCapabilityLevel.EXPERT,
          specializations: ['revenue_modeling', 'cost_analysis', 'roi_calculation'],
          validatedAt: new Date()
        }
      ]
    });

    suitePool.set(AgentType.STRATEGY_AGENT, [strategyAgent]);
    suitePool.set(AgentType.FINANCIAL_MODELING_AGENT, [financialAgent]);
  }

  /**
   * Create Sales Suite agents
   */
  private createSalesAgents(suitePool: Map<AgentType, Agent[]>): void {
    // Pricing Agent
    const pricingAgent = this.createAgent({
      type: AgentType.PRICING_AGENT,
      suiteType: SuiteType.SALES,
      name: 'Pricing Strategy Expert',
      description: 'Specialist in pricing strategy and revenue optimization',
      capabilities: [
        {
          domain: 'pricing_strategy',
          level: AgentCapabilityLevel.EXPERT,
          specializations: ['value_based_pricing', 'competitive_pricing', 'dynamic_pricing'],
          validatedAt: new Date()
        }
      ]
    });

    suitePool.set(AgentType.PRICING_AGENT, [pricingAgent]);
  }

  /**
   * Create Operations Suite agents
   */
  private createOperationsAgents(suitePool: Map<AgentType, Agent[]>): void {
    // Optimization Agent
    const optimizationAgent = this.createAgent({
      type: AgentType.OPTIMIZATION_AGENT,
      suiteType: SuiteType.OPERATIONS,
      name: 'Process Optimization Expert',
      description: 'Specialist in process optimization and efficiency improvement',
      capabilities: [
        {
          domain: 'process_optimization',
          level: AgentCapabilityLevel.EXPERT,
          specializations: ['workflow_optimization', 'resource_optimization', 'quality_improvement'],
          validatedAt: new Date()
        }
      ]
    });

    suitePool.set(AgentType.OPTIMIZATION_AGENT, [optimizationAgent]);
  }

  /**
   * Helper method to create an agent
   */
  private createAgent(config: {
    type: AgentType;
    suiteType: SuiteType;
    name: string;
    description: string;
    capabilities: AgentCapability[];
  }): Agent {
    const now = new Date();
    
    return {
      id: `agent_${config.type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: config.type,
      suiteType: config.suiteType,
      name: config.name,
      description: config.description,
      status: AgentStatus.AVAILABLE,
      capabilities: config.capabilities,
      performance: {
        tasksCompleted: 0,
        averageQualityScore: 85, // Starting score
        averageCompletionTime: 30, // 30 minutes average
        collaborationRating: 80,
        reliabilityScore: 90,
        lastUpdated: now
      },
      availability: {
        maxConcurrentTasks: 3,
        currentTaskCount: 0,
        estimatedAvailableAt: null,
        timezone: 'UTC',
        workingHours: {
          start: '00:00', // AI agents work 24/7
          end: '23:59'
        }
      },
      collaboration: {
        preferredPartners: [],
        successfulCollaborations: 0,
        crossSuiteExperience: [config.suiteType],
        communicationStyle: 'COLLABORATIVE'
      },
      metadata: {
        version: '1.0.0',
        createdAt: now,
        lastActive: now,
        configuration: {},
        tags: [`suite:${config.suiteType}`, `type:${config.type}`]
      }
    };
  }

  /**
   * Allocate agents for a task based on requirements
   */
  async allocateAgents(request: AllocationRequest): Promise<AgentAllocation> {
    const { requirements, context, priority } = request;
    
    // Find primary agent
    const primaryAgent = await this.findBestAgent(
      requirements.primary,
      context.suiteContext,
      priority,
      'PRIMARY'
    );

    if (!primaryAgent) {
      throw new Error(`No available agent found for primary role: ${requirements.primary}`);
    }

    // Find supporting agents
    const supportingAgents: Agent[] = [];
    for (const supportingType of requirements.supporting) {
      const agent = await this.findBestAgent(
        supportingType,
        context.suiteContext,
        priority,
        'SUPPORTING'
      );
      if (agent) {
        supportingAgents.push(agent);
      }
    }

    // Find reviewer agents
    const reviewerAgents: Agent[] = [];
    for (const reviewerType of requirements.reviewers) {
      const agent = await this.findBestAgent(
        reviewerType,
        context.suiteContext,
        priority,
        'REVIEWER'
      );
      if (agent) {
        reviewerAgents.push(agent);
      }
    }

    // Create allocation
    const allocation: AgentAllocation = {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      taskId: request.taskId,
      initiativeId: request.initiativeId,
      agents: {
        primary: primaryAgent,
        supporting: supportingAgents,
        reviewers: reviewerAgents
      },
      allocationStrategy: this.determineAllocationStrategy(primaryAgent, supportingAgents, reviewerAgents),
      estimatedDuration: this.estimateTaskDuration(primaryAgent, supportingAgents.length),
      allocatedAt: new Date(),
      expectedCompletion: new Date(Date.now() + this.estimateTaskDuration(primaryAgent, supportingAgents.length) * 60000)
    };

    // Update agent availability
    this.updateAgentAvailability(primaryAgent, AgentStatus.BUSY);
    supportingAgents.forEach(agent => this.updateAgentAvailability(agent, AgentStatus.BUSY));
    reviewerAgents.forEach(agent => this.updateAgentAvailability(agent, AgentStatus.BUSY));

    // Store allocation
    this.activeAllocations.set(allocation.requestId, allocation);

    return allocation;
  }

  /**
   * Find the best available agent for a specific role
   */
  private async findBestAgent(
    agentType: AgentType,
    preferredSuite: SuiteType,
    priority: string,
    role: 'PRIMARY' | 'SUPPORTING' | 'REVIEWER'
  ): Promise<Agent | null> {
    // First, try to find agent in preferred suite
    const preferredSuitePool = this.agentPools.get(preferredSuite);
    if (preferredSuitePool?.has(agentType)) {
      const agents = preferredSuitePool.get(agentType)!;
      const availableAgent = this.selectBestAvailableAgent(agents, priority, role);
      if (availableAgent) {
        return availableAgent;
      }
    }

    // If not found in preferred suite, search across all suites
    const suitesToSearch: Array<[SuiteType, Map<AgentType, Agent[]>]> = [];
    this.agentPools.forEach((suitePool, suiteType) => {
      suitesToSearch.push([suiteType, suitePool]);
    });
    
    for (const [suiteType, suitePool] of suitesToSearch) {
      if (suiteType === preferredSuite) continue; // Already checked
      
      if (suitePool.has(agentType)) {
        const agents = suitePool.get(agentType)!;
        const availableAgent = this.selectBestAvailableAgent(agents, priority, role);
        if (availableAgent) {
          return availableAgent;
        }
      }
    }

    return null;
  }

  /**
   * Select the best available agent from a list
   */
  private selectBestAvailableAgent(
    agents: Agent[],
    priority: string,
    role: string
  ): Agent | null {
    const availableAgents = agents.filter(agent => 
      agent.status === AgentStatus.AVAILABLE &&
      agent.availability.currentTaskCount < agent.availability.maxConcurrentTasks
    );

    if (availableAgents.length === 0) {
      return null;
    }

    // Score agents based on performance and suitability
    const scoredAgents = availableAgents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, priority, role)
    }));

    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score);

    return scoredAgents[0].agent;
  }

  /**
   * Calculate agent suitability score
   */
  private calculateAgentScore(agent: Agent, priority: string, role: string): number {
    let score = 0;

    // Base performance score (0-40 points)
    score += agent.performance.averageQualityScore * 0.4;

    // Availability score (0-20 points)
    const availabilityRatio = 1 - (agent.availability.currentTaskCount / agent.availability.maxConcurrentTasks);
    score += availabilityRatio * 20;

    // Collaboration score for supporting/reviewer roles (0-20 points)
    if (role !== 'PRIMARY') {
      score += agent.performance.collaborationRating * 0.2;
    }

    // Priority boost (0-10 points)
    if (priority === 'URGENT') {
      score += 10;
    } else if (priority === 'HIGH') {
      score += 5;
    }

    // Experience bonus (0-10 points)
    const experienceBonus = Math.min(agent.performance.tasksCompleted / 10, 10);
    score += experienceBonus;

    return score;
  }

  /**
   * Update agent availability status
   */
  private updateAgentAvailability(agent: Agent, status: AgentStatus): void {
    agent.status = status;
    
    if (status === AgentStatus.BUSY) {
      agent.availability.currentTaskCount++;
    } else if (status === AgentStatus.AVAILABLE) {
      agent.availability.currentTaskCount = Math.max(0, agent.availability.currentTaskCount - 1);
    }
    
    agent.metadata.lastActive = new Date();
  }

  /**
   * Determine allocation strategy based on agents
   */
  private determineAllocationStrategy(
    primary: Agent,
    supporting: Agent[],
    reviewers: Agent[]
  ): string {
    const totalAgents = 1 + supporting.length + reviewers.length;
    
    if (totalAgents === 1) {
      return 'SOLO_EXECUTION';
    } else if (supporting.length > 0 && reviewers.length === 0) {
      return 'COLLABORATIVE_EXECUTION';
    } else if (supporting.length === 0 && reviewers.length > 0) {
      return 'REVIEWED_EXECUTION';
    } else {
      return 'FULL_COLLABORATION';
    }
  }

  /**
   * Estimate task duration based on agents
   */
  private estimateTaskDuration(primary: Agent, supportingCount: number): number {
    // Base duration from primary agent's average
    let duration = primary.performance.averageCompletionTime;
    
    // Adjust for collaboration overhead
    if (supportingCount > 0) {
      duration *= (1 + supportingCount * 0.1); // 10% overhead per supporting agent
    }
    
    // Apply efficiency multiplier based on agent quality
    const efficiencyMultiplier = primary.performance.averageQualityScore / 100;
    duration *= (2 - efficiencyMultiplier); // Higher quality = faster completion
    
    return Math.round(duration);
  }

  /**
   * Complete a task allocation and free up agents
   */
  async completeAllocation(requestId: string, outcome: {
    success: boolean;
    qualityScore: number;
    actualDuration: number;
    feedback?: string;
  }): Promise<void> {
    const allocation = this.activeAllocations.get(requestId);
    if (!allocation) {
      throw new Error(`Allocation ${requestId} not found`);
    }

    // Update agent performance metrics
    this.updateAgentPerformance(allocation.agents.primary, outcome);
    allocation.agents.supporting.forEach(agent => this.updateAgentPerformance(agent, outcome));
    allocation.agents.reviewers.forEach(agent => this.updateAgentPerformance(agent, outcome));

    // Free up agents
    this.updateAgentAvailability(allocation.agents.primary, AgentStatus.AVAILABLE);
    allocation.agents.supporting.forEach(agent => this.updateAgentAvailability(agent, AgentStatus.AVAILABLE));
    allocation.agents.reviewers.forEach(agent => this.updateAgentAvailability(agent, AgentStatus.AVAILABLE));

    // Move to history
    this.allocationHistory.push(allocation);
    this.activeAllocations.delete(requestId);
  }

  /**
   * Update agent performance based on task outcome
   */
  private updateAgentPerformance(agent: Agent, outcome: any): void {
    const performance = agent.performance;
    
    // Update task count
    performance.tasksCompleted++;
    
    // Update quality score (weighted average)
    const weight = Math.min(performance.tasksCompleted, 10) / 10; // Gradually increase weight
    performance.averageQualityScore = 
      (performance.averageQualityScore * (1 - weight)) + 
      (outcome.qualityScore * weight);
    
    // Update completion time
    performance.averageCompletionTime = 
      (performance.averageCompletionTime * (1 - weight)) + 
      (outcome.actualDuration * weight);
    
    // Update reliability (based on success rate)
    const reliabilityAdjustment = outcome.success ? 1 : -5;
    performance.reliabilityScore = Math.max(0, Math.min(100, 
      performance.reliabilityScore + reliabilityAdjustment
    ));
    
    performance.lastUpdated = new Date();
  }

  /**
   * Get agent pool statistics
   */
  getPoolStatistics(): {
    totalAgents: number;
    agentsByStatus: Record<AgentStatus, number>;
    agentsBySuite: Record<SuiteType, number>;
    agentsByType: Record<AgentType, number>;
    utilizationRate: number;
  } {
    let totalAgents = 0;
    const agentsByStatus: Record<AgentStatus, number> = {
      [AgentStatus.AVAILABLE]: 0,
      [AgentStatus.BUSY]: 0,
      [AgentStatus.OFFLINE]: 0,
      [AgentStatus.MAINTENANCE]: 0
    };
    const agentsBySuite: Record<SuiteType, number> = {} as any;
    const agentsByType: Record<AgentType, number> = {} as any;

    this.agentPools.forEach((suitePool, suiteType) => {
      let suiteCount = 0;
      
      suitePool.forEach((agents, agentType) => {
        agents.forEach(agent => {
          totalAgents++;
          suiteCount++;
          agentsByStatus[agent.status]++;
          
          if (!agentsByType[agentType]) agentsByType[agentType] = 0;
          agentsByType[agentType]++;
        });
      });
      
      agentsBySuite[suiteType] = suiteCount;
    });

    const utilizationRate = totalAgents > 0 ? 
      (agentsByStatus[AgentStatus.BUSY] / totalAgents) * 100 : 0;

    return {
      totalAgents,
      agentsByStatus,
      agentsBySuite,
      agentsByType,
      utilizationRate
    };
  }

  /**
   * Get agents by suite type
   */
  getAgentsBySuite(suiteType: SuiteType): Agent[] {
    const suitePool = this.agentPools.get(suiteType);
    if (!suitePool) return [];

    const agents: Agent[] = [];
    suitePool.forEach((agentList) => {
      agents.push(...agentList);
    });
    
    return agents;
  }

  /**
   * Get active allocations
   */
  getActiveAllocations(): AgentAllocation[] {
    return Array.from(this.activeAllocations.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | null {
    let foundAgent: Agent | null = null;
    
    this.agentPools.forEach((suitePool) => {
      if (foundAgent) return; // Already found
      
      suitePool.forEach((agents) => {
        if (foundAgent) return; // Already found
        
        const agent = agents.find(a => a.id === agentId);
        if (agent) foundAgent = agent;
      });
    });
    
    return foundAgent;
  }
}

// Export singleton instance
export const agentPoolService = new AgentPoolService();