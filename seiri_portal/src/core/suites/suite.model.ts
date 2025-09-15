// Suite Model Implementation
// Core model for the 6 mandatory suites in every workspace

export enum SuiteType {
  PRODUCT = 'PRODUCT',
  MARKETING = 'MARKETING', 
  DEVELOPMENT = 'DEVELOPMENT',
  OPERATIONS = 'OPERATIONS',
  STRATEGY = 'STRATEGY',
  SALES = 'SALES'
}

export enum RACIRole {
  RESPONSIBLE = 'RESPONSIBLE',
  ACCOUNTABLE = 'ACCOUNTABLE', 
  CONSULTED = 'CONSULTED',
  INFORMED = 'INFORMED'
}

export interface Suite {
  id: string;
  name: string;
  type: SuiteType;
  description?: string;
  workspaceId: string;
  capabilities: Capability[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  ontologyClass: string;      // Reference to domain ontology
  agentTypes: string[];       // Agent types that provide this capability
}

export interface InitiativeRole {
  id: string;
  initiativeId: string;
  suiteId: string;
  role: RACIRole;
  assignedAt: Date;
}

// Suite Creation Input
export interface CreateSuiteInput {
  name: string;
  type: SuiteType;
  description?: string;
  workspaceId: string;
}

// Suite Domain Ontology Interface
export interface DomainOntology {
  namespace: string;
  classes: OntologyClass[];
  relationships: OntologyRelationship[];
  validationRules: ValidationRule[];
}

export interface OntologyClass {
  name: string;
  properties: PropertyDefinition[];
  constraints: Constraint[];
}

export interface PropertyDefinition {
  name: string;
  type: string;
  required: boolean;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
}

export interface Constraint {
  type: 'minLength' | 'maxLength' | 'nonEmpty' | 'unique' | 'custom';
  value?: any;
  message: string;
}

export interface OntologyRelationship {
  from: string;
  to: string;
  type: string;
  cardinality: '1:1' | '1:many' | 'many:many';
}

export interface ValidationRule {
  name: string;
  description: string;
  validator: (data: any) => ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Suite Service Interface
export interface SuiteService {
  createSuite(input: CreateSuiteInput): Promise<Suite>;
  getSuite(id: string): Promise<Suite | null>;
  getSuitesByWorkspace(workspaceId: string): Promise<Suite[]>;
  getSuiteByType(workspaceId: string, type: SuiteType): Promise<Suite | null>;
  updateSuite(id: string, updates: Partial<Suite>): Promise<Suite>;
  deleteSuite(id: string): Promise<boolean>;
  ensureAllSuites(workspaceId: string): Promise<Suite[]>;
  validateDomainObject(suiteType: SuiteType, data: any): Promise<ValidationResult>;
}

// Required Suite Configuration
export const REQUIRED_SUITES: SuiteType[] = [
  SuiteType.PRODUCT,
  SuiteType.MARKETING,
  SuiteType.DEVELOPMENT, 
  SuiteType.OPERATIONS,
  SuiteType.STRATEGY,
  SuiteType.SALES
];

// Default Suite Configurations
export const DEFAULT_SUITE_CONFIGS: Record<SuiteType, {
  name: string;
  description: string;
  capabilities: string[];
}> = {
  [SuiteType.PRODUCT]: {
    name: 'Product Suite',
    description: 'Product strategy, research, and planning capabilities',
    capabilities: [
      'Persona Development',
      'Jobs-to-be-Done Analysis', 
      'Market Research',
      'Product Requirements',
      'Feature Prioritization'
    ]
  },
  [SuiteType.MARKETING]: {
    name: 'Marketing Suite', 
    description: 'Customer acquisition, branding, and growth capabilities',
    capabilities: [
      'Customer Segmentation',
      'Brand Strategy',
      'Campaign Planning',
      'Growth Hacking',
      'Analytics & Attribution'
    ]
  },
  [SuiteType.DEVELOPMENT]: {
    name: 'Development Suite',
    description: 'Technical implementation and engineering capabilities', 
    capabilities: [
      'Architecture Design',
      'API Specification',
      'Component Development',
      'Testing Strategy',
      'DevOps & Deployment'
    ]
  },
  [SuiteType.OPERATIONS]: {
    name: 'Operations Suite',
    description: 'Process optimization and operational excellence capabilities',
    capabilities: [
      'Process Design',
      'Quality Assurance',
      'Resource Planning',
      'Performance Monitoring',
      'Compliance Management'
    ]
  },
  [SuiteType.STRATEGY]: {
    name: 'Strategy Suite',
    description: 'Strategic planning and business intelligence capabilities',
    capabilities: [
      'Strategic Planning',
      'Market Analysis',
      'Competitive Intelligence',
      'Business Model Design',
      'Performance Analytics'
    ]
  },
  [SuiteType.SALES]: {
    name: 'Sales Suite', 
    description: 'Revenue generation and customer success capabilities',
    capabilities: [
      'Sales Strategy',
      'Lead Qualification',
      'Customer Success',
      'Revenue Optimization',
      'Relationship Management'
    ]
  }
};

// Suite Validation Rules
export const SUITE_VALIDATION_RULES = {
  // Ensure every workspace has exactly 6 suites
  validateWorkspaceSuites: (suites: Suite[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (suites.length !== 6) {
      errors.push(`Workspace must have exactly 6 suites, found ${suites.length}`);
    }
    
    const presentTypes = new Set(suites.map(s => s.type));
    for (const requiredType of REQUIRED_SUITES) {
      if (!presentTypes.has(requiredType)) {
        errors.push(`Missing required suite type: ${requiredType}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },
  
  // Validate suite type uniqueness per workspace
  validateSuiteTypeUnique: (suites: Suite[], newSuite: CreateSuiteInput): ValidationResult => {
    const errors: string[] = [];
    const existingTypes = suites
      .filter(s => s.workspaceId === newSuite.workspaceId)
      .map(s => s.type);
      
    if (existingTypes.includes(newSuite.type)) {
      errors.push(`Suite type ${newSuite.type} already exists in workspace`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }
};

// Suite-specific Agent Types
export const SUITE_AGENT_MAPPING: Record<SuiteType, string[]> = {
  [SuiteType.PRODUCT]: [
    'PERSONA_AGENT',
    'JTBD_AGENT', 
    'RESEARCH_AGENT',
    'ANALYSIS_AGENT',
    'PRIORITIZATION_AGENT'
  ],
  [SuiteType.MARKETING]: [
    'SEGMENTATION_AGENT',
    'RESEARCH_AGENT',
    'ANALYSIS_AGENT',
    'IDEATION_AGENT'
  ],
  [SuiteType.DEVELOPMENT]: [
    'API_SPEC_AGENT',
    'COMPONENT_AGENT',
    'ARCHITECTURE_AGENT',
    'TASK_PLANNING_AGENT',
    'ESTIMATION_AGENT'
  ],
  [SuiteType.OPERATIONS]: [
    'OPTIMIZATION_AGENT',
    'TASK_PLANNING_AGENT',
    'ANALYSIS_AGENT'
  ],
  [SuiteType.STRATEGY]: [
    'INITIATIVE_COORDINATOR',
    'STRATEGY_AGENT', 
    'ANALYSIS_AGENT',
    'FINANCIAL_MODELING_AGENT'
  ],
  [SuiteType.SALES]: [
    'PRICING_AGENT',
    'ANALYSIS_AGENT',
    'RESEARCH_AGENT'
  ]
};