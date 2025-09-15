// Suite Module Exports
// Central exports for the Suite-Initiative architecture

// Models and Types
export * from './suite.model';

// Services  
export * from './suite.service';

// GraphQL Resolvers
export * from './suite.resolver';

// Re-export key types for convenience
export type {
  Suite,
  SuiteService,
  CreateSuiteInput,
  Capability,
  InitiativeRole,
  DomainOntology,
  ValidationResult
} from './suite.model';

export {
  SuiteType,
  RACIRole,
  REQUIRED_SUITES,
  DEFAULT_SUITE_CONFIGS,
  SUITE_VALIDATION_RULES,
  SUITE_AGENT_MAPPING
} from './suite.model';

export { suiteService } from './suite.service';
export { suiteResolvers, suiteUtils } from './suite.resolver';