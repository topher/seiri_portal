// Task Service Implementation
// Enhanced task management with initiative relationships and agent coordination

import { runQuery } from "@/lib/neo4j";;
import {
  Task,
  TaskService,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  Priority,
  DefinitionOfDone,
  AgentRequirements,
  Deliverable,
  ValidationResult,
  ValidationSummary,
  AgentExecutionResult,
  DeliverableStatus,
  ValidationType,
  ValidationStatus,
  AcceptanceCriterion,
  AcceptanceCriterionStatus,
  TASK_VALIDATION_RULES,
  taskUtils
} from './task.model';

export class TaskServiceImpl implements TaskService {
  
  async createTask(input: CreateTaskInput): Promise<Task> {
    // Validate task input
    const contextValidation = TASK_VALIDATION_RULES.validateInitiativeContext(input);
    if (!contextValidation.isValid) {
      throw new Error(`Task validation failed: ${contextValidation.errors.join(', ')}`);
    }
    
    const dodValidation = TASK_VALIDATION_RULES.validateDefinitionOfDone(input.definitionOfDone as any);
    if (!dodValidation.isValid) {
      throw new Error(`Definition of Done validation failed: ${dodValidation.errors.join(', ')}`);
    }
    
    const agentValidation = TASK_VALIDATION_RULES.validateAgentRequirements(input.agentRequirements as any);
    if (!agentValidation.isValid) {
      throw new Error(`Agent requirements validation failed: ${agentValidation.errors.join(', ')}`);
    }
    
    const id = this.generateId();
    const now = new Date();
    
    // Create Definition of Done with generated IDs
    const definitionOfDone: DefinitionOfDone = {
      criteria: input.definitionOfDone.criteria.map(c => ({
        id: this.generateId(),
        description: c.description,
        isMandatory: c.isMandatory ?? true,
        isCompleted: false
      })),
      validationQueries: [], // Will be populated by agents
      requiredDeliverables: input.definitionOfDone.requiredDeliverables
    };
    
    // Create acceptance criteria with generated IDs
    const acceptanceCriteria: AcceptanceCriterion[] = (input.acceptanceCriteria || []).map(ac => ({
      id: this.generateId(),
      title: ac.title,
      description: ac.description,
      status: AcceptanceCriterionStatus.PENDING,
      createdAt: now,
      updatedAt: now
    }));
    
    const task: Task = {
      id,
      title: input.title,
      description: input.description,
      status: TaskStatus.TODO,
      priority: input.priority || Priority.MEDIUM,
      progress: 0,
      createdAt: now,
      updatedAt: now,
      dueDate: input.dueDate,
      initiativeId: input.initiativeId,
      assigneeId: input.assigneeId,
      definitionOfDone,
      agentRequirements: {
        primary: input.agentRequirements.primary,
        supporting: input.agentRequirements.supporting || [],
        reviewers: input.agentRequirements.reviewers || []
      },
      acceptanceCriteria,
      deliverables: [],
      validationResults: []
    };
    
    // Create task in Neo4j
    await this.createTaskInDatabase(task);
    
    return task;
  }
  
  async getTask(id: string): Promise<Task | null> {
    const result = await runQuery(`
      MATCH (t:Task {id: $id})
      RETURN t
    `, { id });
    
    if (result.length === 0) return null;
    
    return this.mapNeo4jToTask(result[0].t);
  }
  
  async getTasksByInitiative(initiativeId: string): Promise<Task[]> {
    const result = await runQuery(`
      MATCH (i:Initiative {id: $initiativeId})-[:HAS_TASK]->(t:Task)
      RETURN t
      ORDER BY t.priority DESC, t.createdAt ASC
    `, { initiativeId });
    
    return result.map(record => this.mapNeo4jToTask(record.t));
  }
  
  async getTasksByAssignee(assigneeId: string): Promise<Task[]> {
    const result = await runQuery(`
      MATCH (t:Task {assigneeId: $assigneeId})
      RETURN t
      ORDER BY t.priority DESC, t.dueDate ASC, t.createdAt ASC
    `, { assigneeId });
    
    return result.map(record => this.mapNeo4jToTask(record.t));
  }
  
  async updateTask(id: string, updates: UpdateTaskInput): Promise<Task> {
    const updateFields: string[] = [];
    const params: any = { id };
    
    if (updates.title) {
      updateFields.push('t.title = $title');
      params.title = updates.title;
    }
    
    if (updates.description) {
      updateFields.push('t.description = $description');
      params.description = updates.description;
    }
    
    if (updates.status) {
      updateFields.push('t.status = $status');
      params.status = updates.status;
    }
    
    if (updates.priority) {
      updateFields.push('t.priority = $priority');
      params.priority = updates.priority;
    }
    
    if (updates.progress !== undefined) {
      updateFields.push('t.progress = $progress');
      params.progress = Math.max(0, Math.min(1, updates.progress));
    }
    
    if (updates.dueDate) {
      updateFields.push('t.dueDate = datetime($dueDate)');
      params.dueDate = updates.dueDate.toISOString();
    }
    
    if (updates.assigneeId) {
      updateFields.push('t.assigneeId = $assigneeId');
      params.assigneeId = updates.assigneeId;
    }
    
    updateFields.push('t.updatedAt = datetime($updatedAt)');
    params.updatedAt = new Date().toISOString();
    
    await runQuery(`
      MATCH (t:Task {id: $id})
      SET ${updateFields.join(', ')}
    `, params);
    
    const updated = await this.getTask(id);
    if (!updated) {
      throw new Error(`Task ${id} not found after update`);
    }
    
    return updated;
  }
  
  async deleteTask(id: string): Promise<boolean> {
    const result = await runQuery(`
      MATCH (t:Task {id: $id})
      DETACH DELETE t
      RETURN count(t) as deletedCount
    `, { id });
    
    return result[0]?.deletedCount > 0;
  }
  
  async updateProgress(id: string, progress: number): Promise<Task> {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    
    await runQuery(`
      MATCH (t:Task {id: $id})
      SET t.progress = $progress, t.updatedAt = datetime($updatedAt)
    `, {
      id,
      progress: clampedProgress,
      updatedAt: new Date().toISOString()
    });
    
    const updated = await this.getTask(id);
    if (!updated) {
      throw new Error(`Task ${id} not found after progress update`);
    }
    
    return updated;
  }
  
  async addDeliverable(taskId: string, deliverable: Omit<Deliverable, 'id' | 'createdAt'>): Promise<Deliverable> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const newDeliverable: Deliverable = {
      ...deliverable,
      id: this.generateId(),
      createdAt: new Date()
    };
    
    // Update task with new deliverable
    const updatedDeliverables = [...task.deliverables, newDeliverable];
    
    await runQuery(`
      MATCH (t:Task {id: $taskId})
      SET t.deliverables = $deliverables, t.updatedAt = datetime($updatedAt)
    `, {
      taskId,
      deliverables: JSON.stringify(updatedDeliverables),
      updatedAt: new Date().toISOString()
    });
    
    return newDeliverable;
  }
  
  async updateDeliverableStatus(deliverableId: string, status: DeliverableStatus): Promise<Deliverable> {
    // This is a simplified implementation - in a real system, you'd want separate deliverable nodes
    throw new Error('updateDeliverableStatus not implemented - deliverables are embedded in tasks');
  }
  
  async addValidationResult(taskId: string, result: Omit<ValidationResult, 'id' | 'validatedAt'>): Promise<ValidationResult> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const newValidationResult: ValidationResult = {
      ...result,
      id: this.generateId(),
      validatedAt: new Date()
    };
    
    // Update task with new validation result
    const updatedResults = [...task.validationResults, newValidationResult];
    
    await runQuery(`
      MATCH (t:Task {id: $taskId})
      SET t.validationResults = $validationResults, t.updatedAt = datetime($updatedAt)
    `, {
      taskId,
      validationResults: JSON.stringify(updatedResults),
      updatedAt: new Date().toISOString()
    });
    
    return newValidationResult;
  }
  
  async validateTask(taskId: string): Promise<ValidationSummary> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const completedCriteria = task.definitionOfDone.criteria.filter(c => c.isCompleted).length;
    const totalCriteria = task.definitionOfDone.criteria.length;
    
    const completedDeliverableTypes = new Set(
      task.deliverables
        .filter(d => d.status === DeliverableStatus.COMPLETED || d.status === DeliverableStatus.APPROVED)
        .map(d => d.type)
    );
    
    const deliverablesCompleted = task.definitionOfDone.requiredDeliverables
      .filter(type => completedDeliverableTypes.has(type)).length;
    const deliverablesRequired = task.definitionOfDone.requiredDeliverables.length;
    
    const passedValidations = task.validationResults.filter(v => v.status === ValidationStatus.PASSED).length;
    const totalValidations = task.validationResults.length;
    
    const blockers = taskUtils.getBlockers(task);
    
    const isComplete = (
      completedCriteria === totalCriteria &&
      deliverablesCompleted === deliverablesRequired &&
      blockers.length === 0
    );
    
    return {
      isComplete,
      criteriaCompleted: completedCriteria,
      criteriaTotal: totalCriteria,
      deliverablesCompleted,
      deliverablesRequired,
      validationsPassed: passedValidations,
      validationsTotal: totalValidations,
      blockers
    };
  }
  
  async executeAgentRequirements(taskId: string): Promise<AgentExecutionResult> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // This is where agent execution would happen
    // For now, return a mock result
    const operationId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mark task as in progress
    await this.updateTask(taskId, { status: TaskStatus.IN_PROGRESS });
    
    return {
      success: true,
      executedAgents: [
        task.agentRequirements.primary,
        ...task.agentRequirements.supporting
      ],
      deliverables: [], // Would be populated by actual agent execution
      errors: [],
      operationId
    };
  }
  
  // Private helper methods
  
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async createTaskInDatabase(task: Task): Promise<void> {
    await runQuery(`
      CREATE (t:Task {
        id: $id,
        title: $title,
        description: $description,
        status: $status,
        priority: $priority,
        progress: $progress,
        initiativeId: $initiativeId,
        assigneeId: $assigneeId,
        definitionOfDone: $definitionOfDone,
        agentRequirements: $agentRequirements,
        acceptanceCriteria: $acceptanceCriteria,
        deliverables: $deliverables,
        validationResults: $validationResults,
        createdAt: datetime($createdAt),
        updatedAt: datetime($updatedAt)
      })
    `, {
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      progress: task.progress,
      initiativeId: task.initiativeId,
      assigneeId: task.assigneeId || '',
      definitionOfDone: JSON.stringify(task.definitionOfDone),
      agentRequirements: JSON.stringify(task.agentRequirements),
      acceptanceCriteria: JSON.stringify(task.acceptanceCriteria),
      deliverables: JSON.stringify(task.deliverables),
      validationResults: JSON.stringify(task.validationResults),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    });
    
    // Add due date if specified
    if (task.dueDate) {
      await runQuery(`
        MATCH (t:Task {id: $id})
        SET t.dueDate = datetime($dueDate)
      `, {
        id: task.id,
        dueDate: task.dueDate.toISOString()
      });
    }
    
    // Create relationship to initiative
    await runQuery(`
      MATCH (i:Initiative {id: $initiativeId})
      MATCH (t:Task {id: $taskId})
      CREATE (i)-[:HAS_TASK]->(t)
    `, {
      initiativeId: task.initiativeId,
      taskId: task.id
    });
  }
  
  private mapNeo4jToTask(node: any): Task {
    return {
      id: node.id,
      title: node.title,
      description: node.description,
      status: node.status,
      priority: node.priority,
      progress: node.progress || 0,
      createdAt: new Date(node.createdAt),
      updatedAt: new Date(node.updatedAt),
      dueDate: node.dueDate ? new Date(node.dueDate) : undefined,
      initiativeId: node.initiativeId,
      assigneeId: node.assigneeId || undefined,
      definitionOfDone: node.definitionOfDone ? JSON.parse(node.definitionOfDone) : {
        criteria: [],
        validationQueries: [],
        requiredDeliverables: []
      },
      agentRequirements: node.agentRequirements ? JSON.parse(node.agentRequirements) : {
        primary: 'TASK_PLANNING_AGENT',
        supporting: [],
        reviewers: []
      },
      acceptanceCriteria: node.acceptanceCriteria ? JSON.parse(node.acceptanceCriteria) : [],
      deliverables: node.deliverables ? JSON.parse(node.deliverables) : [],
      validationResults: node.validationResults ? JSON.parse(node.validationResults) : []
    };
  }
}

// Export singleton instance
export const taskService = new TaskServiceImpl();