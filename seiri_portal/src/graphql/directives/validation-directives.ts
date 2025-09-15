import { 
  GraphQLDirective, 
  DirectiveLocation, 
  GraphQLString, 
  GraphQLInt, 
  GraphQLList, 
  GraphQLNonNull,
  GraphQLBoolean,
  defaultFieldResolver,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLField,
  GraphQLFieldResolver
} from 'graphql';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { runQuery, runSingleQuery } from '@/lib/neo4j';

// Validation directive for domain-specific validation
export const validatesDirective = new GraphQLDirective({
  name: 'validates',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    ontologyClass: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The ontology class to validate against'
    },
    minCardinality: {
      type: GraphQLInt,
      description: 'Minimum number of items required'
    },
    maxCardinality: {
      type: GraphQLInt,
      description: 'Maximum number of items allowed'
    },
    customRules: {
      type: new GraphQLList(GraphQLString),
      description: 'Custom validation rules to apply'
    },
    required: {
      type: GraphQLBoolean,
      description: 'Whether the field is required',
      defaultValue: false
    },
    pattern: {
      type: GraphQLString,
      description: 'Regex pattern for string validation'
    }
  }
});

// Neo4j constraint directive
export const neo4jConstraintDirective = new GraphQLDirective({
  name: 'neo4jConstraint',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    unique: {
      type: GraphQLBoolean,
      description: 'Whether the field must be unique',
      defaultValue: false
    },
    indexed: {
      type: GraphQLBoolean,
      description: 'Whether the field should be indexed',
      defaultValue: false
    },
    nodeType: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The Neo4j node type'
    },
    property: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The Neo4j property name'
    },
    relationship: {
      type: GraphQLString,
      description: 'Relationship constraint pattern'
    }
  }
});

// SHACL validation directive for complex domain rules
export const shaclValidationDirective = new GraphQLDirective({
  name: 'shaclValidation',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    shapeUri: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'URI of the SHACL shape to validate against'
    },
    severity: {
      type: GraphQLString,
      description: 'Validation severity level',
      defaultValue: 'sh:Violation'
    },
    enabled: {
      type: GraphQLBoolean,
      description: 'Whether SHACL validation is enabled',
      defaultValue: true
    }
  }
});

// Agent capability directive
export const agentCapabilityDirective = new GraphQLDirective({
  name: 'agentCapability',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    capability: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'Required agent capability'
    },
    agentType: {
      type: GraphQLString,
      description: 'Specific agent type required'
    },
    confidence: {
      type: GraphQLInt,
      description: 'Minimum confidence threshold (0-100)',
      defaultValue: 70
    }
  }
});

// Validation Error Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'warning' | 'error' | 'info';
  ontologyClass?: string;
  rule?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Three-layer validation service
 */
export class ValidationService {
  
  /**
   * Layer 1: GraphQL Schema Validation
   * Basic type safety and required fields
   */
  static validateGraphQLSchema(value: any, directive: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required validation
    if (directive.required && (value === null || value === undefined)) {
      errors.push({
        field: directive.field,
        message: `Field is required`,
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    }

    // Pattern validation
    if (directive.pattern && typeof value === 'string') {
      const regex = new RegExp(directive.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: directive.field,
          message: `Value does not match pattern ${directive.pattern}`,
          code: 'PATTERN_MISMATCH',
          severity: 'error'
        });
      }
    }

    // Cardinality validation
    if (Array.isArray(value)) {
      if (directive.minCardinality && value.length < directive.minCardinality) {
        errors.push({
          field: directive.field,
          message: `Minimum ${directive.minCardinality} items required, got ${value.length}`,
          code: 'MIN_CARDINALITY',
          severity: 'error'
        });
      }

      if (directive.maxCardinality && value.length > directive.maxCardinality) {
        errors.push({
          field: directive.field,
          message: `Maximum ${directive.maxCardinality} items allowed, got ${value.length}`,
          code: 'MAX_CARDINALITY',
          severity: 'error'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Layer 2: Neo4j Graph Constraints
   * Structural validation and relationship constraints
   */
  static async validateNeo4jConstraints(
    value: any, 
    directive: any,
    context: any
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // Unique constraint validation
      if (directive.unique && value !== null && value !== undefined) {
        const query = `
          MATCH (n:${directive.nodeType} {${directive.property}: $value})
          WHERE n.id <> $currentId
          RETURN count(n) as count
        `;

        const result = await runSingleQuery(query, {
          value,
          currentId: context.currentId || ''
        });

        if (result && result.count > 0) {
          errors.push({
            field: directive.field,
            message: `Value must be unique`,
            code: 'UNIQUE_CONSTRAINT',
            severity: 'error'
          });
        }
      }

      // Relationship constraint validation
      if (directive.relationship) {
        const relationshipQuery = `
          MATCH (n:${directive.nodeType} {id: $nodeId})
          MATCH path = ${directive.relationship}
          RETURN count(path) as count
        `;

        const result = await runSingleQuery(relationshipQuery, {
          nodeId: context.nodeId
        });

        if (!result || result.count === 0) {
          errors.push({
            field: directive.field,
            message: `Required relationship not found: ${directive.relationship}`,
            code: 'RELATIONSHIP_CONSTRAINT',
            severity: 'error'
          });
        }
      }

    } catch (error) {
      warnings.push({
        field: directive.field,
        message: `Neo4j constraint validation failed: ${error instanceof Error ? error.message : String(error)}`,
        code: 'NEO4J_VALIDATION_ERROR',
        severity: 'warning'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Layer 3: SHACL Validation
   * Complex domain-specific business rules
   */
  static async validateSHACL(
    value: any, 
    directive: any,
    context: any
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // SHACL validation is optional and only for complex domains
    if (!directive.enabled) {
      return { valid: true, errors: [], warnings: [] };
    }

    try {
      // In a full implementation, this would use a SHACL processor
      // For now, we'll simulate with domain-specific validation rules
      const validationResult = await this.simulateSHACLValidation(
        value, 
        directive.shapeUri, 
        context
      );

      return validationResult;

    } catch (error) {
      warnings.push({
        field: directive.field,
        message: `SHACL validation failed: ${error instanceof Error ? error.message : String(error)}`,
        code: 'SHACL_VALIDATION_ERROR',
        severity: 'warning'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Simulate SHACL validation with domain-specific rules
   */
  private static async simulateSHACLValidation(
    value: any,
    shapeUri: string,
    context: any
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Domain-specific validation rules based on shape URI
    switch (shapeUri) {
      case 'http://seiri.ai/shapes/AcceptanceCriterion':
        if (typeof value === 'string') {
          // Check for Given-When-Then pattern
          const hasGivenWhenThen = /given.*when.*then/i.test(value);
          if (!hasGivenWhenThen) {
            warnings.push({
              field: 'acceptanceCriteria',
              message: 'Acceptance criteria should follow Given-When-Then pattern',
              code: 'MISSING_GWT_PATTERN',
              severity: 'warning'
            });
          }
        }
        break;

      case 'http://seiri.ai/shapes/Initiative':
        if (context.initiative) {
          // Check RACI matrix completeness
          const hasAccountable = context.initiative.accountableSuite;
          const hasResponsible = context.initiative.responsibleSuites?.length > 0;
          
          if (!hasAccountable) {
            errors.push({
              field: 'initiative',
              message: 'Initiative must have exactly one accountable suite',
              code: 'MISSING_ACCOUNTABLE_SUITE',
              severity: 'error'
            });
          }

          if (!hasResponsible) {
            errors.push({
              field: 'initiative',
              message: 'Initiative must have at least one responsible suite',
              code: 'MISSING_RESPONSIBLE_SUITE',
              severity: 'error'
            });
          }
        }
        break;

      case 'http://seiri.ai/shapes/Task':
        if (context.task) {
          // Check task-agent alignment
          const hasAgentRequirements = context.task.agentRequirements?.length > 0;
          const hasEstimate = context.task.estimatedHours > 0;
          
          if (!hasAgentRequirements) {
            warnings.push({
              field: 'task',
              message: 'Task should specify agent requirements',
              code: 'MISSING_AGENT_REQUIREMENTS',
              severity: 'warning'
            });
          }

          if (!hasEstimate) {
            warnings.push({
              field: 'task',
              message: 'Task should have time estimate',
              code: 'MISSING_TIME_ESTIMATE',
              severity: 'warning'
            });
          }
        }
        break;

      default:
        warnings.push({
          field: 'shacl',
          message: `Unknown SHACL shape: ${shapeUri}`,
          code: 'UNKNOWN_SHACL_SHAPE',
          severity: 'warning'
        });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Combined validation using all three layers
   */
  static async validateField(
    value: any,
    fieldName: string,
    directives: any[],
    context: any
  ): Promise<ValidationResult> {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    // Layer 1: GraphQL Schema Validation
    for (const directive of directives) {
      if (directive.name === 'validates') {
        const result = this.validateGraphQLSchema(value, { ...directive.args, field: fieldName });
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
      }
    }

    // Layer 2: Neo4j Constraints
    for (const directive of directives) {
      if (directive.name === 'neo4jConstraint') {
        const result = await this.validateNeo4jConstraints(value, { ...directive.args, field: fieldName }, context);
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
      }
    }

    // Layer 3: SHACL Validation
    for (const directive of directives) {
      if (directive.name === 'shaclValidation') {
        const result = await this.validateSHACL(value, { ...directive.args, field: fieldName }, context);
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }
}

/**
 * Schema transformer to apply validation directives
 */
export function applyValidationDirectives(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.FIELD]: (fieldConfig: any) => {
      const validatesDirective = getDirective(schema, fieldConfig, 'validates');
      const neo4jConstraintDirective = getDirective(schema, fieldConfig, 'neo4jConstraint');
      const shaclValidationDirective = getDirective(schema, fieldConfig, 'shaclValidation');

      if (validatesDirective || neo4jConstraintDirective || shaclValidationDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;

        return {
          ...fieldConfig,
          resolve: async (source, args, context, info) => {
            // Execute original resolver
            const result = await resolve(source, args, context, info);

            // Apply validation if this is a mutation
            if (info.operation.operation === 'mutation') {
              const directives = [];
              
              if (validatesDirective) {
                directives.push({ name: 'validates', args: validatesDirective });
              }
              
              if (neo4jConstraintDirective) {
                directives.push({ name: 'neo4jConstraint', args: neo4jConstraintDirective });
              }
              
              if (shaclValidationDirective) {
                directives.push({ name: 'shaclValidation', args: shaclValidationDirective });
              }

              const validationResult = await ValidationService.validateField(
                result,
                info.fieldName,
                directives,
                context
              );

              if (!validationResult.valid) {
                throw new Error(
                  `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
                );
              }

              // Add warnings to context for client consumption
              if (validationResult.warnings.length > 0) {
                context.validationWarnings = context.validationWarnings || [];
                context.validationWarnings.push(...validationResult.warnings);
              }
            }

            return result;
          }
        };
      }

      return fieldConfig;
    }
  });
}

/**
 * Utility function to add validation directives to schema
 */
export function addValidationDirectives(schema: GraphQLSchema): GraphQLSchema {
  const directives = [
    validatesDirective,
    neo4jConstraintDirective,
    shaclValidationDirective,
    agentCapabilityDirective
  ];

  // Add directives to schema
  const schemaWithDirectives = new GraphQLSchema({
    ...schema.toConfig(),
    directives: [...schema.getDirectives(), ...directives]
  });

  // Apply transformations
  return applyValidationDirectives(schemaWithDirectives);
}