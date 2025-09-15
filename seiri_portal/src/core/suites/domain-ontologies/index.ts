// Domain Ontologies Index
// Central exports for all suite-specific domain ontologies

// Import all ontologies
export { ProductOntology, ProductUtils } from './product.ontology';
export { MarketingOntology, MarketingUtils } from './marketing.ontology';
export { DevelopmentOntology, DevelopmentUtils } from './development.ontology';
export { OperationsOntology, OperationsUtils } from './operations.ontology';
export { StrategyOntology, StrategyUtils } from './strategy.ontology';
export { SalesOntology, SalesUtils } from './sales.ontology';

// Re-export types from individual ontologies
export type {
  GoalPriority,
  Frequency,
  PainCategory,
  ImpactLevel,
  JobType,
  RequirementPriority,
  Channel
} from './product.ontology';

export type {
  CampaignObjective,
  MarketingChannel,
  BrandTrait,
  ContentType
} from './marketing.ontology';

export type {
  ComponentType,
  ArchitecturePattern,
  DevelopmentMethodology,
  AuthenticationMethod
} from './development.ontology';

export type {
  AutomationLevel
} from './operations.ontology';

export type {
  SalesModel,
  SalesChannel
} from './sales.ontology';

// Suite type to ontology mapping
import { SuiteType } from '../suite.model';

export const SUITE_ONTOLOGY_MAPPING = {
  // Temporarily commented out due to GraphQL type mismatch
  // TODO: Fix type mismatches between local enums and GraphQL generated types
} as any;

// Suite type to utils mapping
export const SUITE_UTILS_MAPPING = {
  // Temporarily commented out due to GraphQL type mismatch
  // TODO: Fix type mismatches between local enums and GraphQL generated types
} as any;

// Ontology Service for validation and utilities
export class OntologyService {
  // Get ontology for a specific suite type
  static getOntology(suiteType: SuiteType) {
    return SUITE_ONTOLOGY_MAPPING[suiteType];
  }

  // Get utility functions for a specific suite type
  static getUtils(suiteType: SuiteType) {
    return SUITE_UTILS_MAPPING[suiteType];
  }

  // Validate data against a suite's ontology
  static async validateData(suiteType: SuiteType, data: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    validationResults: any[];
  }> {
    const ontology = this.getOntology(suiteType);
    if (!ontology) {
      return {
        isValid: false,
        errors: [`No ontology found for suite type: ${suiteType}`],
        warnings: [],
        validationResults: []
      };
    }

    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const validationResults: any[] = [];

    // Run all validation rules
    for (const rule of ontology.validationRules) {
      try {
        const result = rule.validator(data);
        validationResults.push({
          rule: rule.name,
          ...result
        });
        
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
      } catch (error) {
        allErrors.push(`Validation rule '${rule.name}' failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}`);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      validationResults
    };
  }

  // Get all classes for a suite type
  static getClasses(suiteType: SuiteType) {
    const ontology = this.getOntology(suiteType);
    return ontology?.classes || [];
  }

  // Get all relationships for a suite type
  static getRelationships(suiteType: SuiteType) {
    const ontology = this.getOntology(suiteType);
    return ontology?.relationships || [];
  }

  // Get validation summary for all suite types
  static getSuitesValidationSummary() {
    return Object.values(SuiteType).map(suiteType => ({
      suiteType,
      ontology: this.getOntology(suiteType),
      classCount: this.getClasses(suiteType).length,
      relationshipCount: this.getRelationships(suiteType).length,
      validationRuleCount: this.getOntology(suiteType)?.validationRules.length || 0
    }));
  }

  // Cross-suite validation (ensure data consistency across suites)
  static async validateCrossSuiteConsistency(
    suiteData: Record<SuiteType, any>
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Product-Marketing alignment
    if (suiteData[SuiteType.PRODUCT] && suiteData[SuiteType.MARKETING]) {
      const productPersonas = suiteData[SuiteType.PRODUCT].personas || [];
      const marketingSegments = suiteData[SuiteType.MARKETING].segments || [];

      if (productPersonas.length > 0 && marketingSegments.length === 0) {
        warnings.push('Product personas defined but no marketing segments - consider alignment');
      }
    }

    // Development-Product alignment
    if (suiteData[SuiteType.DEVELOPMENT] && suiteData[SuiteType.PRODUCT]) {
      const apiEndpoints = suiteData[SuiteType.DEVELOPMENT].apiSpec?.endpoints || [];
      const productRequirements = suiteData[SuiteType.PRODUCT].requirements || [];

      if (productRequirements.length > 0 && apiEndpoints.length === 0) {
        warnings.push('Product requirements exist but no API endpoints defined - consider technical implementation');
      }
    }

    // Strategy-Sales alignment
    if (suiteData[SuiteType.STRATEGY] && suiteData[SuiteType.SALES]) {
      const strategicObjectives = suiteData[SuiteType.STRATEGY].strategicPlan?.objectives || [];
      const salesTargets = suiteData[SuiteType.SALES].salesStrategy?.salesTargets || [];

      if (strategicObjectives.length > 0 && salesTargets.length === 0) {
        warnings.push('Strategic objectives defined but no sales targets - ensure strategy execution');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}