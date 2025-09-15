// Initiative Model Implementation
// Cross-suite coordination through RACI matrix and value tracking

import { SuiteType, RACIRole } from '../suites/suite.model';

export enum InitiativeStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS', 
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH', 
  URGENT = 'URGENT'
}

export enum VisibilityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum MetricCategory {
  REVENUE = 'REVENUE',
  EFFICIENCY = 'EFFICIENCY',
  QUALITY = 'QUALITY',
  CUSTOMER_SATISFACTION = 'CUSTOMER_SATISFACTION',
  MARKET_SHARE = 'MARKET_SHARE',
  COST_REDUCTION = 'COST_REDUCTION',
  TIME_TO_MARKET = 'TIME_TO_MARKET',
  USER_ENGAGEMENT = 'USER_ENGAGEMENT'
}

export enum StageStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED'
}

// Core Initiative Model
export interface Initiative {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  status: InitiativeStatus;
  priority: Priority;
  progress: number; // 0.0 to 1.0
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // RACI Matrix for cross-suite coordination
  raci: RACI;
  
  // Value tracking for client visibility
  value: InitiativeValue;
  
  // Workflow stages
  stages: WorkflowStage[];
}

// RACI Matrix Implementation
export interface RACI {
  responsible: string[]; // Suite IDs who do the work
  accountable: string;   // Suite ID who ensures success (exactly one)
  consulted: string[];   // Suite IDs who provide input
  informed: string[];    // Suite IDs who need updates
}

// Initiative Value Tracking
export interface InitiativeValue {
  estimatedImpact: string;     // "$2M revenue opportunity"
  actualImpact?: string;       // "$1.8M captured" (when completed)
  metrics: ValueMetric[];      // Specific KPIs
  clientVisibility: VisibilityLevel; // Always HIGH for initiatives
}

export interface ValueMetric {
  id: string;
  name: string;               // "Monthly Recurring Revenue"
  target: string;             // "$100K increase"
  current?: string;           // "$75K achieved"
  unit: string;               // "USD"
  category: MetricCategory;   // REVENUE, EFFICIENCY, etc.
}

// Workflow Stages
export interface WorkflowStage {
  id: string;
  name: string;
  description?: string;
  order: number;
  status: StageStatus;
  startedAt?: Date;
  completedAt?: Date;
  requiredSuites: SuiteType[]; // Which suites need to participate
}

// Initiative Role Assignment (for tracking RACI participation)
export interface InitiativeRole {
  id: string;
  initiativeId: string;
  suiteId: string;
  role: RACIRole;
  assignedAt: Date;
}

// Input Types for Creation/Updates
export interface CreateInitiativeInput {
  name: string;
  description?: string;
  workspaceId: string;
  raci: RACIInput;
  value: InitiativeValueInput;
  priority?: Priority;
}

export interface UpdateInitiativeInput {
  name?: string;
  description?: string;
  status?: InitiativeStatus;
  priority?: Priority;
  progress?: number;
}

export interface RACIInput {
  responsible: string[];    // Suite IDs
  accountable: string;      // Suite ID (exactly one)
  consulted: string[];      // Suite IDs
  informed: string[];       // Suite IDs
}

export interface InitiativeValueInput {
  estimatedImpact: string;
  metrics: ValueMetricInput[];
  clientVisibility?: VisibilityLevel;
}

export interface ValueMetricInput {
  name: string;
  target: string;
  unit: string;
  category: MetricCategory;
}

// Service Interface
export interface InitiativeService {
  createInitiative(input: CreateInitiativeInput): Promise<Initiative>;
  getInitiative(id: string): Promise<Initiative | null>;
  getInitiativesByWorkspace(workspaceId: string): Promise<Initiative[]>;
  updateInitiative(id: string, updates: UpdateInitiativeInput): Promise<Initiative>;
  deleteInitiative(id: string): Promise<boolean>;
  updateRACI(initiativeId: string, raci: RACIInput): Promise<Initiative>;
  updateValue(initiativeId: string, value: InitiativeValueInput): Promise<InitiativeValue>;
  updateProgress(initiativeId: string, progress: number): Promise<Initiative>;
  getInitiativesBySuite(suiteId: string, role?: RACIRole): Promise<Initiative[]>;
  validateRACI(raci: RACIInput, workspaceId: string): Promise<ValidationResult>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// RACI Validation Rules
export const RACI_VALIDATION_RULES = {
  // Ensure exactly one accountable suite
  validateSingleAccountable: (raci: RACIInput): ValidationResult => {
    const errors: string[] = [];
    
    if (!raci.accountable) {
      errors.push('RACI matrix must have exactly one accountable suite');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  },
  
  // Ensure at least one responsible suite
  validateResponsibleExists: (raci: RACIInput): ValidationResult => {
    const errors: string[] = [];
    
    if (!raci.responsible || raci.responsible.length === 0) {
      errors.push('RACI matrix must have at least one responsible suite');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  },
  
  // Ensure no suite has conflicting roles
  validateNoConflicts: (raci: RACIInput): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if accountable suite is also responsible (this is OK but worth noting)
    if (raci.responsible.includes(raci.accountable)) {
      warnings.push('Accountable suite is also responsible - ensure clear role separation');
    }
    
    // Check for overlaps between consulted and informed (this is OK)
    const consultedSet = new Set(raci.consulted);
    const informedSet = new Set(raci.informed);
    const overlap = raci.consulted.filter(id => informedSet.has(id));
    
    if (overlap.length > 0) {
      warnings.push(`Suites ${overlap.join(', ')} are both consulted and informed`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },
  
  // Validate all suite IDs exist in workspace
  validateSuiteExistence: async (raci: RACIInput, workspaceId: string): Promise<ValidationResult> => {
    // This would check against actual suite records
    // For now, return basic validation
    const errors: string[] = [];
    const allSuiteIds = [
      raci.accountable,
      ...raci.responsible,
      ...raci.consulted,
      ...raci.informed
    ];
    
    // Remove duplicates
    const uniqueSuiteIds = Array.from(new Set(allSuiteIds));
    
    // Basic validation - ensure IDs are not empty
    for (const suiteId of uniqueSuiteIds) {
      if (!suiteId || suiteId.trim() === '') {
        errors.push('All suite IDs must be non-empty strings');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }
};

// Default Workflow Stages for Initiatives
export const DEFAULT_INITIATIVE_STAGES: Omit<WorkflowStage, 'id' | 'startedAt' | 'completedAt'>[] = [
  {
    name: 'Discovery',
    description: 'Research and analysis phase',
    order: 1,
    status: StageStatus.NOT_STARTED,
    requiredSuites: [SuiteType.STRATEGY, SuiteType.PRODUCT]
  },
  {
    name: 'Planning',
    description: 'Strategic planning and resource allocation',
    order: 2,
    status: StageStatus.NOT_STARTED,
    requiredSuites: [SuiteType.STRATEGY, SuiteType.OPERATIONS]
  },
  {
    name: 'Design',
    description: 'Solution design and architecture',
    order: 3,
    status: StageStatus.NOT_STARTED,
    requiredSuites: [SuiteType.PRODUCT, SuiteType.DEVELOPMENT]
  },
  {
    name: 'Implementation',
    description: 'Build and development phase',
    order: 4,
    status: StageStatus.NOT_STARTED,
    requiredSuites: [SuiteType.DEVELOPMENT, SuiteType.OPERATIONS]
  },
  {
    name: 'Launch',
    description: 'Market launch and promotion',
    order: 5,
    status: StageStatus.NOT_STARTED,
    requiredSuites: [SuiteType.MARKETING, SuiteType.SALES]
  },
  {
    name: 'Optimization',
    description: 'Performance monitoring and optimization',
    order: 6,
    status: StageStatus.NOT_STARTED,
    requiredSuites: [SuiteType.OPERATIONS, SuiteType.STRATEGY]
  }
];

// Utility Functions
export const initiativeUtils = {
  // Calculate overall progress from stages
  calculateProgress: (stages: WorkflowStage[]): number => {
    if (stages.length === 0) return 0;
    
    const completedStages = stages.filter(stage => stage.status === StageStatus.COMPLETED);
    return completedStages.length / stages.length;
  },
  
  // Get current active stage
  getCurrentStage: (stages: WorkflowStage[]): WorkflowStage | null => {
    const sortedStages = stages.sort((a, b) => a.order - b.order);
    return sortedStages.find(stage => stage.status === StageStatus.IN_PROGRESS) || null;
  },
  
  // Get next stage to work on
  getNextStage: (stages: WorkflowStage[]): WorkflowStage | null => {
    const sortedStages = stages.sort((a, b) => a.order - b.order);
    return sortedStages.find(stage => stage.status === StageStatus.NOT_STARTED) || null;
  },
  
  // Validate RACI completeness
  validateRACICompleteness: (raci: RACI): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Run all validation rules
    const singleAccountableResult = RACI_VALIDATION_RULES.validateSingleAccountable(raci);
    const responsibleExistsResult = RACI_VALIDATION_RULES.validateResponsibleExists(raci);
    const noConflictsResult = RACI_VALIDATION_RULES.validateNoConflicts(raci);
    
    errors.push(...singleAccountableResult.errors);
    errors.push(...responsibleExistsResult.errors);
    errors.push(...noConflictsResult.errors);
    
    warnings.push(...singleAccountableResult.warnings);
    warnings.push(...responsibleExistsResult.warnings);
    warnings.push(...noConflictsResult.warnings);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
};