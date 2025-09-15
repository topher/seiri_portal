import "server-only";

import { BaseAgent, AgentCapabilities, AgentResponse, AgentOperationConfig, AgentType } from './base-agent';
import { AgentContext, NodeType } from './context-engine';
import { LLMService, llmService } from './llm-service';
import { CacheService, cacheService } from './cache-service';
import { runQuery, runSingleQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';

// Suite-specific data interfaces
export interface SuiteData {
  suite: any;
  workspace: any;
  initiatives: any[];
  tasks: any[];
  members: any[];
  recentActivity: any[];
  metrics: {
    totalInitiatives: number;
    completedInitiatives: number;
    inProgressInitiatives: number;
    totalTasks: number;
    completedTasks: number;
    avgInitiativeDuration: number;
    overdueInitiatives: number;
    resourceUtilization: number;
    budgetUtilization?: number;
    qualityScore: number;
  };
}

// Suite analysis results
export interface SuiteAnalysis {
  overview: {
    status: 'healthy' | 'warning' | 'critical';
    overallScore: number;
    keyMetrics: Record<string, number>;
    summary: string;
  };
  performance: {
    deliveryRate: number;
    qualityScore: number;
    resourceEfficiency: number;
    timelineAdherence: number;
    stakeholderSatisfaction: number;
  };
  risks: Array<{
    type: 'schedule' | 'resource' | 'quality' | 'scope' | 'stakeholder';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: string;
    mitigation: string;
    probability: number;
  }>;
  opportunities: Array<{
    type: 'optimization' | 'innovation' | 'efficiency' | 'quality';
    impact: 'low' | 'medium' | 'high';
    description: string;
    benefits: string;
    effort: string;
    timeline: string;
  }>;
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: 'process' | 'resource' | 'technology' | 'strategy';
    title: string;
    description: string;
    expectedOutcome: string;
    implementationSteps: string[];
    timeframe: string;
    requiredResources: string[];
  }>;
}

export interface SuiteOptimization {
  resourceOptimization: {
    currentAllocation: Record<string, number>;
    recommendedAllocation: Record<string, number>;
    expectedImprovement: number;
    reasoning: string;
  };
  processImprovements: Array<{
    process: string;
    currentEfficiency: number;
    targetEfficiency: number;
    improvements: string[];
    implementation: string[];
  }>;
  initiativePrioritization: Array<{
    initiativeId: string;
    currentPriority: number;
    recommendedPriority: number;
    reasoning: string;
    impactScore: number;
    effortScore: number;
  }>;
  timeline: {
    currentDuration: number;
    optimizedDuration: number;
    criticalPath: string[];
    bottlenecks: string[];
    accelerationOpportunities: string[];
  };
}

export interface SuiteStrategy {
  vision: string;
  objectives: Array<{
    id: string;
    title: string;
    description: string;
    keyResults: string[];
    timeline: string;
    owner: string;
    dependencies: string[];
  }>;
  roadmap: Array<{
    phase: string;
    duration: string;
    objectives: string[];
    deliverables: string[];
    milestones: string[];
    risks: string[];
  }>;
  success_metrics: Array<{
    name: string;
    target: number;
    current: number;
    unit: string;
    measurement_frequency: string;
  }>;
  stakeholder_engagement: {
    primary_stakeholders: string[];
    communication_plan: string[];
    decision_makers: string[];
    influencers: string[];
  };
}

// Suite-specific prompts
export class SuitePrompts {
  static generateAnalysisPrompt(suiteData: SuiteData): string {
    return `
You are an expert Suite Management Analyst specializing in project portfolio analysis and optimization. 
Analyze the following suite data and provide comprehensive insights:

SUITE INFORMATION:
- Name: ${suiteData.suite.name}
- Description: ${suiteData.suite.description || 'Not provided'}
- Start Date: ${suiteData.suite.startDate || 'Not set'}
- End Date: ${suiteData.suite.endDate || 'Not set'}
- Status: Active

CURRENT METRICS:
- Total Initiatives: ${suiteData.metrics.totalInitiatives}
- Completed Initiatives: ${suiteData.metrics.completedInitiatives}
- In Progress: ${suiteData.metrics.inProgressInitiatives}
- Total Tasks: ${suiteData.metrics.totalTasks}
- Completed Tasks: ${suiteData.metrics.completedTasks}
- Completion Rate: ${suiteData.metrics.totalInitiatives > 0 ? Math.round((suiteData.metrics.completedInitiatives / suiteData.metrics.totalInitiatives) * 100) : 0}%
- Resource Utilization: ${suiteData.metrics.resourceUtilization}%
- Quality Score: ${suiteData.metrics.qualityScore}/100

INITIATIVES BREAKDOWN:
${suiteData.initiatives.map(init => `
- ${init.name}: ${init.status} (${init.tasks?.length || 0} tasks)
  Priority: ${init.priority || 'Not set'}
  Progress: ${Math.round(((init.completedTasks || 0) / Math.max(init.totalTasks || 1, 1)) * 100)}%
`).join('')}

RECENT ACTIVITY:
${suiteData.recentActivity.slice(0, 5).map(activity => `- ${activity.action} (${activity.timestamp})`).join('\n')}

Please provide a comprehensive analysis including:

1. OVERVIEW ASSESSMENT
   - Overall health status (healthy/warning/critical)
   - Overall score (0-100)
   - Key performance indicators
   - Executive summary

2. PERFORMANCE ANALYSIS
   - Delivery rate assessment
   - Quality metrics evaluation
   - Resource efficiency analysis
   - Timeline adherence review
   - Stakeholder satisfaction indicators

3. RISK ASSESSMENT
   - Identify potential risks by type (schedule, resource, quality, scope, stakeholder)
   - Assess severity and probability
   - Provide impact analysis
   - Suggest mitigation strategies

4. OPPORTUNITIES IDENTIFICATION
   - Optimization opportunities
   - Innovation potential
   - Efficiency improvements
   - Quality enhancements

5. STRATEGIC RECOMMENDATIONS
   - High-priority action items
   - Process improvements
   - Resource allocation suggestions
   - Technology recommendations
   - Implementation timelines

Format your response as a detailed JSON object matching the SuiteAnalysis interface.
Focus on actionable insights and specific recommendations.
`;
  }

  static generateOptimizationPrompt(suiteData: SuiteData): string {
    return `
As a Suite Optimization Specialist, analyze the provided suite data and generate specific optimization recommendations:

CURRENT SUITE STATE:
${JSON.stringify(suiteData.metrics, null, 2)}

INITIATIVES:
${suiteData.initiatives.map(init => `
Initiative: ${init.name}
- Status: ${init.status}
- Priority: ${init.priority || 'Not set'}
- Tasks: ${init.tasks?.length || 0}
- Completion: ${Math.round(((init.completedTasks || 0) / Math.max(init.totalTasks || 1, 1)) * 100)}%
- Assigned Members: ${init.assignedMembers?.length || 0}
`).join('')}

RESOURCE ALLOCATION:
- Total Members: ${suiteData.members.length}
- Active Initiatives: ${suiteData.metrics.inProgressInitiatives}
- Resource Utilization: ${suiteData.metrics.resourceUtilization}%

Please provide optimization recommendations in the following areas:

1. RESOURCE OPTIMIZATION
   - Analyze current resource allocation across initiatives
   - Recommend optimal distribution
   - Calculate expected performance improvement
   - Explain reasoning behind recommendations

2. PROCESS IMPROVEMENTS
   - Identify inefficient processes
   - Suggest improvements with efficiency targets
   - Provide implementation steps

3. INITIATIVE PRIORITIZATION
   - Re-evaluate initiative priorities based on impact vs effort
   - Recommend priority adjustments
   - Provide scoring rationale

4. TIMELINE OPTIMIZATION
   - Identify critical path and bottlenecks
   - Suggest timeline improvements
   - Highlight acceleration opportunities

Return your response as a structured JSON object matching the SuiteOptimization interface.
Be specific with numbers, percentages, and actionable steps.
`;
  }

  static generateStrategyPrompt(suiteData: SuiteData, input: any): string {
    return `
As a Strategic Suite Planner, develop a comprehensive strategy for the suite based on the current state and strategic inputs:

CURRENT SUITE:
- Name: ${suiteData.suite.name}
- Current Initiatives: ${suiteData.metrics.totalInitiatives}
- Completion Rate: ${Math.round((suiteData.metrics.completedInitiatives / Math.max(suiteData.metrics.totalInitiatives, 1)) * 100)}%
- Resource Utilization: ${suiteData.metrics.resourceUtilization}%

STRATEGIC INPUTS:
- Goals: ${input.goals || 'Not specified'}
- Timeline: ${input.timeline || 'Not specified'}
- Constraints: ${input.constraints || 'None specified'}
- Success Criteria: ${input.successCriteria || 'Not specified'}

CONTEXT:
${suiteData.initiatives.map(init => `- ${init.name}: ${init.status}`).join('\n')}

Develop a comprehensive strategy that includes:

1. VISION STATEMENT
   - Clear, inspiring vision for the suite
   - Aligned with organizational goals

2. STRATEGIC OBJECTIVES
   - Specific, measurable objectives
   - Key results for each objective
   - Timeline and ownership
   - Dependencies mapping

3. EXECUTION ROADMAP
   - Phase-based implementation plan
   - Deliverables and milestones
   - Resource requirements
   - Risk considerations

4. SUCCESS METRICS
   - KPIs with targets and current baselines
   - Measurement frequency
   - Accountability framework

5. STAKEHOLDER ENGAGEMENT
   - Key stakeholder identification
   - Communication strategy
   - Decision-making framework

Return a comprehensive JSON object matching the SuiteStrategy interface.
Ensure all recommendations are practical and achievable.
`;
  }
}

export class SuiteAgent extends BaseAgent {
  // Required abstract properties
  readonly name = 'suite-agent';
  readonly type: AgentType = 'SUITE';
  readonly capabilities: AgentCapabilities = {
    canAnalyze: true,
    canGenerate: true,
    canOptimize: true,
    canSuggest: true,
    canAutomate: false
  };
  readonly version = '1.0.0';

  constructor(llmService: LLMService, cacheService: CacheService) {
    super(llmService, cacheService);
  }

  // Required abstract methods
  canHandleOperation(operation: string, context: AgentContext): boolean {
    const supportedOperations = [
      'analyze_suite',
      'optimize_suite',
      'generate_insights',
      'coordinate_agents',
      'manage_resources'
    ];
    
    return supportedOperations.includes(operation);
  }

  getAvailableOperations(context: AgentContext): string[] {
    const baseOperations = [
      'analyze_suite',
      'optimize_suite',
      'generate_insights'
    ];

    // Add advanced operations if user has appropriate permissions
    if (context.permissions?.canWrite) {
      baseOperations.push('coordinate_agents');
    }

    if (context.permissions?.canManage) {
      baseOperations.push('manage_resources');
    }

    return baseOperations;
  }

  /**
   * Gather comprehensive suite data for analysis
   */
  private async gatherSuiteData(suiteId: string): Promise<SuiteData> {
    try {
      // Get suite information
      const suiteQuery = `
        MATCH (s:Suite {id: $suiteId})
        OPTIONAL MATCH (s)<-[:CONTAINS]-(w:Workspace)
        RETURN s as suite, w as workspace
      `;
      const suiteResult = await runSingleQuery(suiteQuery, { suiteId });
      
      if (!suiteResult) {
        throw new Error(`Suite ${suiteId} not found`);
      }

      // Get initiatives
      const initiativesQuery = `
        MATCH (s:Suite {id: $suiteId})-[:HAS]->(i:Initiative)
        OPTIONAL MATCH (i)-[:HAS]->(t:Task)
        OPTIONAL MATCH (i)<-[:ASSIGNED_TO]-(m:User)
        RETURN i as initiative, 
               collect(DISTINCT t) as tasks,
               collect(DISTINCT m) as assignedMembers,
               count(DISTINCT t) as totalTasks,
               count(DISTINCT CASE WHEN t.status = 'DONE' THEN t END) as completedTasks
      `;
      const initiatives = await runQuery(initiativesQuery, { suiteId });

      // Get all tasks in suite
      const tasksQuery = `
        MATCH (s:Suite {id: $suiteId})-[:HAS]->(i:Initiative)-[:HAS]->(t:Task)
        RETURN t as task
      `;
      const tasks = await runQuery(tasksQuery, { suiteId });

      // Get suite members
      const membersQuery = `
        MATCH (s:Suite {id: $suiteId})<-[:CONTAINS]-(w:Workspace)<-[:MEMBER_OF]-(u:User)
        RETURN DISTINCT u as member
      `;
      const members = await runQuery(membersQuery, { suiteId });

      // Get recent activity (mock for now - would need activity tracking)
      const recentActivity = [
        { action: 'Initiative created', timestamp: new Date().toISOString() },
        { action: 'Task completed', timestamp: new Date().toISOString() }
      ];

      // Calculate metrics
      const totalInitiatives = initiatives.length;
      const completedInitiatives = initiatives.filter(i => 
        i.initiative.status === 'COMPLETED'
      ).length;
      const inProgressInitiatives = initiatives.filter(i => 
        i.initiative.status === 'IN_PROGRESS'
      ).length;

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => 
        t.task.status === 'DONE'
      ).length;

      const resourceUtilization = members.length > 0 
        ? Math.round((inProgressInitiatives / members.length) * 100)
        : 0;

      return {
        suite: suiteResult.suite,
        workspace: suiteResult.workspace,
        initiatives: initiatives.map(i => ({
          ...i.initiative,
          tasks: i.tasks,
          assignedMembers: i.assignedMembers,
          totalTasks: i.totalTasks,
          completedTasks: i.completedTasks
        })),
        tasks: tasks.map(t => t.task),
        members: members.map(m => m.member),
        recentActivity,
        metrics: {
          totalInitiatives,
          completedInitiatives,
          inProgressInitiatives,
          totalTasks,
          completedTasks,
          avgInitiativeDuration: 30, // Mock data
          overdueInitiatives: 0, // Mock data
          resourceUtilization,
          qualityScore: 85 // Mock data
        }
      };
    } catch (error) {
      console.error('Error gathering suite data:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive suite analysis
   */
  async generateAnalysis(suiteId: string): Promise<AgentResponse<SuiteAnalysis>> {
    const startTime = Date.now();
    const cacheKey = `suite-analysis-${suiteId}`;

    try {
      // Check cache
      const cached = await cacheService.get<SuiteAnalysis>(cacheKey);
      if (cached) {
        return {
          data: cached,
          metadata: {
            agentName: this.name,
            agentType: this.type,
            operation: 'generateAnalysis',
            duration: Date.now() - startTime,
            cached: true,
            confidence: 0.95,
            modelUsed: 'gpt-3.5-turbo',
            interactionId: uuidv4()
          }
        };
      }

      // Gather suite data
      const suiteData = await this.gatherSuiteData(suiteId);

      // Generate analysis using LLM
      const prompt = SuitePrompts.generateAnalysisPrompt(suiteData);
      const analysis = await llmService.generateStructured<SuiteAnalysis>({
        prompt,
        temperature: 0.3
      });

      // Cache result
      await cacheService.set(cacheKey, analysis, 300); // 5 minutes

      // Store interaction (would be handled by executeOperation in real implementation)

      return {
        data: analysis,
        metadata: {
          agentName: this.name,
          agentType: this.type,
          operation: 'generateAnalysis',
          duration: Date.now() - startTime,
          cached: false,
          confidence: 0.9,
          modelUsed: 'gpt-3.5-turbo',
          interactionId: uuidv4()
        }
      };
    } catch (error) {
      console.error('Suite analysis generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate suite optimization recommendations
   */
  async optimizeSuite(suiteId: string): Promise<AgentResponse<SuiteOptimization>> {
    const startTime = Date.now();
    const cacheKey = `suite-optimization-${suiteId}`;

    try {
      // Check cache
      const cached = await cacheService.get<SuiteOptimization>(cacheKey);
      if (cached) {
        return {
          data: cached,
          metadata: {
            agentName: this.name,
            agentType: this.type,
            operation: 'optimizeSuite',
            duration: Date.now() - startTime,
            cached: true,
            confidence: 0.95,
            modelUsed: 'gpt-3.5-turbo',
            interactionId: uuidv4()
          }
        };
      }

      // Gather suite data
      const suiteData = await this.gatherSuiteData(suiteId);

      // Generate optimization using LLM
      const prompt = SuitePrompts.generateOptimizationPrompt(suiteData);
      const optimization = await llmService.generateStructured<SuiteOptimization>({
        prompt,
        temperature: 0.2
      });

      // Cache result
      await cacheService.set(cacheKey, optimization, 600); // 10 minutes

      // Store interaction (would be handled by executeOperation in real implementation)

      return {
        data: optimization,
        metadata: {
          agentName: this.name,
          agentType: this.type,
          operation: 'optimizeSuite',
          duration: Date.now() - startTime,
          cached: false,
          confidence: 0.88,
          modelUsed: 'gpt-3.5-turbo',
          interactionId: uuidv4()
        }
      };
    } catch (error) {
      console.error('Suite optimization failed:', error);
      throw error;
    }
  }

  /**
   * Generate strategic plan for suite
   */
  async generateStrategy(suiteId: string, input: any): Promise<AgentResponse<SuiteStrategy>> {
    const startTime = Date.now();

    try {
      // Gather suite data
      const suiteData = await this.gatherSuiteData(suiteId);

      // Generate strategy using LLM
      const prompt = SuitePrompts.generateStrategyPrompt(suiteData, input);
      const strategy = await llmService.generateStructured<SuiteStrategy>({
        prompt,
        temperature: 0.4
      });

      // Store interaction (would be handled by executeOperation in real implementation)

      return {
        data: strategy,
        metadata: {
          agentName: this.name,
          agentType: this.type,
          operation: 'generateStrategy',
          duration: Date.now() - startTime,
          cached: false,
          confidence: 0.85,
          modelUsed: 'gpt-3.5-turbo',
          interactionId: uuidv4()
        }
      };
    } catch (error) {
      console.error('Suite strategy generation failed:', error);
      throw error;
    }
  }

  /**
   * Perform suite health check
   */
  async performHealthCheck(suiteId: string): Promise<AgentResponse<any>> {
    const startTime = Date.now();

    try {
      const suiteData = await this.gatherSuiteData(suiteId);
      
      // Calculate health metrics
      const completionRate = suiteData.metrics.totalInitiatives > 0 
        ? (suiteData.metrics.completedInitiatives / suiteData.metrics.totalInitiatives) * 100 
        : 0;
      
      const taskCompletionRate = suiteData.metrics.totalTasks > 0
        ? (suiteData.metrics.completedTasks / suiteData.metrics.totalTasks) * 100
        : 0;

      const healthScore = Math.round(
        (completionRate * 0.4) + 
        (taskCompletionRate * 0.3) + 
        (suiteData.metrics.resourceUtilization * 0.2) + 
        (suiteData.metrics.qualityScore * 0.1)
      );

      const status = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';

      const healthCheck = {
        overallHealth: status,
        healthScore,
        metrics: {
          initiativeCompletionRate: Math.round(completionRate),
          taskCompletionRate: Math.round(taskCompletionRate),
          resourceUtilization: suiteData.metrics.resourceUtilization,
          qualityScore: suiteData.metrics.qualityScore
        },
        issues: [] as string[],
        recommendations: [] as string[]
      };

      // Add issues based on metrics
      if (completionRate < 50) {
        healthCheck.issues.push('Low initiative completion rate');
        healthCheck.recommendations.push('Review initiative scoping and resource allocation');
      }

      if (suiteData.metrics.resourceUtilization > 90) {
        healthCheck.issues.push('Resource over-utilization detected');
        healthCheck.recommendations.push('Consider redistributing workload or adding resources');
      }

      return {
        data: healthCheck,
        metadata: {
          agentName: this.name,
          agentType: this.type,
          operation: 'performHealthCheck',
          duration: Date.now() - startTime,
          cached: false,
          confidence: 0.92,
          modelUsed: 'gpt-3.5-turbo',
          interactionId: uuidv4()
        }
      };
    } catch (error) {
      console.error('Suite health check failed:', error);
      throw error;
    }
  }
}

// Singleton will be created in setup.ts with proper dependencies