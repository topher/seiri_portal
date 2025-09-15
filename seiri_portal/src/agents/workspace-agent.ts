import "server-only";

import { BaseAgent, AgentCapabilities, AgentResponse, AgentOperationConfig } from './base-agent';
import { AgentContext, NodeType } from './context-engine';
import { LLMService, llmService } from './llm-service';
import { CacheService, cacheService } from './cache-service';
import { runQuery, runSingleQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';
import {
  WorkspaceInsights,
  OptimizationSuggestion,
  WorkspacePrompts,
  Recommendation,
  CriticalIssue
} from './prompts/workspace-prompts';

export interface WorkspaceData {
  workspace: any;
  suites: any[];
  initiatives: any[];
  tasks: any[];
  members: any[];
  recentActivity: any[];
  metrics: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    avgTaskDuration: number;
    overdueTasks: number;
  };
}

export interface StrategyInput {
  goals: string[];
  constraints: string[];
  timeline: string;
  resources: string[];
}

export interface OptimizationResult {
  suggestions: OptimizationSuggestion[];
  quickWins: Array<{
    title: string;
    description: string;
    impact: string;
    effort: string;
  }>;
  longTermImprovements: Array<{
    title: string;
    description: string;
    timeline: string;
    impact: string;
  }>;
}

export class WorkspaceAgent extends BaseAgent {
  readonly name = 'workspace-agent';
  readonly type = 'WORKSPACE' as const;
  readonly version = '1.0.0';
  readonly capabilities: AgentCapabilities = {
    canAnalyze: true,
    canGenerate: true,
    canOptimize: true,
    canSuggest: true,
    canAutomate: false // Not implemented yet
  };

  constructor(llmService: LLMService, cacheService: CacheService) {
    super(llmService, cacheService);
  }

  canHandleOperation(operation: string, context: AgentContext): boolean {
    if (context.nodeType !== 'WORKSPACE') return false;
    
    const supportedOperations = [
      'generateInsights',
      'optimizeWorkspace',
      'generateStrategy',
      'healthCheck',
      'analyzePerformance',
      'suggestImprovements'
    ];
    
    return supportedOperations.includes(operation);
  }

  getAvailableOperations(context: AgentContext): string[] {
    if (context.nodeType !== 'WORKSPACE') return [];
    
    const baseOperations = ['generateInsights', 'healthCheck', 'analyzePerformance'];
    
    // Add advanced operations based on permissions
    if (context.permissions.canWrite) {
      baseOperations.push('optimizeWorkspace', 'suggestImprovements');
    }
    
    if (context.permissions.canManage) {
      baseOperations.push('generateStrategy');
    }
    
    return baseOperations;
  }

  /**
   * Generate comprehensive workspace insights
   */
  async generateInsights(context: AgentContext, config?: AgentOperationConfig): Promise<AgentResponse<WorkspaceInsights>> {
    return this.executeOperation(
      'generateInsights',
      context,
      {},
      async (ctx) => {
        this.validateContext(ctx, 'WORKSPACE');
        
        // Gather comprehensive workspace data
        const workspaceData = await this.gatherWorkspaceData(ctx.currentNode.id);
        
        // Generate insights using LLM
        const prompt = WorkspacePrompts.buildInsightsPrompt(ctx, workspaceData);
        const insights = await this.llm.generateStructured<WorkspaceInsights>({
          prompt,
          temperature: 0.7,
          maxTokens: 3000
        });
        
        // Store insights in Neo4j
        await this.storeInsights(ctx.currentNode.id, insights);
        
        // Log the activity
        await this.logActivity('info', 'Generated workspace insights', ctx, {
          metricsCount: Object.keys(insights.keyMetrics).length,
          recommendationsCount: insights.recommendations.length,
          criticalIssuesCount: insights.criticalIssues.length
        });
        
        return insights;
      },
      config
    );
  }

  /**
   * Generate optimization suggestions for the workspace
   */
  async optimizeWorkspace(context: AgentContext, config?: AgentOperationConfig): Promise<AgentResponse<OptimizationResult>> {
    return this.executeOperation(
      'optimizeWorkspace',
      context,
      {},
      async (ctx) => {
        this.validateContext(ctx, 'WORKSPACE');
        
        if (!ctx.permissions.canWrite) {
          throw new Error('Write permissions required for optimization');
        }
        
        // Gather data and current insights
        const workspaceData = await this.gatherWorkspaceData(ctx.currentNode.id);
        const currentInsights = await this.getStoredInsights(ctx.currentNode.id);
        
        // Generate optimization suggestions
        const prompt = WorkspacePrompts.buildOptimizationPrompt(ctx, workspaceData, currentInsights || undefined);
        const optimization = await this.llm.generateStructured<OptimizationResult>({
          prompt,
          temperature: 0.8,
          maxTokens: 2500
        });
        
        // Store optimization results
        await this.storeOptimization(ctx.currentNode.id, optimization);
        
        await this.logActivity('info', 'Generated workspace optimization', ctx, {
          suggestionsCount: optimization.suggestions.length,
          quickWinsCount: optimization.quickWins.length
        });
        
        return optimization;
      },
      config
    );
  }

  /**
   * Generate strategic plan for the workspace
   */
  async generateStrategy(
    context: AgentContext, 
    input: StrategyInput, 
    config?: AgentOperationConfig
  ): Promise<AgentResponse<any>> {
    return this.executeOperation(
      'generateStrategy',
      context,
      input,
      async (ctx, strategyInput) => {
        this.validateContext(ctx, 'WORKSPACE');
        
        if (!ctx.permissions.canManage) {
          throw new Error('Management permissions required for strategy generation');
        }
        
        // Generate strategic plan
        const prompt = WorkspacePrompts.buildStrategyPrompt(
          ctx, 
          strategyInput.goals, 
          strategyInput.constraints
        );
        
        const strategy = await this.llm.generateStructured({
          prompt,
          temperature: 0.6,
          maxTokens: 3500
        });
        
        // Store strategy
        await this.storeStrategy(ctx.currentNode.id, strategy, strategyInput);
        
        await this.logActivity('info', 'Generated workspace strategy', ctx, {
          goalsCount: strategyInput.goals.length,
          constraintsCount: strategyInput.constraints.length
        });
        
        return strategy;
      },
      config
    );
  }

  /**
   * Perform comprehensive workspace health check
   */
  async healthCheck(context: AgentContext, config?: AgentOperationConfig): Promise<AgentResponse<any>> {
    return this.executeOperation(
      'healthCheck',
      context,
      {},
      async (ctx) => {
        this.validateContext(ctx, 'WORKSPACE');
        
        const workspaceData = await this.gatherWorkspaceData(ctx.currentNode.id);
        
        const prompt = WorkspacePrompts.buildHealthCheckPrompt(ctx, workspaceData);
        const healthCheck = await this.llm.generateStructured<any>({
          prompt,
          temperature: 0.5,
          maxTokens: 2000
        });
        
        // Store health check results
        await this.storeHealthCheck(ctx.currentNode.id, healthCheck);
        
        await this.logActivity('info', 'Performed workspace health check', ctx, {
          overallHealth: healthCheck.overallHealth,
          healthScore: healthCheck.healthScore
        });
        
        return healthCheck;
      },
      config
    );
  }

  /**
   * Public method for external execution
   */
  async execute(operation: string, context: AgentContext, input?: any): Promise<AgentResponse<any>> {
    switch (operation) {
      case 'generateInsights':
        return this.generateInsights(context, input?.config);
      case 'optimizeWorkspace':
        return this.optimizeWorkspace(context, input?.config);
      case 'generateStrategy':
        return this.generateStrategy(context, input, input?.config);
      case 'healthCheck':
        return this.healthCheck(context, input?.config);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  // Private helper methods
  private async gatherWorkspaceData(workspaceId: string): Promise<WorkspaceData> {
    const queries = {
      workspace: `
        MATCH (w:WORKSPACE {id: $workspaceId})
        RETURN w
      `,
      suites: `
        MATCH (w:WORKSPACE {id: $workspaceId})-[:CONTAINS]->(s:SUITE)
        RETURN s
        ORDER BY s.name
      `,
      initiatives: `
        MATCH (w:WORKSPACE {id: $workspaceId})-[:CONTAINS]->(i:INITIATIVE)
        RETURN i, 
               size((i)-[:HAS]->(:TASK)) as taskCount,
               size((i)-[:HAS]->(:TASK {status: 'DONE'})) as completedTasks
        ORDER BY i.priority DESC, i.createdAt DESC
      `,
      tasks: `
        MATCH (w:WORKSPACE {id: $workspaceId})-[:CONTAINS*]->(t:TASK)
        RETURN t,
               labels(t) as labels,
               [(t)-[:ASSIGNED_TO]->(u:User) | u.name][0] as assignee
        ORDER BY t.priority DESC, t.createdAt DESC
        LIMIT 100
      `,
      members: `
        MATCH (w:WORKSPACE {id: $workspaceId})-[:HAS_MEMBER]->(m:WorkspaceMember)-[:BELONGS_TO]->(u:User)
        RETURN m, u
        ORDER BY u.name
      `,
      recentActivity: `
        MATCH (w:WORKSPACE {id: $workspaceId})-[:CONTAINS*]->(n)
        WHERE n.updatedAt > datetime() - duration('P7D')
        RETURN n, labels(n)[0] as nodeType
        ORDER BY n.updatedAt DESC
        LIMIT 50
      `
    };

    const [workspace, suites, initiatives, tasks, members, recentActivity] = await Promise.all([
      runSingleQuery(queries.workspace, { workspaceId }),
      runQuery(queries.suites, { workspaceId }),
      runQuery(queries.initiatives, { workspaceId }),
      runQuery(queries.tasks, { workspaceId }),
      runQuery(queries.members, { workspaceId }),
      runQuery(queries.recentActivity, { workspaceId })
    ]);

    // Calculate metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.t.status === 'DONE').length;
    const inProgressTasks = tasks.filter((t: any) => t.t.status === 'IN_PROGRESS').length;
    const blockedTasks = tasks.filter((t: any) => t.t.status === 'BLOCKED').length;
    const overdueTasks = tasks.filter((t: any) => {
      return t.t.dueDate && new Date(t.t.dueDate) < new Date() && t.t.status !== 'DONE';
    }).length;

    // Calculate average task duration for completed tasks
    const completedTasksWithDuration = tasks.filter((t: any) => 
      t.t.status === 'DONE' && t.t.completedAt && t.t.createdAt
    );
    
    const avgTaskDuration = completedTasksWithDuration.length > 0
      ? completedTasksWithDuration.reduce((sum: number, t: any) => {
          const duration = new Date(t.t.completedAt).getTime() - new Date(t.t.createdAt).getTime();
          return sum + duration;
        }, 0) / completedTasksWithDuration.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    return {
      workspace: workspace?.w || {},
      suites: suites.map((r: any) => r.s),
      initiatives: initiatives.map((r: any) => ({
        ...r.i,
        taskCount: r.taskCount,
        completedTasks: r.completedTasks
      })),
      tasks: tasks.map((r: any) => ({
        ...r.t,
        assignee: r.assignee
      })),
      members: members.map((r: any) => ({
        member: r.m,
        user: r.u
      })),
      recentActivity: recentActivity.map((r: any) => ({
        node: r.n,
        type: r.nodeType
      })),
      metrics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        avgTaskDuration,
        overdueTasks
      }
    };
  }

  private async storeInsights(workspaceId: string, insights: WorkspaceInsights): Promise<void> {
    try {
      await runQuery(`
        MATCH (w:WORKSPACE {id: $workspaceId})
        MERGE (w)-[:HAS_INSIGHTS]->(insights:WorkspaceInsights {generatedAt: datetime()})
        SET insights.id = $insightsId,
            insights.summary = $summary,
            insights.keyMetrics = $keyMetrics,
            insights.healthScore = $healthScore,
            insights.trends = $trends,
            insights.recommendations = $recommendations,
            insights.criticalIssues = $criticalIssues,
            insights.updatedAt = datetime()
      `, {
        workspaceId,
        insightsId: uuidv4(),
        summary: insights.summary,
        keyMetrics: JSON.stringify(insights.keyMetrics),
        healthScore: JSON.stringify(insights.healthScore),
        trends: JSON.stringify(insights.trends),
        recommendations: JSON.stringify(insights.recommendations),
        criticalIssues: JSON.stringify(insights.criticalIssues)
      });
    } catch (error) {
      console.error('Failed to store workspace insights:', error);
    }
  }

  private async getStoredInsights(workspaceId: string): Promise<WorkspaceInsights | null> {
    try {
      const result = await runSingleQuery(`
        MATCH (w:WORKSPACE {id: $workspaceId})-[:HAS_INSIGHTS]->(insights:WorkspaceInsights)
        RETURN insights
        ORDER BY insights.generatedAt DESC
        LIMIT 1
      `, { workspaceId });

      if (result?.insights) {
        const i = result.insights;
        return {
          summary: i.summary,
          keyMetrics: JSON.parse(i.keyMetrics || '{}'),
          healthScore: JSON.parse(i.healthScore || '{}'),
          trends: JSON.parse(i.trends || '{}'),
          recommendations: JSON.parse(i.recommendations || '[]'),
          criticalIssues: JSON.parse(i.criticalIssues || '[]')
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get stored insights:', error);
      return null;
    }
  }

  private async storeOptimization(workspaceId: string, optimization: OptimizationResult): Promise<void> {
    try {
      await runQuery(`
        MATCH (w:WORKSPACE {id: $workspaceId})
        MERGE (w)-[:HAS_OPTIMIZATION]->(opt:WorkspaceOptimization {generatedAt: datetime()})
        SET opt.id = $optId,
            opt.suggestions = $suggestions,
            opt.quickWins = $quickWins,
            opt.longTermImprovements = $longTermImprovements,
            opt.updatedAt = datetime()
      `, {
        workspaceId,
        optId: uuidv4(),
        suggestions: JSON.stringify(optimization.suggestions),
        quickWins: JSON.stringify(optimization.quickWins),
        longTermImprovements: JSON.stringify(optimization.longTermImprovements)
      });
    } catch (error) {
      console.error('Failed to store optimization:', error);
    }
  }

  private async storeStrategy(workspaceId: string, strategy: any, input: StrategyInput): Promise<void> {
    try {
      await runQuery(`
        MATCH (w:WORKSPACE {id: $workspaceId})
        MERGE (w)-[:HAS_STRATEGY]->(strat:WorkspaceStrategy {generatedAt: datetime()})
        SET strat.id = $stratId,
            strat.strategy = $strategy,
            strat.input = $input,
            strat.updatedAt = datetime()
      `, {
        workspaceId,
        stratId: uuidv4(),
        strategy: JSON.stringify(strategy),
        input: JSON.stringify(input)
      });
    } catch (error) {
      console.error('Failed to store strategy:', error);
    }
  }

  private async storeHealthCheck(workspaceId: string, healthCheck: any): Promise<void> {
    try {
      await runQuery(`
        MATCH (w:WORKSPACE {id: $workspaceId})
        MERGE (w)-[:HAS_HEALTH_CHECK]->(hc:WorkspaceHealthCheck {checkedAt: datetime()})
        SET hc.id = $hcId,
            hc.results = $results,
            hc.updatedAt = datetime()
      `, {
        workspaceId,
        hcId: uuidv4(),
        results: JSON.stringify(healthCheck)
      });
    } catch (error) {
      console.error('Failed to store health check:', error);
    }
  }
}