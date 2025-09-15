// Task Model Extensions
// Enhanced task model with initiative relationships, agent requirements, and validation

export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED'
}

export enum AcceptanceCriterionStatus {
  PENDING = 'PENDING',
  SATISFIED = 'SATISFIED',
  FAILED = 'FAILED'
}

export enum DeliverableType {
  PERSONA_SET = 'PERSONA_SET',
  JOB_MAP = 'JOB_MAP',
  API_SPECIFICATION = 'API_SPECIFICATION',
  COMPONENT_INVENTORY = 'COMPONENT_INVENTORY',
  BUSINESS_MODEL = 'BUSINESS_MODEL',
  MARKET_ANALYSIS = 'MARKET_ANALYSIS',
  TECHNICAL_ARCHITECTURE = 'TECHNICAL_ARCHITECTURE',
  TEST_PLAN = 'TEST_PLAN',
  DEPLOYMENT_GUIDE = 'DEPLOYMENT_GUIDE',
  PRD_DOCUMENT = 'PRD_DOCUMENT'
}

export enum DeliverableStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_REVISION = 'NEEDS_REVISION'
}

export enum ValidationType {
  STRUCTURAL = 'STRUCTURAL',
  BUSINESS_RULE = 'BUSINESS_RULE',
  CROSS_REFERENCE = 'CROSS_REFERENCE',
  SEMANTIC = 'SEMANTIC',
  COMPLETENESS = 'COMPLETENESS'
}

export enum ValidationStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  WARNING = 'WARNING',
  PENDING = 'PENDING'
}

export enum AgentType {
  PERSONA_AGENT = 'PERSONA_AGENT',
  JTBD_AGENT = 'JTBD_AGENT',
  RESEARCH_AGENT = 'RESEARCH_AGENT',
  ANALYSIS_AGENT = 'ANALYSIS_AGENT',
  IDEATION_AGENT = 'IDEATION_AGENT',
  PRIORITIZATION_AGENT = 'PRIORITIZATION_AGENT',
  SEGMENTATION_AGENT = 'SEGMENTATION_AGENT',
  FINANCIAL_MODELING_AGENT = 'FINANCIAL_MODELING_AGENT',
  PRICING_AGENT = 'PRICING_AGENT',
  API_SPEC_AGENT = 'API_SPEC_AGENT',
  COMPONENT_AGENT = 'COMPONENT_AGENT',
  ARCHITECTURE_AGENT = 'ARCHITECTURE_AGENT',
  TASK_PLANNING_AGENT = 'TASK_PLANNING_AGENT',
  ESTIMATION_AGENT = 'ESTIMATION_AGENT',
  OPTIMIZATION_AGENT = 'OPTIMIZATION_AGENT',
  DEPENDENCY_AGENT = 'DEPENDENCY_AGENT',
  INITIATIVE_COORDINATOR = 'INITIATIVE_COORDINATOR',
  STRATEGY_AGENT = 'STRATEGY_AGENT',
  PROGRESS_TRACKER = 'PROGRESS_TRACKER',
  TASK_GENERATOR = 'TASK_GENERATOR'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// Core Task Model
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  progress: number; // 0.0 to 1.0
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  
  // Initiative relationship (required)
  initiativeId: string;
  
  // User assignment
  assigneeId?: string;
  
  // Definition of Done for validation
  definitionOfDone: DefinitionOfDone;
  
  // Agent collaboration requirements
  agentRequirements: AgentRequirements;
  
  // Acceptance criteria
  acceptanceCriteria: AcceptanceCriterion[];
  
  // Deliverables produced by agents
  deliverables: Deliverable[];
  
  // Validation results
  validationResults: ValidationResult[];
}

// Definition of Done Framework
export interface DefinitionOfDone {
  criteria: Criterion[];
  validationQueries: ValidationQuery[];
  requiredDeliverables: DeliverableType[];
}

export interface Criterion {
  id: string;
  description: string;
  isMandatory: boolean;
  isCompleted: boolean;
}

export interface ValidationQuery {
  id: string;
  query: string;              // GraphQL query to validate completion
  expectedResult: any;        // Expected result shape
  actualResult?: any;         // Actual result when executed
}

// Agent Requirements and Collaboration
export interface AgentRequirements {
  primary: AgentType;         // Primary agent responsible for execution
  supporting: AgentType[];    // Supporting agents for collaboration
  reviewers: AgentType[];     // Agents that review/validate output
}

// Acceptance Criteria
export interface AcceptanceCriterion {
  id: string;
  title: string;
  description?: string;
  status: AcceptanceCriterionStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Deliverables produced by agent execution
export interface Deliverable {
  id: string;
  type: DeliverableType;
  name: string;
  description?: string;
  status: DeliverableStatus;
  content?: any;              // Structured deliverable content
  createdAt: Date;
  completedAt?: Date;
}

// Validation Results
export interface ValidationResult {
  id: string;
  validationType: ValidationType;
  status: ValidationStatus;
  message: string;
  details?: any;
  validatedAt: Date;
}

// Input Types for Creation/Updates
export interface CreateTaskInput {
  title: string;
  description?: string;
  initiativeId: string;
  priority?: Priority;
  definitionOfDone: DefinitionOfDoneInput;
  agentRequirements: AgentRequirementsInput;
  acceptanceCriteria?: AcceptanceCriterionInput[];
  dueDate?: Date;
  assigneeId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  progress?: number;
  dueDate?: Date;
  assigneeId?: string;
}

export interface DefinitionOfDoneInput {
  criteria: CriterionInput[];
  requiredDeliverables: DeliverableType[];
}

export interface CriterionInput {
  description: string;
  isMandatory?: boolean;
}

export interface AgentRequirementsInput {
  primary: AgentType;
  supporting?: AgentType[];
  reviewers?: AgentType[];
}

export interface AcceptanceCriterionInput {
  title: string;
  description?: string;
}

// Service Interface
export interface TaskService {
  createTask(input: CreateTaskInput): Promise<Task>;
  getTask(id: string): Promise<Task | null>;
  getTasksByInitiative(initiativeId: string): Promise<Task[]>;
  getTasksByAssignee(assigneeId: string): Promise<Task[]>;
  updateTask(id: string, updates: UpdateTaskInput): Promise<Task>;
  deleteTask(id: string): Promise<boolean>;
  updateProgress(id: string, progress: number): Promise<Task>;
  addDeliverable(taskId: string, deliverable: Omit<Deliverable, 'id' | 'createdAt'>): Promise<Deliverable>;
  updateDeliverableStatus(deliverableId: string, status: DeliverableStatus): Promise<Deliverable>;
  addValidationResult(taskId: string, result: Omit<ValidationResult, 'id' | 'validatedAt'>): Promise<ValidationResult>;
  validateTask(taskId: string): Promise<ValidationSummary>;
  executeAgentRequirements(taskId: string): Promise<AgentExecutionResult>;
}

export interface ValidationSummary {
  isComplete: boolean;
  criteriaCompleted: number;
  criteriaTotal: number;
  deliverablesCompleted: number;
  deliverablesRequired: number;
  validationsPassed: number;
  validationsTotal: number;
  blockers: string[];
}

export interface AgentExecutionResult {
  success: boolean;
  executedAgents: AgentType[];
  deliverables: Deliverable[];
  errors: string[];
  operationId: string;
}

// Task Validation Rules
export const TASK_VALIDATION_RULES = {
  // Ensure task has initiative context
  validateInitiativeContext: (task: CreateTaskInput): ValidationResult => {
    const errors: string[] = [];
    
    if (!task.initiativeId) {
      errors.push('Task must be associated with an initiative');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    } as any;
  },
  
  // Validate Definition of Done completeness
  validateDefinitionOfDone: (dod: DefinitionOfDone): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (dod.criteria.length === 0) {
      errors.push('Definition of Done must have at least one criterion');
    }
    
    const mandatoryCriteria = dod.criteria.filter(c => c.isMandatory);
    if (mandatoryCriteria.length === 0) {
      warnings.push('Consider having at least one mandatory criterion');
    }
    
    if (dod.requiredDeliverables.length === 0) {
      warnings.push('Consider specifying required deliverables');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    } as any;
  },
  
  // Validate agent requirements
  validateAgentRequirements: (requirements: AgentRequirements): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!requirements.primary) {
      errors.push('Primary agent is required');
    }
    
    // Check for redundancy
    const allAgents = [requirements.primary, ...requirements.supporting, ...requirements.reviewers];
    const duplicates = allAgents.filter((agent, index) => allAgents.indexOf(agent) !== index);
    
    if (duplicates.length > 0) {
      warnings.push(`Duplicate agents found: ${duplicates.join(', ')}`);
    }
    
    // Validate reviewer agents are different from primary/supporting
    const workingAgents = new Set([requirements.primary, ...requirements.supporting]);
    const reviewingWorkingAgents = requirements.reviewers.filter(agent => workingAgents.has(agent));
    
    if (reviewingWorkingAgents.length > 0) {
      warnings.push(`Agents ${reviewingWorkingAgents.join(', ')} are both working and reviewing - ensure proper separation`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    } as any;
  }
};

// Default Agent Requirements by Deliverable Type
export const DEFAULT_AGENT_REQUIREMENTS: Record<DeliverableType, AgentRequirements> = {
  [DeliverableType.PERSONA_SET]: {
    primary: AgentType.PERSONA_AGENT,
    supporting: [AgentType.RESEARCH_AGENT],
    reviewers: [AgentType.ANALYSIS_AGENT]
  },
  [DeliverableType.JOB_MAP]: {
    primary: AgentType.JTBD_AGENT,
    supporting: [AgentType.RESEARCH_AGENT],
    reviewers: [AgentType.PERSONA_AGENT]
  },
  [DeliverableType.API_SPECIFICATION]: {
    primary: AgentType.API_SPEC_AGENT,
    supporting: [AgentType.ARCHITECTURE_AGENT],
    reviewers: [AgentType.COMPONENT_AGENT]
  },
  [DeliverableType.COMPONENT_INVENTORY]: {
    primary: AgentType.COMPONENT_AGENT,
    supporting: [AgentType.ARCHITECTURE_AGENT],
    reviewers: [AgentType.API_SPEC_AGENT]
  },
  [DeliverableType.BUSINESS_MODEL]: {
    primary: AgentType.STRATEGY_AGENT,
    supporting: [AgentType.FINANCIAL_MODELING_AGENT, AgentType.RESEARCH_AGENT],
    reviewers: [AgentType.ANALYSIS_AGENT]
  },
  [DeliverableType.MARKET_ANALYSIS]: {
    primary: AgentType.RESEARCH_AGENT,
    supporting: [AgentType.ANALYSIS_AGENT],
    reviewers: [AgentType.STRATEGY_AGENT]
  },
  [DeliverableType.TECHNICAL_ARCHITECTURE]: {
    primary: AgentType.ARCHITECTURE_AGENT,
    supporting: [AgentType.COMPONENT_AGENT],
    reviewers: [AgentType.API_SPEC_AGENT]
  },
  [DeliverableType.TEST_PLAN]: {
    primary: AgentType.TASK_PLANNING_AGENT,
    supporting: [AgentType.COMPONENT_AGENT],
    reviewers: [AgentType.ARCHITECTURE_AGENT]
  },
  [DeliverableType.DEPLOYMENT_GUIDE]: {
    primary: AgentType.OPTIMIZATION_AGENT,
    supporting: [AgentType.ARCHITECTURE_AGENT],
    reviewers: [AgentType.COMPONENT_AGENT]
  },
  [DeliverableType.PRD_DOCUMENT]: {
    primary: AgentType.PERSONA_AGENT,
    supporting: [AgentType.JTBD_AGENT, AgentType.RESEARCH_AGENT],
    reviewers: [AgentType.STRATEGY_AGENT]
  }
};

// Task Utility Functions
export const taskUtils = {
  // Calculate task completion percentage
  calculateCompletion: (task: Task): number => {
    if (task.status === TaskStatus.DONE) return 1.0;
    if (task.status === TaskStatus.CANCELLED) return 0.0;
    
    // Calculate based on criteria completion
    const completedCriteria = task.definitionOfDone.criteria.filter(c => c.isCompleted).length;
    const totalCriteria = task.definitionOfDone.criteria.length;
    
    if (totalCriteria === 0) return task.progress;
    
    return completedCriteria / totalCriteria;
  },
  
  // Get task blocking issues
  getBlockers: (task: Task): string[] => {
    const blockers: string[] = [];
    
    // Check for failed validation results
    const failedValidations = task.validationResults.filter(v => v.status === ValidationStatus.FAILED);
    blockers.push(...failedValidations.map(v => v.message));
    
    // Check for missing required deliverables
    const completedDeliverableTypes = new Set(
      task.deliverables
        .filter(d => d.status === DeliverableStatus.COMPLETED || d.status === DeliverableStatus.APPROVED)
        .map(d => d.type)
    );
    
    const missingDeliverables = task.definitionOfDone.requiredDeliverables
      .filter(type => !completedDeliverableTypes.has(type));
      
    if (missingDeliverables.length > 0) {
      blockers.push(`Missing deliverables: ${missingDeliverables.join(', ')}`);
    }
    
    // Check for failed acceptance criteria
    const failedCriteria = task.acceptanceCriteria.filter(c => c.status === AcceptanceCriterionStatus.FAILED);
    blockers.push(...failedCriteria.map(c => `Failed criterion: ${c.title}`));
    
    return blockers;
  },
  
  // Determine if task is ready for review
  isReadyForReview: (task: Task): boolean => {
    if (task.status !== TaskStatus.IN_PROGRESS) return false;
    
    // All mandatory criteria must be completed
    const mandatoryCriteria = task.definitionOfDone.criteria.filter(c => c.isMandatory);
    const completedMandatory = mandatoryCriteria.filter(c => c.isCompleted);
    
    if (completedMandatory.length !== mandatoryCriteria.length) return false;
    
    // All required deliverables must be completed
    const completedDeliverableTypes = new Set(
      task.deliverables
        .filter(d => d.status === DeliverableStatus.COMPLETED)
        .map(d => d.type)
    );
    
    const hasAllRequiredDeliverables = task.definitionOfDone.requiredDeliverables
      .every(type => completedDeliverableTypes.has(type));
    
    return hasAllRequiredDeliverables;
  },
  
  // Get suggested agent requirements for deliverable types
  suggestAgentRequirements: (deliverableTypes: DeliverableType[]): AgentRequirements => {
    if (deliverableTypes.length === 0) {
      return {
        primary: AgentType.TASK_PLANNING_AGENT,
        supporting: [],
        reviewers: [AgentType.ANALYSIS_AGENT]
      };
    }
    
    // Use the first deliverable type as primary basis
    const primaryRequirements = DEFAULT_AGENT_REQUIREMENTS[deliverableTypes[0]];
    
    // Collect all suggested agents from all deliverable types
    const allSuggested = deliverableTypes.map(type => DEFAULT_AGENT_REQUIREMENTS[type]);
    
    const allSupporting = new Set<AgentType>();
    const allReviewers = new Set<AgentType>();
    
    allSuggested.forEach(req => {
      req.supporting.forEach(agent => allSupporting.add(agent));
      req.reviewers.forEach(agent => allReviewers.add(agent));
    });
    
    return {
      primary: primaryRequirements.primary,
      supporting: Array.from(allSupporting),
      reviewers: Array.from(allReviewers)
    };
  }
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}