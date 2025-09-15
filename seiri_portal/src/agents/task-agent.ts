import "server-only";

import { BaseAgent, AgentCapabilities, AgentResponse, AgentOperationConfig } from './base-agent';
import { AgentContext, NodeType } from './context-engine';
import { LLMService, llmService } from './llm-service';
import { CacheService, cacheService } from './cache-service';
import { runQuery, runSingleQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';
import {
  TaskBreakdown,
  TaskEstimation,
  TaskOptimization,
  SubTask,
  TaskDependency,
  TaskRisk,
  TaskPrompts
} from './prompts/task-prompts';

export interface TaskData {
  task: any;
  acceptanceCriteria: any[];
  assignee?: any;
  initiative?: any;
  relatedTasks: any[];
  dependencies: any[];
  comments: any[];
  history: any[];
}

export interface ProgressUpdate {
  taskId: string;
  progress: number; // 0-100
  status: string;
  completedSubtasks: string[];
  currentPhase: string;
  blockers: string[];
  estimatedCompletion: Date;
  notes: string;
}

export class TaskAgent extends BaseAgent {
  readonly name = 'task-agent';
  readonly type = 'TASK' as const;
  readonly version = '1.0.0';
  readonly capabilities: AgentCapabilities = {
    canAnalyze: true,
    canGenerate: true,
    canOptimize: true,
    canSuggest: true,
    canAutomate: true // Limited automation for task breakdown
  };

  constructor(llmService: LLMService, cacheService: CacheService) {
    super(llmService, cacheService);
  }

  canHandleOperation(operation: string, context: AgentContext): boolean {
    if (context.nodeType !== 'TASK') return false;
    
    const supportedOperations = [
      'generateBreakdown',
      'estimateEffort',
      'optimizeTask',
      'analyzeDependencies',
      'trackProgress',
      'suggestImprovements',
      'autoGenerateSubtasks'
    ];
    
    return supportedOperations.includes(operation);
  }

  getAvailableOperations(context: AgentContext): string[] {
    if (context.nodeType !== 'TASK') return [];
    
    const baseOperations = ['generateBreakdown', 'estimateEffort', 'analyzeDependencies'];
    
    // Add operations based on permissions
    if (context.permissions.canWrite) {
      baseOperations.push('optimizeTask', 'suggestImprovements', 'trackProgress');
    }
    
    if (context.permissions.canWrite && context.workspace.userRole !== 'VIEWER') {
      baseOperations.push('autoGenerateSubtasks');
    }
    
    return baseOperations;
  }

  /**
   * Generate comprehensive task breakdown
   */
  async generateBreakdown(context: AgentContext, config?: AgentOperationConfig): Promise<AgentResponse<TaskBreakdown>> {
    return this.executeOperation(
      'generateBreakdown',
      context,
      {},
      async (ctx) => {
        this.validateContext(ctx, 'TASK');
        
        // Gather comprehensive task data
        const taskData = await this.gatherTaskData(ctx.currentNode.id);
        
        // Generate breakdown using LLM
        const prompt = TaskPrompts.buildBreakdownPrompt(ctx, taskData.task);
        const breakdown = await this.llm.generateStructured<TaskBreakdown>({
          prompt,
          temperature: 0.8,
          maxTokens: 3000
        });
        
        // Store breakdown in Neo4j
        await this.storeBreakdown(ctx.currentNode.id, breakdown);
        
        // Create subtask nodes if user has permissions
        if (ctx.permissions.canWrite) {
          await this.createSubtaskNodes(ctx.currentNode.id, breakdown.subtasks);
        }
        
        await this.logActivity('info', 'Generated task breakdown', ctx, {
          subtasksCount: breakdown.subtasks.length,
          dependenciesCount: breakdown.dependencies.length,
          complexityScore: breakdown.complexity.score
        });
        
        return breakdown;
      },
      config
    );
  }

  /**
   * Estimate task effort and timeline
   */
  async estimateEffort(context: AgentContext, config?: AgentOperationConfig): Promise<AgentResponse<TaskEstimation>> {
    return this.executeOperation(
      'estimateEffort',
      context,
      {},
      async (ctx) => {
        this.validateContext(ctx, 'TASK');
        
        const taskData = await this.gatherTaskData(ctx.currentNode.id);
        const existingBreakdown = await this.getStoredBreakdown(ctx.currentNode.id);
        
        // Generate estimation using LLM
        const prompt = TaskPrompts.buildEstimationPrompt(ctx, taskData.task, existingBreakdown || undefined);
        const estimation = await this.llm.generateStructured<TaskEstimation>({
          prompt,
          temperature: 0.6,
          maxTokens: 2000
        });
        
        // Store estimation
        await this.storeEstimation(ctx.currentNode.id, estimation);
        
        await this.logActivity('info', 'Generated task estimation', ctx, {
          baseEstimate: estimation.baseEstimate,
          confidenceLevel: estimation.confidenceLevel,
          methodology: estimation.methodology
        });
        
        return estimation;
      },
      config
    );
  }

  /**
   * Optimize task structure and approach
   */
  async optimizeTask(context: AgentContext, config?: AgentOperationConfig): Promise<AgentResponse<TaskOptimization>> {
    return this.executeOperation(
      'optimizeTask',
      context,
      {},
      async (ctx) => {
        this.validateContext(ctx, 'TASK');
        
        if (!ctx.permissions.canWrite) {
          throw new Error('Write permissions required for task optimization');
        }
        
        const taskData = await this.gatherTaskData(ctx.currentNode.id);
        
        // Generate optimization suggestions
        const prompt = TaskPrompts.buildOptimizationPrompt(ctx, taskData.task);
        const optimization = await this.llm.generateStructured<TaskOptimization>({
          prompt,
          temperature: 0.7,
          maxTokens: 2500
        });
        
        // Store optimization results
        await this.storeOptimization(ctx.currentNode.id, optimization);
        
        await this.logActivity('info', 'Generated task optimization', ctx, {
          suggestionsCount: optimization.suggestions.length,
          automationOpportunities: optimization.automationOpportunities.length
        });
        
        return optimization;
      },
      config
    );
  }

  /**
   * Analyze task dependencies
   */
  async analyzeDependencies(context: AgentContext, config?: AgentOperationConfig): Promise<AgentResponse<any>> {
    return this.executeOperation(
      'analyzeDependencies',
      context,
      {},
      async (ctx) => {
        this.validateContext(ctx, 'TASK');
        
        const taskData = await this.gatherTaskData(ctx.currentNode.id);
        
        // Generate dependency analysis
        const prompt = TaskPrompts.buildDependencyAnalysisPrompt(ctx, taskData.task);
        const analysis = await this.llm.generateStructured<any>({
          prompt,
          temperature: 0.5,
          maxTokens: 2000
        });
        
        // Store dependency analysis
        await this.storeDependencyAnalysis(ctx.currentNode.id, analysis);
        
        await this.logActivity('info', 'Analyzed task dependencies', ctx, {
          internalDeps: analysis.internalDependencies?.length || 0,
          externalDeps: analysis.externalDependencies?.length || 0
        });
        
        return analysis;
      },
      config
    );
  }

  /**
   * Track task progress
   */
  async trackProgress(
    context: AgentContext, 
    input: { progress?: number; notes?: string; blockers?: string[] }, 
    config?: AgentOperationConfig
  ): Promise<AgentResponse<any>> {
    return this.executeOperation(
      'trackProgress',
      context,
      input,
      async (ctx, progressInput) => {
        this.validateContext(ctx, 'TASK');
        
        const taskData = await this.gatherTaskData(ctx.currentNode.id);
        const breakdown = await this.getStoredBreakdown(ctx.currentNode.id);
        
        // Generate progress tracking plan
        const prompt = TaskPrompts.buildProgressTrackingPrompt(
          ctx, 
          taskData.task, 
          breakdown?.subtasks
        );
        
        const progressPlan = await this.llm.generateStructured({
          prompt,
          temperature: 0.4,
          maxTokens: 1500
        });
        
        // Update progress in Neo4j
        await this.updateProgress(ctx.currentNode.id, progressInput, progressPlan);
        
        await this.logActivity('info', 'Updated task progress tracking', ctx, {
          progress: progressInput.progress,
          blockersCount: progressInput.blockers?.length || 0
        });
        
        return progressPlan;
      },
      config
    );
  }

  /**
   * Auto-generate subtasks (automation capability)
   */
  async autoGenerateSubtasks(context: AgentContext, config?: AgentOperationConfig): Promise<AgentResponse<SubTask[]>> {
    return this.executeOperation(
      'autoGenerateSubtasks',
      context,
      {},
      async (ctx) => {
        this.validateContext(ctx, 'TASK');
        
        if (!ctx.permissions.canWrite) {
          throw new Error('Write permissions required for subtask generation');
        }
        
        // Generate breakdown first
        const breakdownResponse = await this.generateBreakdown(ctx, config);
        const breakdown = breakdownResponse.data;
        
        // Create the subtasks automatically
        const createdSubtasks = await this.createSubtaskNodes(ctx.currentNode.id, breakdown.subtasks);
        
        await this.logActivity('info', 'Auto-generated subtasks', ctx, {
          subtasksCreated: createdSubtasks.length,
          automated: true
        });
        
        return createdSubtasks;
      },
      config
    );
  }

  /**
   * Public method for external execution
   */
  async execute(operation: string, context: AgentContext, input?: any): Promise<AgentResponse<any>> {
    switch (operation) {
      case 'generateBreakdown':
        return this.generateBreakdown(context, input?.config);
      case 'estimateEffort':
        return this.estimateEffort(context, input?.config);
      case 'optimizeTask':
        return this.optimizeTask(context, input?.config);
      case 'analyzeDependencies':
        return this.analyzeDependencies(context, input?.config);
      case 'trackProgress':
        return this.trackProgress(context, input, input?.config);
      case 'autoGenerateSubtasks':
        return this.autoGenerateSubtasks(context, input?.config);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  // Private helper methods
  private async gatherTaskData(taskId: string): Promise<TaskData> {
    const queries = {
      task: `
        MATCH (t:TASK {id: $taskId})
        RETURN t
      `,
      acceptanceCriteria: `
        MATCH (t:TASK {id: $taskId})-[:HAS]->(ac:ACCEPTANCE_CRITERION)
        RETURN ac
        ORDER BY ac.createdAt
      `,
      assignee: `
        MATCH (t:TASK {id: $taskId})-[:ASSIGNED_TO]->(u:User)
        RETURN u
      `,
      initiative: `
        MATCH (i:INITIATIVE)-[:HAS]->(t:TASK {id: $taskId})
        RETURN i
      `,
      relatedTasks: `
        MATCH (i:INITIATIVE)-[:HAS]->(related:TASK)
        MATCH (i)-[:HAS]->(t:TASK {id: $taskId})
        WHERE related.id <> $taskId
        RETURN related
        ORDER BY related.priority DESC, related.createdAt DESC
        LIMIT 10
      `,
      dependencies: `
        MATCH (t:TASK {id: $taskId})-[dep:DEPENDS_ON]->(target:TASK)
        RETURN dep, target
      `,
      comments: `
        MATCH (t:TASK {id: $taskId})-[:HAS_COMMENT]->(c:Comment)
        RETURN c
        ORDER BY c.createdAt DESC
        LIMIT 20
      `,
      history: `
        MATCH (t:TASK {id: $taskId})-[:HAS_HISTORY]->(h:TaskHistory)
        RETURN h
        ORDER BY h.timestamp DESC
        LIMIT 50
      `
    };

    const [task, acceptanceCriteria, assignee, initiative, relatedTasks, dependencies, comments, history] = 
      await Promise.all([
        runSingleQuery(queries.task, { taskId }),
        runQuery(queries.acceptanceCriteria, { taskId }),
        runSingleQuery(queries.assignee, { taskId }),
        runSingleQuery(queries.initiative, { taskId }),
        runQuery(queries.relatedTasks, { taskId }),
        runQuery(queries.dependencies, { taskId }),
        runQuery(queries.comments, { taskId }),
        runQuery(queries.history, { taskId })
      ]);

    return {
      task: task?.t || {},
      acceptanceCriteria: acceptanceCriteria.map((r: any) => r.ac),
      assignee: assignee?.u,
      initiative: initiative?.i,
      relatedTasks: relatedTasks.map((r: any) => r.related),
      dependencies: dependencies.map((r: any) => ({
        relationship: r.dep,
        target: r.target
      })),
      comments: comments.map((r: any) => r.c),
      history: history.map((r: any) => r.h)
    };
  }

  private async storeBreakdown(taskId: string, breakdown: TaskBreakdown): Promise<void> {
    try {
      await runQuery(`
        MATCH (t:TASK {id: $taskId})
        MERGE (t)-[:HAS_BREAKDOWN]->(bd:TaskBreakdown {generatedAt: datetime()})
        SET bd.id = $breakdownId,
            bd.subtasks = $subtasks,
            bd.dependencies = $dependencies,
            bd.estimatedEffort = $estimatedEffort,
            bd.complexity = $complexity,
            bd.risks = $risks,
            bd.recommendations = $recommendations,
            bd.confidence = $confidence,
            bd.updatedAt = datetime()
      `, {
        taskId,
        breakdownId: breakdown.id,
        subtasks: JSON.stringify(breakdown.subtasks),
        dependencies: JSON.stringify(breakdown.dependencies),
        estimatedEffort: JSON.stringify(breakdown.estimatedEffort),
        complexity: JSON.stringify(breakdown.complexity),
        risks: JSON.stringify(breakdown.risks),
        recommendations: JSON.stringify(breakdown.recommendations),
        confidence: breakdown.confidence
      });
    } catch (error) {
      console.error('Failed to store task breakdown:', error);
    }
  }

  private async getStoredBreakdown(taskId: string): Promise<TaskBreakdown | null> {
    try {
      const result = await runSingleQuery(`
        MATCH (t:TASK {id: $taskId})-[:HAS_BREAKDOWN]->(bd:TaskBreakdown)
        RETURN bd
        ORDER BY bd.generatedAt DESC
        LIMIT 1
      `, { taskId });

      if (result?.bd) {
        const bd = result.bd;
        return {
          id: bd.id,
          originalTaskId: taskId,
          subtasks: JSON.parse(bd.subtasks || '[]'),
          dependencies: JSON.parse(bd.dependencies || '[]'),
          estimatedEffort: JSON.parse(bd.estimatedEffort || '{}'),
          complexity: JSON.parse(bd.complexity || '{}'),
          risks: JSON.parse(bd.risks || '[]'),
          recommendations: JSON.parse(bd.recommendations || '[]'),
          confidence: bd.confidence || 0
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get stored breakdown:', error);
      return null;
    }
  }

  private async createSubtaskNodes(parentTaskId: string, subtasks: SubTask[]): Promise<SubTask[]> {
    const createdSubtasks: SubTask[] = [];
    
    try {
      for (const subtask of subtasks) {
        await runQuery(`
          MATCH (parent:TASK {id: $parentTaskId})
          CREATE (subtask:TASK {
            id: $id,
            title: $title,
            description: $description,
            type: $type,
            priority: $priority,
            estimatedHours: $estimatedHours,
            skills: $skills,
            acceptanceCriteria: $acceptanceCriteria,
            status: 'TODO',
            isSubtask: true,
            createdBy: 'task-agent',
            createdAt: datetime(),
            updatedAt: datetime()
          })
          CREATE (parent)-[:HAS_SUBTASK]->(subtask)
        `, {
          parentTaskId,
          id: subtask.id,
          title: subtask.title,
          description: subtask.description,
          type: subtask.type,
          priority: subtask.priority,
          estimatedHours: subtask.estimatedHours,
          skills: JSON.stringify(subtask.skills),
          acceptanceCriteria: JSON.stringify(subtask.acceptanceCriteria)
        });
        
        createdSubtasks.push(subtask);
      }
    } catch (error) {
      console.error('Failed to create subtask nodes:', error);
    }
    
    return createdSubtasks;
  }

  private async storeEstimation(taskId: string, estimation: TaskEstimation): Promise<void> {
    try {
      await runQuery(`
        MATCH (t:TASK {id: $taskId})
        MERGE (t)-[:HAS_ESTIMATION]->(est:TaskEstimation {generatedAt: datetime()})
        SET est.id = $estId,
            est.baseEstimate = $baseEstimate,
            est.optimisticEstimate = $optimisticEstimate,
            est.pessimisticEstimate = $pessimisticEstimate,
            est.confidenceLevel = $confidenceLevel,
            est.methodology = $methodology,
            est.assumptions = $assumptions,
            est.risks = $risks,
            est.breakdown = $breakdown,
            est.updatedAt = datetime()
      `, {
        taskId,
        estId: uuidv4(),
        baseEstimate: estimation.baseEstimate,
        optimisticEstimate: estimation.optimisticEstimate,
        pessimisticEstimate: estimation.pessimisticEstimate,
        confidenceLevel: estimation.confidenceLevel,
        methodology: estimation.methodology,
        assumptions: JSON.stringify(estimation.assumptions),
        risks: JSON.stringify(estimation.risks),
        breakdown: JSON.stringify(estimation.breakdown)
      });
    } catch (error) {
      console.error('Failed to store estimation:', error);
    }
  }

  private async storeOptimization(taskId: string, optimization: TaskOptimization): Promise<void> {
    try {
      await runQuery(`
        MATCH (t:TASK {id: $taskId})
        MERGE (t)-[:HAS_OPTIMIZATION]->(opt:TaskOptimization {generatedAt: datetime()})
        SET opt.id = $optId,
            opt.suggestions = $suggestions,
            opt.automationOpportunities = $automationOpportunities,
            opt.qualityImprovements = $qualityImprovements,
            opt.processImprovements = $processImprovements,
            opt.updatedAt = datetime()
      `, {
        taskId,
        optId: uuidv4(),
        suggestions: JSON.stringify(optimization.suggestions),
        automationOpportunities: JSON.stringify(optimization.automationOpportunities),
        qualityImprovements: JSON.stringify(optimization.qualityImprovements),
        processImprovements: JSON.stringify(optimization.processImprovements)
      });
    } catch (error) {
      console.error('Failed to store optimization:', error);
    }
  }

  private async storeDependencyAnalysis(taskId: string, analysis: any): Promise<void> {
    try {
      await runQuery(`
        MATCH (t:TASK {id: $taskId})
        MERGE (t)-[:HAS_DEPENDENCY_ANALYSIS]->(da:TaskDependencyAnalysis {generatedAt: datetime()})
        SET da.id = $daId,
            da.analysis = $analysis,
            da.updatedAt = datetime()
      `, {
        taskId,
        daId: uuidv4(),
        analysis: JSON.stringify(analysis)
      });
    } catch (error) {
      console.error('Failed to store dependency analysis:', error);
    }
  }

  private async updateProgress(taskId: string, progressInput: any, progressPlan: any): Promise<void> {
    try {
      await runQuery(`
        MATCH (t:TASK {id: $taskId})
        MERGE (t)-[:HAS_PROGRESS_UPDATE]->(pu:TaskProgressUpdate {updatedAt: datetime()})
        SET pu.id = $puId,
            pu.progress = $progress,
            pu.notes = $notes,
            pu.blockers = $blockers,
            pu.progressPlan = $progressPlan,
            pu.timestamp = datetime()
      `, {
        taskId,
        puId: uuidv4(),
        progress: progressInput.progress || 0,
        notes: progressInput.notes || '',
        blockers: JSON.stringify(progressInput.blockers || []),
        progressPlan: JSON.stringify(progressPlan)
      });
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }
}