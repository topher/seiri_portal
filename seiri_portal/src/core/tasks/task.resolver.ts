// Task GraphQL Resolver
// Enhanced task resolution with initiative relationships and agent coordination

import { taskService } from './task.service';
import { initiativeService } from '../initiatives/initiative.service';
import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  DeliverableStatus,
  ValidationSummary,
  AgentExecutionResult,
  taskUtils
} from './task.model';

// GraphQL Resolvers for Task
export const taskResolvers = {
  Query: {
    // Get a specific task by ID
    task: async (_: any, { id }: { id: string }): Promise<Task | null> => {
      return await taskService.getTask(id);
    },
    
    // Get all tasks for an initiative
    tasksByInitiative: async (_: any, { initiativeId }: { initiativeId: string }): Promise<Task[]> => {
      return await taskService.getTasksByInitiative(initiativeId);
    },
    
    // Get tasks assigned to a user
    tasksByAssignee: async (_: any, { assigneeId }: { assigneeId: string }): Promise<Task[]> => {
      return await taskService.getTasksByAssignee(assigneeId);
    },
    
    // Get task validation summary
    taskValidation: async (_: any, { taskId }: { taskId: string }): Promise<ValidationSummary> => {
      return await taskService.validateTask(taskId);
    }
  },
  
  Mutation: {
    // Create a new task
    createTask: async (_: any, { input }: { input: CreateTaskInput }): Promise<Task> => {
      return await taskService.createTask(input);
    },
    
    // Update an existing task
    updateTask: async (
      _: any,
      { id, input }: { id: string; input: UpdateTaskInput }
    ): Promise<Task> => {
      const existingTask = await taskService.getTask(id);
      if (!existingTask) {
        throw new Error(`Task ${id} not found`);
      }
      
      return await taskService.updateTask(id, input);
    },
    
    // Delete a task
    deleteTask: async (_: any, { id }: { id: string }): Promise<boolean> => {
      return await taskService.deleteTask(id);
    },
    
    // Update task progress
    updateTaskProgress: async (
      _: any,
      { id, progress }: { id: string; progress: number }
    ): Promise<Task> => {
      return await taskService.updateProgress(id, progress);
    },
    
    // Execute agent requirements for a task
    executeTask: async (_: any, { taskId }: { taskId: string }): Promise<AgentExecutionResult> => {
      return await taskService.executeAgentRequirements(taskId);
    },
    
    // Add a deliverable to a task
    addTaskDeliverable: async (
      _: any,
      { taskId, deliverable }: { taskId: string; deliverable: any }
    ) => {
      return await taskService.addDeliverable(taskId, deliverable);
    },
    
    // Add validation result to a task
    addTaskValidation: async (
      _: any,
      { taskId, validation }: { taskId: string; validation: any }
    ) => {
      return await taskService.addValidationResult(taskId, validation);
    }
  },
  
  // Field Resolvers for Task type
  Task: {
    // Resolve initiative relationship
    initiative: async (task: Task) => {
      return await initiativeService.getInitiative(task.initiativeId);
    },
    
    // Resolve assignee (user) relationship
    assignee: async (task: Task) => {
      if (!task.assigneeId) return null;
      
      // This would typically fetch from user service
      return {
        id: task.assigneeId,
        // Additional user fields would be resolved by user resolver
      };
    },
    
    // Resolve acceptance criteria with enhanced data
    acceptanceCriteria: (task: Task) => {
      return task.acceptanceCriteria.map(criterion => ({
        ...criterion,
        // Add computed fields
        isPending: criterion.status === 'PENDING',
        isSatisfied: criterion.status === 'SATISFIED',
        isFailed: criterion.status === 'FAILED'
      }));
    },
    
    // Resolve deliverables with status information
    deliverables: (task: Task) => {
      return task.deliverables.map(deliverable => ({
        ...deliverable,
        // Add computed fields
        isPending: deliverable.status === DeliverableStatus.PENDING,
        isCompleted: deliverable.status === DeliverableStatus.COMPLETED,
        isApproved: deliverable.status === DeliverableStatus.APPROVED,
        needsRevision: deliverable.status === DeliverableStatus.NEEDS_REVISION,
        duration: deliverable.completedAt && deliverable.createdAt ?
          deliverable.completedAt.getTime() - deliverable.createdAt.getTime() : null
      }));
    },
    
    // Resolve validation results with analysis
    validationResults: (task: Task) => {
      return task.validationResults.map(result => ({
        ...result,
        // Add computed fields
        isPassed: result.status === 'PASSED',
        isFailed: result.status === 'FAILED',
        hasWarning: result.status === 'WARNING',
        isPending: result.status === 'PENDING'
      }));
    },
    
    // Resolve definition of done with completion tracking
    definitionOfDone: (task: Task) => {
      const dod = task.definitionOfDone;
      const completedCriteria = dod.criteria.filter(c => c.isCompleted).length;
      const totalCriteria = dod.criteria.length;
      
      return {
        ...dod,
        // Add computed fields
        completionPercentage: totalCriteria > 0 ? (completedCriteria / totalCriteria) * 100 : 0,
        isComplete: completedCriteria === totalCriteria,
        mandatoryCriteria: dod.criteria.filter(c => c.isMandatory),
        optionalCriteria: dod.criteria.filter(c => !c.isMandatory)
      };
    },
    
    // Resolve agent requirements with execution status
    agentRequirements: (task: Task) => {
      return {
        ...task.agentRequirements,
        // Add computed fields
        totalAgents: [
          task.agentRequirements.primary,
          ...task.agentRequirements.supporting,
          ...task.agentRequirements.reviewers
        ].length,
        hasReviewers: task.agentRequirements.reviewers.length > 0,
        hasSupporting: task.agentRequirements.supporting.length > 0
      };
    },
    
    // Calculate task completion percentage
    completionPercentage: (task: Task): number => {
      return taskUtils.calculateCompletion(task) * 100;
    },
    
    // Get task blocking issues
    blockers: (task: Task): string[] => {
      return taskUtils.getBlockers(task);
    },
    
    // Check if task is ready for review
    isReadyForReview: (task: Task): boolean => {
      return taskUtils.isReadyForReview(task);
    },
    
    // Check if task is blocked
    isBlocked: (task: Task): boolean => {
      return taskUtils.getBlockers(task).length > 0;
    },
    
    // Check if task is overdue
    isOverdue: (task: Task): boolean => {
      if (!task.dueDate) return false;
      return new Date() > task.dueDate && task.status !== TaskStatus.DONE;
    },
    
    // Calculate time remaining until due date
    timeRemaining: (task: Task): number | null => {
      if (!task.dueDate) return null;
      const now = new Date();
      return task.dueDate.getTime() - now.getTime();
    },
    
    // Get estimated effort (mock calculation)
    estimatedEffort: (task: Task): number => {
      // Base effort calculation on complexity indicators
      let effort = 1; // Base effort in days
      
      effort += task.definitionOfDone.criteria.length * 0.5;
      effort += task.definitionOfDone.requiredDeliverables.length * 1;
      effort += task.agentRequirements.supporting.length * 0.5;
      
      if (task.priority === 'HIGH') effort *= 1.2;
      if (task.priority === 'URGENT') effort *= 1.5;
      
      return Math.round(effort * 10) / 10; // Round to 1 decimal place
    }
  },
  
  // Deliverable field resolvers
  Deliverable: {
    // Calculate deliverable completion time
    completionTime: (deliverable: any): number | null => {
      if (!deliverable.completedAt || !deliverable.createdAt) return null;
      return deliverable.completedAt.getTime() - deliverable.createdAt.getTime();
    },
    
    // Check if deliverable is late (mock implementation)
    isLate: (deliverable: any): boolean => {
      // Would calculate based on expected completion time
      return false;
    }
  },
  
  // Validation Result field resolvers
  ValidationResult: {
    // Get validation age
    age: (result: any): number => {
      return new Date().getTime() - result.validatedAt.getTime();
    },
    
    // Check if validation is recent
    isRecent: (result: any): boolean => {
      const oneDayInMs = 24 * 60 * 60 * 1000;
      return result.age < oneDayInMs;
    }
  }
};

// Type definitions for GraphQL schema (to be merged with main schema)
export const taskTypeDefs = `
  extend type Query {
    task(id: ID!): Task
    tasksByInitiative(initiativeId: ID!): [Task!]!
    tasksByAssignee(assigneeId: ID!): [Task!]!
    taskValidation(taskId: ID!): ValidationSummary!
  }
  
  extend type Mutation {
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Boolean!
    updateTaskProgress(id: ID!, progress: Float!): Task!
    executeTask(taskId: ID!): AgentExecutionResult!
    addTaskDeliverable(taskId: ID!, deliverable: DeliverableInput!): Deliverable!
    addTaskValidation(taskId: ID!, validation: ValidationInput!): ValidationResult!
  }
  
  input DeliverableInput {
    type: DeliverableType!
    name: String!
    description: String
    content: JSON
  }
  
  input ValidationInput {
    validationType: ValidationType!
    message: String!
    details: JSON
  }
  
  type ValidationSummary {
    isComplete: Boolean!
    criteriaCompleted: Int!
    criteriaTotal: Int!
    deliverablesCompleted: Int!
    deliverablesRequired: Int!
    validationsPassed: Int!
    validationsTotal: Int!
    blockers: [String!]!
  }
  
  type AgentExecutionResult {
    success: Boolean!
    executedAgents: [AgentType!]!
    deliverables: [Deliverable!]!
    errors: [String!]!
    operationId: String!
  }
`;

// Utility functions for resolvers
export const taskResolverUtils = {
  // Get task statistics for an initiative
  async getTaskStats(initiativeId: string): Promise<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    completion: number;
    blockers: number;
    overdue: number;
  }> {
    const tasks = await taskService.getTasksByInitiative(initiativeId);
    
    const byStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<TaskStatus, number>);
    
    const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
    const completion = tasks.length > 0 ? totalProgress / tasks.length : 0;
    
    const blockers = tasks.filter(task => taskUtils.getBlockers(task).length > 0).length;
    
    const overdue = tasks.filter(task => 
      task.dueDate && 
      new Date() > task.dueDate && 
      task.status !== TaskStatus.DONE
    ).length;
    
    return {
      total: tasks.length,
      byStatus,
      completion,
      blockers,
      overdue
    };
  },
  
  // Get tasks that need attention
  async getTasksNeedingAttention(initiativeId: string): Promise<Task[]> {
    const tasks = await taskService.getTasksByInitiative(initiativeId);
    
    return tasks.filter(task => {
      const blockers = taskUtils.getBlockers(task);
      const isOverdue = task.dueDate && new Date() > task.dueDate && task.status !== TaskStatus.DONE;
      const isStalled = task.status === TaskStatus.IN_PROGRESS && 
                       new Date().getTime() - task.updatedAt.getTime() > 7 * 24 * 60 * 60 * 1000; // 7 days
      
      return blockers.length > 0 || isOverdue || isStalled;
    });
  },
  
  // Get suggested tasks for an initiative
  async getSuggestedTasks(initiativeId: string): Promise<{
    suggested: Array<{
      title: string;
      description: string;
      priority: string;
      estimatedEffort: number;
      requiredDeliverables: string[];
    }>;
  }> {
    const initiative = await initiativeService.getInitiative(initiativeId);
    if (!initiative) {
      return { suggested: [] };
    }
    
    // Mock task suggestions based on initiative stage
    const currentStage = initiative.stages.find(s => s.status === 'IN_PROGRESS');
    const nextStage = initiative.stages.find(s => s.status === 'NOT_STARTED');
    
    const suggestions = [];
    
    if (currentStage) {
      suggestions.push({
        title: `Complete ${currentStage.name} deliverables`,
        description: `Finalize all required deliverables for ${currentStage.name} stage`,
        priority: 'HIGH',
        estimatedEffort: 3,
        requiredDeliverables: ['PRD_DOCUMENT', 'MARKET_ANALYSIS']
      });
    }
    
    if (nextStage) {
      suggestions.push({
        title: `Prepare for ${nextStage.name}`,
        description: `Set up prerequisites for ${nextStage.name} stage`,
        priority: 'MEDIUM',
        estimatedEffort: 2,
        requiredDeliverables: ['TECHNICAL_ARCHITECTURE']
      });
    }
    
    return { suggested: suggestions };
  }
};