import "server-only";

import { BaseAgent, AgentCapabilities, AgentResponse, AgentOperationConfig, AgentType } from './base-agent';
import { AgentContext, NodeType } from './context-engine';
import { LLMService, llmService } from './llm-service';
import { CacheService, cacheService } from './cache-service';
import { runQuery, runSingleQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';

// Initiative-specific data interfaces
export interface InitiativeData {
  initiative: any;
  suite: any;
  workspace: any;
  tasks: any[];
  members: any[];
  dependencies: any[];
  milestones: any[];
  recentActivity: any[];
  metrics: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    overdueeTasks: number;
    avgTaskDuration: number;
    completionRate: number;
    velocityTrend: number;
    qualityScore: number;
    stakeholderSatisfaction: number;
  };
}

// Initiative planning results
export interface InitiativePlanning {
  executionPlan: {
    phases: Array<{
      name: string;
      description: string;
      duration: string;
      dependencies: string[];
      deliverables: string[];
      tasks: Array<{
        title: string;
        description: string;
        estimatedEffort: string;
        assignee?: string;
        dependencies: string[];
        acceptance_criteria: string[];
      }>;
    }>;
    timeline: {
      totalDuration: string;
      startDate: string;
      endDate: string;
      criticalPath: string[];
      milestones: Array<{
        name: string;
        date: string;
        deliverables: string[];
      }>;
    };
    resources: {
      requiredRoles: string[];
      skillsNeeded: string[];
      estimatedTeamSize: number;
      budgetEstimate?: string;
    };
  };
  riskAssessment: {
    risks: Array<{
      type: 'technical' | 'schedule' | 'resource' | 'stakeholder' | 'scope';
      severity: 'low' | 'medium' | 'high' | 'critical';
      probability: number;
      description: string;
      impact: string;
      mitigation: string[];
      contingency: string;
    }>;
    overallRiskScore: number;
    riskMitigationPlan: string[];
  };
  successCriteria: {
    outcomes: string[];
    kpis: Array<{
      name: string;
      target: string;
      measurement: string;
      frequency: string;
    }>;
    acceptanceCriteria: string[];
    definitionOfDone: string[];
  };
}

export interface InitiativeStrategy {
  vision: string;
  objectives: Array<{
    id: string;
    title: string;
    description: string;
    keyResults: string[];
    priority: 'high' | 'medium' | 'low';
    timeline: string;
    owner: string;
    dependencies: string[];
    success_metrics: string[];
  }>;
  approach: {
    methodology: string;
    principles: string[];
    constraints: string[];
    assumptions: string[];
  };
  roadmap: Array<{
    quarter: string;
    theme: string;
    objectives: string[];
    deliverables: string[];
    milestones: string[];
  }>;
  stakeholders: {
    primary: Array<{
      name: string;
      role: string;
      influence: 'high' | 'medium' | 'low';
      interest: 'high' | 'medium' | 'low';
      engagement_strategy: string;
    }>;
    communication_plan: Array<{
      stakeholder: string;
      frequency: string;
      method: string;
      content: string;
    }>;
  };
}

export interface InitiativeProgress {
  status: {
    overall: 'on_track' | 'at_risk' | 'delayed' | 'completed';
    completion_percentage: number;
    days_remaining: number;
    budget_utilization: number;
  };
  milestones: Array<{
    name: string;
    planned_date: string;
    actual_date?: string;
    status: 'completed' | 'on_track' | 'at_risk' | 'delayed';
    completion_percentage: number;
  }>;
  tasks: {
    total: number;
    completed: number;
    in_progress: number;
    blocked: number;
    overdue: number;
  };
  team: {
    utilization: number;
    velocity: number;
    blockers: string[];
    capacity_issues: string[];
  };
  risks: Array<{
    description: string;
    impact: 'high' | 'medium' | 'low';
    probability: number;
    status: 'open' | 'mitigated' | 'closed';
    owner: string;
  }>;
  recommendations: Array<{
    type: 'acceleration' | 'risk_mitigation' | 'resource_adjustment' | 'scope_change';
    description: string;
    impact: string;
    effort: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// Initiative-specific prompts
export class InitiativePrompts {
  static generatePlanningPrompt(initiativeData: InitiativeData, requirements: any): string {
    return `
You are an expert Initiative Planning Specialist with deep expertise in project management, agile methodologies, and strategic planning.
Create a comprehensive execution plan for the following initiative:

INITIATIVE DETAILS:
- Name: ${initiativeData.initiative.name}
- Description: ${initiativeData.initiative.description || 'Not provided'}
- Priority: ${initiativeData.initiative.priority || 'Not set'}
- Current Status: ${initiativeData.initiative.status}

SUITE CONTEXT:
- Suite: ${initiativeData.suite?.name || 'Unknown'}
- Workspace: ${initiativeData.workspace?.name || 'Unknown'}

CURRENT STATE:
- Total Tasks: ${initiativeData.metrics.totalTasks}
- Completed: ${initiativeData.metrics.completedTasks}
- In Progress: ${initiativeData.metrics.inProgressTasks}
- Blocked: ${initiativeData.metrics.blockedTasks}
- Completion Rate: ${Math.round(initiativeData.metrics.completionRate)}%

EXISTING TASKS:
${initiativeData.tasks.slice(0, 10).map(task => `
- ${task.name}: ${task.status} (Priority: ${task.priority || 'Not set'})
  Assignee: ${task.assignee || 'Unassigned'}
  Due: ${task.dueDate || 'No due date'}
`).join('')}

TEAM MEMBERS:
${initiativeData.members.map(member => `- ${member.name} (${member.role || 'Member'})`).join('\n')}

PLANNING REQUIREMENTS:
- Timeline: ${requirements.timeline || 'Not specified'}
- Budget: ${requirements.budget || 'Not specified'}
- Team Size: ${requirements.teamSize || 'Current team'}
- Success Criteria: ${requirements.successCriteria || 'Not specified'}
- Constraints: ${requirements.constraints || 'None specified'}

Create a comprehensive plan that includes:

1. EXECUTION PLAN
   - Break down into logical phases with clear deliverables
   - Define specific tasks for each phase with effort estimates
   - Identify dependencies and critical path
   - Create realistic timeline with milestones
   - Specify resource requirements and role assignments

2. RISK ASSESSMENT
   - Identify potential risks across all categories
   - Assess probability and impact for each risk
   - Provide specific mitigation strategies
   - Create contingency plans for high-impact risks
   - Calculate overall risk score

3. SUCCESS CRITERIA
   - Define clear outcomes and objectives
   - Establish measurable KPIs with targets
   - Create acceptance criteria for deliverables
   - Define comprehensive definition of done

Format your response as a detailed JSON object matching the InitiativePlanning interface.
Ensure all timelines are realistic and all recommendations are actionable.
`;
  }

  static generateStrategyPrompt(initiativeData: InitiativeData, input: any): string {
    return `
As a Strategic Initiative Advisor, develop a comprehensive strategy for this initiative:

INITIATIVE CONTEXT:
- Name: ${initiativeData.initiative.name}
- Description: ${initiativeData.initiative.description || 'Not provided'}
- Current Progress: ${Math.round(initiativeData.metrics.completionRate)}%
- Team Size: ${initiativeData.members.length}
- Quality Score: ${initiativeData.metrics.qualityScore}/100

STRATEGIC INPUTS:
- Business Goals: ${input.businessGoals || 'Not specified'}
- Success Metrics: ${input.successMetrics || 'Not specified'}
- Timeline: ${input.timeline || 'Not specified'}
- Constraints: ${input.constraints || 'None'}
- Stakeholder Requirements: ${input.stakeholderRequirements || 'Not specified'}

CURRENT DEPENDENCIES:
${initiativeData.dependencies.map(dep => `- ${dep.name}: ${dep.type}`).join('\n')}

Develop a comprehensive strategy that includes:

1. VISION & OBJECTIVES
   - Clear vision statement aligned with business goals
   - Specific, measurable objectives with key results
   - Priority matrix and timeline mapping
   - Ownership and accountability structure

2. APPROACH & METHODOLOGY
   - Recommended execution methodology
   - Core principles and guidelines
   - Key constraints and assumptions
   - Risk tolerance and mitigation philosophy

3. STRATEGIC ROADMAP
   - Quarter-by-quarter execution plan
   - Major themes and focus areas
   - Key deliverables and milestones
   - Progress checkpoints and review cycles

4. STAKEHOLDER MANAGEMENT
   - Stakeholder mapping with influence/interest analysis
   - Tailored engagement strategies
   - Communication plan and cadence
   - Decision-making framework

Return a comprehensive JSON object matching the InitiativeStrategy interface.
Ensure the strategy is practical, measurable, and aligned with business objectives.
`;
  }

  static generateProgressPrompt(initiativeData: InitiativeData): string {
    return `
As an Initiative Progress Analyst, provide a comprehensive progress assessment for this initiative:

INITIATIVE: ${initiativeData.initiative.name}
CURRENT STATUS: ${initiativeData.initiative.status}

PROGRESS METRICS:
- Total Tasks: ${initiativeData.metrics.totalTasks}
- Completed: ${initiativeData.metrics.completedTasks} (${Math.round(initiativeData.metrics.completionRate)}%)
- In Progress: ${initiativeData.metrics.inProgressTasks}
- Blocked: ${initiativeData.metrics.blockedTasks}
- Overdue: ${initiativeData.metrics.overdueeTasks}
- Avg Task Duration: ${initiativeData.metrics.avgTaskDuration} days
- Velocity Trend: ${initiativeData.metrics.velocityTrend > 0 ? 'Increasing' : 'Decreasing'}

TASK BREAKDOWN:
${initiativeData.tasks.map(task => `
- ${task.name}: ${task.status}
  Priority: ${task.priority || 'Normal'}
  Assignee: ${task.assignee || 'Unassigned'}
  Due: ${task.dueDate || 'No due date'}
  ${task.status === 'BLOCKED' ? 'BLOCKED: ' + (task.blockReason || 'Unknown') : ''}
`).join('')}

TEAM UTILIZATION:
${initiativeData.members.map(member => `- ${member.name}: Active on ${member.activeTasks || 0} tasks`).join('\n')}

RECENT ACTIVITY:
${initiativeData.recentActivity.slice(0, 5).map(activity => `- ${activity.action} (${activity.timestamp})`).join('\n')}

Provide a comprehensive progress analysis including:

1. STATUS ASSESSMENT
   - Overall initiative health and trajectory
   - Completion percentage and time remaining
   - Budget utilization if applicable
   - Risk assessment for timeline adherence

2. MILESTONE TRACKING
   - Status of planned milestones
   - Comparison of planned vs actual dates
   - Identification of delays and their impact
   - Forecast for upcoming milestones

3. TASK ANALYSIS
   - Detailed breakdown of task status
   - Identification of bottlenecks and blockers
   - Team utilization and capacity analysis
   - Velocity trends and productivity metrics

4. RISK IDENTIFICATION
   - Current risks and their impact
   - Probability assessment for timeline delays
   - Resource capacity issues
   - Quality concerns

5. RECOMMENDATIONS
   - Specific actions to accelerate progress
   - Resource reallocation suggestions
   - Risk mitigation strategies
   - Scope adjustment recommendations

Format your response as a structured JSON object matching the InitiativeProgress interface.
Focus on actionable insights and specific recommendations for improvement.
`;
  }
}

export class InitiativeAgent extends BaseAgent {
  // Required abstract properties
  readonly name = 'initiative-agent';
  readonly type: AgentType = 'INITIATIVE';
  readonly capabilities: AgentCapabilities = {
    canAnalyze: true,
    canGenerate: true,
    canOptimize: true,
    canSuggest: true,
    canAutomate: true
  };
  readonly version = '1.0.0';

  constructor(llmService: LLMService, cacheService: CacheService) {
    super(llmService, cacheService);
  }

  // Required abstract methods
  canHandleOperation(operation: string, context: AgentContext): boolean {
    const supportedOperations = [
      'analyze_initiative',
      'generate_recommendations',
      'optimize_workflow',
      'generate_metrics',
      'analyze_value_tracking',
      'suggest_improvements'
    ];
    
    return supportedOperations.includes(operation);
  }

  getAvailableOperations(context: AgentContext): string[] {
    const baseOperations = [
      'analyze_initiative',
      'generate_recommendations',
      'optimize_workflow',
      'generate_metrics'
    ];

    // Add advanced operations if user has appropriate permissions
    if (context.permissions?.canWrite) {
      baseOperations.push('suggest_improvements');
    }

    if (context.permissions?.canManage) {
      baseOperations.push('analyze_value_tracking');
    }

    return baseOperations;
  }

  /**
   * Gather comprehensive initiative data
   */
  private async gatherInitiativeData(initiativeId: string): Promise<InitiativeData> {
    try {
      // Get initiative information
      const initiativeQuery = `
        MATCH (i:Initiative {id: $initiativeId})
        OPTIONAL MATCH (i)<-[:HAS]-(s:Suite)
        OPTIONAL MATCH (s)<-[:CONTAINS]-(w:Workspace)
        RETURN i as initiative, s as suite, w as workspace
      `;
      const initiativeResult = await runSingleQuery(initiativeQuery, { initiativeId });
      
      if (!initiativeResult) {
        throw new Error(`Initiative ${initiativeId} not found`);
      }

      // Get tasks
      const tasksQuery = `
        MATCH (i:Initiative {id: $initiativeId})-[:HAS]->(t:Task)
        OPTIONAL MATCH (t)<-[:ASSIGNED_TO]-(u:User)
        RETURN t as task, u as assignee
      `;
      const tasks = await runQuery(tasksQuery, { initiativeId });

      // Get team members
      const membersQuery = `
        MATCH (i:Initiative {id: $initiativeId})<-[:ASSIGNED_TO]-(u:User)
        RETURN DISTINCT u as member, count(*) as taskCount
      `;
      const members = await runQuery(membersQuery, { initiativeId });

      // Get dependencies (mock for now)
      const dependencies: any[] = [];

      // Get milestones (mock for now)
      const milestones: any[] = [];

      // Recent activity (mock)
      const recentActivity = [
        { action: 'Task completed', timestamp: new Date().toISOString() },
        { action: 'New task created', timestamp: new Date().toISOString() }
      ];

      // Calculate metrics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.task.status === 'DONE').length;
      const inProgressTasks = tasks.filter(t => t.task.status === 'IN_PROGRESS').length;
      const blockedTasks = tasks.filter(t => t.task.status === 'BLOCKED').length;
      const overdueeTasks = 0; // Mock - would need to check due dates
      
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        initiative: initiativeResult.initiative,
        suite: initiativeResult.suite,
        workspace: initiativeResult.workspace,
        tasks: tasks.map(t => ({
          ...t.task,
          assignee: t.assignee?.name || 'Unassigned'
        })),
        members: members.map(m => ({
          ...m.member,
          activeTasks: m.taskCount
        })),
        dependencies,
        milestones,
        recentActivity,
        metrics: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          blockedTasks,
          overdueeTasks,
          avgTaskDuration: 5, // Mock
          completionRate,
          velocityTrend: 1.2, // Mock
          qualityScore: 88, // Mock
          stakeholderSatisfaction: 85 // Mock
        }
      };
    } catch (error) {
      console.error('Error gathering initiative data:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive initiative planning
   */
  async generatePlanning(initiativeId: string, requirements: any = {}): Promise<AgentResponse<InitiativePlanning>> {
    const startTime = Date.now();

    try {
      // Gather initiative data
      const initiativeData = await this.gatherInitiativeData(initiativeId);

      // Generate planning using LLM
      const prompt = InitiativePrompts.generatePlanningPrompt(initiativeData, requirements);
      const planning = await llmService.generateStructured<InitiativePlanning>({
        prompt,
        temperature: 0.3
      });

      // Store interaction using BaseAgent's pattern
      // The interaction tracking is handled by executeOperation in BaseAgent

      return {
        data: planning,
        metadata: {
          agentName: this.name,
          agentType: this.type,
          operation: 'generatePlanning',
          duration: Date.now() - startTime,
          cached: false,
          confidence: 0.88,
          modelUsed: 'gpt-3.5-turbo',
          interactionId: uuidv4()
        }
      };
    } catch (error) {
      console.error('Initiative planning generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate initiative strategy
   */
  async generateStrategy(initiativeId: string, input: any): Promise<AgentResponse<InitiativeStrategy>> {
    const startTime = Date.now();

    try {
      // Gather initiative data
      const initiativeData = await this.gatherInitiativeData(initiativeId);

      // Generate strategy using LLM
      const prompt = InitiativePrompts.generateStrategyPrompt(initiativeData, input);
      const strategy = await llmService.generateStructured<InitiativeStrategy>({
        prompt,
        temperature: 0.4
      });

      // Store interaction using BaseAgent's pattern
      // The interaction tracking is handled by executeOperation in BaseAgent

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
      console.error('Initiative strategy generation failed:', error);
      throw error;
    }
  }

  /**
   * Track initiative progress
   */
  async trackProgress(initiativeId: string): Promise<AgentResponse<InitiativeProgress>> {
    const startTime = Date.now();
    const cacheKey = `initiative-progress-${initiativeId}`;

    try {
      // Check cache
      const cached = await cacheService.get<InitiativeProgress>(cacheKey);
      if (cached) {
        return {
          data: cached,
          metadata: {
            agentName: this.name,
            agentType: this.type,
            operation: 'trackProgress',
            duration: Date.now() - startTime,
            cached: true,
            confidence: 0.95,
            modelUsed: 'gpt-3.5-turbo',
            interactionId: uuidv4()
          }
        };
      }

      // Gather initiative data
      const initiativeData = await this.gatherInitiativeData(initiativeId);

      // Generate progress analysis using LLM
      const prompt = InitiativePrompts.generateProgressPrompt(initiativeData);
      const progress = await llmService.generateStructured<InitiativeProgress>({
        prompt,
        temperature: 0.2
      });

      // Cache result
      await cacheService.set(cacheKey, progress, 180); // 3 minutes

      // Store interaction using BaseAgent's pattern
      // The interaction tracking is handled by executeOperation in BaseAgent

      return {
        data: progress,
        metadata: {
          agentName: this.name,
          agentType: this.type,
          operation: 'trackProgress',
          duration: Date.now() - startTime,
          cached: false,
          confidence: 0.92,
          modelUsed: 'gpt-3.5-turbo',
          interactionId: uuidv4()
        }
      };
    } catch (error) {
      console.error('Initiative progress tracking failed:', error);
      throw error;
    }
  }

  /**
   * Auto-generate tasks for initiative
   */
  async autoGenerateTasks(initiativeId: string, requirements: any = {}): Promise<AgentResponse<any[]>> {
    const startTime = Date.now();

    try {
      // Gather initiative data
      const initiativeData = await this.gatherInitiativeData(initiativeId);

      // Generate task suggestions
      const prompt = `
Based on the initiative "${initiativeData.initiative.name}" with description "${initiativeData.initiative.description || 'Not provided'}", 
generate a comprehensive list of tasks needed to complete this initiative.

Current tasks: ${initiativeData.tasks.map(t => t.name).join(', ')}

Requirements: ${JSON.stringify(requirements)}

Generate 8-12 specific, actionable tasks with:
- Clear titles and descriptions
- Estimated effort in story points (1, 2, 3, 5, 8)
- Priority (High, Medium, Low)
- Suggested assignee role
- Dependencies on other tasks
- Acceptance criteria

Return as JSON array of task objects.
`;

      const generatedTasks = await llmService.generateStructured<any[]>({
        prompt,
        temperature: 0.5
      });

      // Store interaction using BaseAgent's pattern
      // The interaction tracking is handled by executeOperation in BaseAgent

      return {
        data: generatedTasks,
        metadata: {
          agentName: this.name,
          agentType: this.type,
          operation: 'autoGenerateTasks',
          duration: Date.now() - startTime,
          cached: false,
          confidence: 0.80,
          modelUsed: 'gpt-3.5-turbo',
          interactionId: uuidv4()
        }
      };
    } catch (error) {
      console.error('Auto task generation failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const initiativeAgent = new InitiativeAgent(llmService, cacheService);