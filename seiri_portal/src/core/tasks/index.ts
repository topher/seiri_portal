// Task Module Exports
// Central exports for enhanced task management with initiative relationships

// Models and Types
export * from './task.model';

// Services
export * from './task.service';

// GraphQL Resolvers
export * from './task.resolver';

// Re-export key types for convenience
export type {
  Task,
  TaskService,
  CreateTaskInput,
  UpdateTaskInput,
  DefinitionOfDone,
  AgentRequirements,
  AcceptanceCriterion,
  Deliverable,
  ValidationResult,
  ValidationSummary,
  AgentExecutionResult
} from './task.model';

export {
  TaskStatus,
  AcceptanceCriterionStatus,
  DeliverableType,
  DeliverableStatus,
  ValidationType,
  ValidationStatus,
  AgentType,
  Priority,
  TASK_VALIDATION_RULES,
  DEFAULT_AGENT_REQUIREMENTS,
  taskUtils
} from './task.model';

export { taskService } from './task.service';
export { taskResolvers, taskResolverUtils } from './task.resolver';