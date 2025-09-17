import { runQuery, runSingleQuery, neo4jClient } from './neo4j';
import { SCHEMA_QUERIES } from './neo4j-schema';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixes: string[];
}

export class Neo4jValidationService {
  
  /**
   * Validate complete database schema and data integrity
   */
  static async validateDatabase(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      fixes: []
    };
    
    try {
      console.log('🔍 Starting comprehensive Neo4j validation...');
      
      // 1. Check connectivity
      await this.validateConnectivity(result);
      
      // 2. Validate schema structure
      await this.validateSchemaStructure(result);
      
      // 3. Validate data relationships
      await this.validateDataRelationships(result);
      
      // 4. Validate business rules
      await this.validateBusinessRules(result);
      
      // 5. Check performance indicators
      await this.validatePerformance(result);
      
      result.isValid = result.errors.length === 0;
      
      console.log(`✅ Validation completed. Valid: ${result.isValid}, Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);
      
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return result;
  }
  
  /**
   * Validate database connectivity
   */
  private static async validateConnectivity(result: ValidationResult) {
    try {
      const connected = await neo4jClient.verifyConnectivity();
      if (!connected) {
        result.errors.push('Cannot connect to Neo4j database');
        return;
      }
      
      // Test basic query execution
      await runQuery('RETURN 1 as test');
      
    } catch (error) {
      result.errors.push(`Connectivity validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Validate schema structure (constraints and indexes)
   */
  private static async validateSchemaStructure(result: ValidationResult) {
    try {
      // Check constraints
      const constraintValidation = await this.validateConstraints();
      result.errors.push(...constraintValidation.errors);
      result.warnings.push(...constraintValidation.warnings);
      result.fixes.push(...constraintValidation.fixes);
      
      // Check indexes
      const indexValidation = await this.validateIndexes();
      result.errors.push(...indexValidation.errors);
      result.warnings.push(...indexValidation.warnings);
      result.fixes.push(...indexValidation.fixes);
      
    } catch (error) {
      result.errors.push(`Schema structure validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Validate constraints
   */
  private static async validateConstraints(): Promise<ValidationResult> {
    const validation: ValidationResult = { isValid: true, errors: [], warnings: [], fixes: [] };
    
    try {
      // Get existing constraints
      const existingConstraints = await runQuery(`
        SHOW CONSTRAINTS YIELD name, type, entityType, labelsOrTypes, properties, state
        RETURN name, type, entityType, labelsOrTypes, properties, state
      `);
      
      const existingConstraintNames = existingConstraints.map((c: any) => c.name);
      
      // Check required constraints
      const requiredConstraints = [
        'user_id', 'user_clerk_id', 'workspace_id', 'suite_id', 
        'initiative_id', 'task_id', 'criterion_id', 'resource_id', 'member_id'
      ];
      
      for (const constraintName of requiredConstraints) {
        if (!existingConstraintNames.some((name: string) => name.includes(constraintName))) {
          validation.warnings.push(`Missing constraint for ${constraintName}`);
          validation.fixes.push(`Create ${constraintName} constraint`);
        }
      }
      
      // Check constraint states
      const failedConstraints = existingConstraints.filter((c: any) => c.state && c.state !== 'ONLINE');
      for (const constraint of failedConstraints) {
        validation.errors.push(`Constraint ${constraint.name} is in ${constraint.state} state`);
      }
      
    } catch (error) {
      validation.errors.push(`Constraint validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return validation;
  }
  
  /**
   * Validate indexes
   */
  private static async validateIndexes(): Promise<ValidationResult> {
    const validation: ValidationResult = { isValid: true, errors: [], warnings: [], fixes: [] };
    
    try {
      // Get existing indexes
      const existingIndexes = await runQuery(`
        SHOW INDEXES YIELD name, state, type, entityType, labelsOrTypes, properties
        WHERE type <> 'LOOKUP'
        RETURN name, state, type, entityType, labelsOrTypes, properties
      `);
      
      const existingIndexNames = existingIndexes.map((i: any) => i.name);
      
      // Check for critical performance indexes
      const criticalIndexes = [
        'user_email', 'user_clerk_id_idx', 'workspace_invite_code',
        'suite_workspace_id', 'task_status', 'task_initiative_id',
        'initiative_suite_id', 'initiative_status'
      ];
      
      for (const indexName of criticalIndexes) {
        if (!existingIndexNames.some((name: string) => name.includes(indexName))) {
          validation.warnings.push(`Missing critical index: ${indexName}`);
          validation.fixes.push(`Create ${indexName} index`);
        }
      }
      
      // Check index states
      const failedIndexes = existingIndexes.filter((i: any) => i.state && i.state !== 'ONLINE');
      for (const index of failedIndexes) {
        validation.errors.push(`Index ${index.name} is in ${index.state} state`);
      }
      
      // Check for unused indexes (simplified)
      const potentiallyUnusedIndexes = existingIndexes.filter((i: any) => 
        i.name.includes('_unused_') || i.name.includes('_temp_')
      );
      
      for (const index of potentiallyUnusedIndexes) {
        validation.warnings.push(`Potentially unused index: ${index.name}`);
      }
      
    } catch (error) {
      validation.errors.push(`Index validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return validation;
  }
  
  /**
   * Validate data relationships
   */
  private static async validateDataRelationships(result: ValidationResult) {
    try {
      // Check orphaned nodes
      await this.validateOrphanedNodes(result);
      
      // Check missing relationships
      await this.validateMissingRelationships(result);
      
      // Check relationship cardinality
      await this.validateRelationshipCardinality(result);
      
    } catch (error) {
      result.errors.push(`Data relationship validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Validate orphaned nodes
   */
  private static async validateOrphanedNodes(result: ValidationResult) {
    const checks = [
      {
        query: `MATCH (t:Task) WHERE NOT EXISTS((t)<-[:HAS]-(:Initiative)) RETURN count(t) as count`,
        message: 'Tasks without parent initiative'
      },
      {
        query: `MATCH (i:Initiative) WHERE NOT EXISTS((i)<-[:HAS]-(:Suite)) RETURN count(i) as count`,
        message: 'Initiatives without parent suite'
      },
      {
        query: `MATCH (s:Suite) WHERE NOT EXISTS((s)<-[:HAS_SUITE]-(:Workspace)) RETURN count(s) as count`,
        message: 'Suites without parent workspace'
      },
      {
        query: `MATCH (ac:AcceptanceCriterion) WHERE NOT EXISTS((ac)<-[:HAS]-(:Task)) RETURN count(ac) as count`,
        message: 'Acceptance criteria without parent task'
      }
    ];
    
    for (const check of checks) {
      try {
        const queryResult = await runSingleQuery<{count: number}>(check.query);
        if (queryResult && queryResult.count > 0) {
          result.errors.push(`${check.message}: ${queryResult.count} found`);
          result.fixes.push(`Clean up orphaned nodes: ${check.message}`);
        }
      } catch (error) {
        result.warnings.push(`Could not check: ${check.message}`);
      }
    }
  }
  
  /**
   * Validate missing relationships
   */
  private static async validateMissingRelationships(result: ValidationResult) {
    const checks = [
      {
        query: `MATCH (w:Workspace) WHERE NOT EXISTS((w)-[:HAS_SUITE]->(:Suite)) RETURN count(w) as count`,
        message: 'Workspaces without suites'
      },
      {
        query: `MATCH (t:Task) WHERE t.assigneeId IS NOT NULL AND NOT EXISTS((t)<-[:ASSIGNED_TO]-(:User {id: t.assigneeId})) RETURN count(t) as count`,
        message: 'Tasks with assigneeId but no User relationship'
      },
      {
        query: `MATCH (i:Initiative) WHERE NOT EXISTS((i)-[:RESPONSIBLE_SUITE]->(:Suite)) RETURN count(i) as count`,
        message: 'Initiatives without responsible suite'
      }
    ];
    
    for (const check of checks) {
      try {
        const queryResult = await runSingleQuery<{count: number}>(check.query);
        if (queryResult && queryResult.count > 0) {
          if (check.message.includes('Workspaces without suites')) {
            result.errors.push(`${check.message}: ${queryResult.count} found`);
            result.fixes.push(`Initialize default suites for workspaces`);
          } else {
            result.warnings.push(`${check.message}: ${queryResult.count} found`);
            result.fixes.push(`Fix relationship: ${check.message}`);
          }
        }
      } catch (error) {
        result.warnings.push(`Could not check: ${check.message}`);
      }
    }
  }
  
  /**
   * Validate relationship cardinality
   */
  private static async validateRelationshipCardinality(result: ValidationResult) {
    const checks = [
      {
        query: `
          MATCH (i:Initiative)-[:ACCOUNTABLE_SUITE]->(s:Suite)
          WITH i, count(s) as count
          WHERE count > 1
          RETURN count(i) as violations
        `,
        message: 'Initiatives with multiple accountable suites'
      },
      {
        query: `
          MATCH (w:Workspace)-[:HAS_SUITE]->(s:Suite)
          WITH w, count(s) as suiteCount
          WHERE suiteCount <> 6
          RETURN count(w) as violations, collect(w.id) as workspaceIds
        `,
        message: 'Workspaces without exactly 6 suites'
      }
    ];
    
    for (const check of checks) {
      try {
        const queryResult = await runSingleQuery<{violations: number; workspaceIds?: string[]}>(check.query);
        if (queryResult && queryResult.violations > 0) {
          result.warnings.push(`${check.message}: ${queryResult.violations} found`);
          result.fixes.push(`Fix cardinality: ${check.message}`);
        }
      } catch (error) {
        result.warnings.push(`Could not check: ${check.message}`);
      }
    }
  }
  
  /**
   * Validate business rules
   */
  private static async validateBusinessRules(result: ValidationResult) {
    try {
      // Check suite types are valid
      const invalidSuiteTypes = await runQuery(`
        MATCH (s:Suite)
        WHERE NOT s.type IN ['PRODUCT', 'MARKETING', 'DEVELOPMENT', 'OPERATIONS', 'STRATEGY', 'SALES']
        RETURN count(s) as count, collect(DISTINCT s.type) as invalidTypes
      `);
      
      if (invalidSuiteTypes[0]?.count > 0) {
        result.errors.push(`Invalid suite types found: ${invalidSuiteTypes[0].invalidTypes.join(', ')}`);
        result.fixes.push('Fix invalid suite types');
      }
      
      // Check task status values
      const invalidTaskStatus = await runQuery(`
        MATCH (t:Task)
        WHERE NOT t.status IN ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']
        RETURN count(t) as count, collect(DISTINCT t.status) as invalidStatuses
      `);
      
      if (invalidTaskStatus[0]?.count > 0) {
        result.errors.push(`Invalid task statuses found: ${invalidTaskStatus[0].invalidStatuses.join(', ')}`);
        result.fixes.push('Fix invalid task statuses');
      }
      
      // Check for future creation dates
      const futureCreatedAt = await runQuery(`
        MATCH (n)
        WHERE EXISTS(n.createdAt) AND n.createdAt > datetime()
        RETURN count(n) as count, labels(n) as nodeTypes
      `);
      
      if (futureCreatedAt[0]?.count > 0) {
        result.warnings.push(`Nodes with future creation dates: ${futureCreatedAt[0].count} found`);
        result.fixes.push('Fix future creation dates');
      }
      
    } catch (error) {
      result.warnings.push(`Business rule validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Validate performance indicators
   */
  private static async validatePerformance(result: ValidationResult) {
    try {
      // Check for large collections that might need pagination
      const largeTables = await runQuery(`
        MATCH (n) 
        WITH labels(n) as nodeType, count(n) as count
        UNWIND nodeType as label
        WITH label, sum(count) as totalCount
        WHERE totalCount > 10000
        RETURN label, totalCount
        ORDER BY totalCount DESC
      `);
      
      for (const table of largeTables) {
        result.warnings.push(`Large node collection: ${table.label} has ${table.totalCount} nodes`);
        result.fixes.push(`Consider pagination or archiving for ${table.label}`);
      }
      
      // Check for missing indexes on commonly queried fields
      const commonQueries = [
        { field: 'Task.status', suggestion: 'task_status index needed for filtering' },
        { field: 'Initiative.moscow', suggestion: 'initiative_moscow index needed for prioritization' },
        { field: 'User.email', suggestion: 'user_email index needed for authentication' }
      ];
      
      for (const query of commonQueries) {
        // This is a simplified check - in reality, you'd check actual index usage
        result.fixes.push(`Performance optimization: ${query.suggestion}`);
      }
      
    } catch (error) {
      result.warnings.push(`Performance validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Apply automatic fixes for common issues
   */
  static async applyAutomaticFixes(validationResult: ValidationResult): Promise<{
    applied: string[];
    failed: string[];
  }> {
    const applied: string[] = [];
    const failed: string[] = [];
    
    try {
      // Create missing constraints
      for (const constraint of SCHEMA_QUERIES.constraints) {
        try {
          await runQuery(constraint);
          applied.push(`Applied constraint: ${constraint}`);
        } catch (error) {
          // Constraint might already exist
          console.log(`Constraint might already exist: ${constraint}`);
        }
      }
      
      // Create missing indexes
      for (const index of SCHEMA_QUERIES.indexes) {
        try {
          await runQuery(index);
          applied.push(`Applied index: ${index}`);
        } catch (error) {
          // Index might already exist
          console.log(`Index might already exist: ${index}`);
        }
      }
      
      // Initialize default suites for workspaces without them
      const workspacesWithoutSuites = await runQuery(`
        MATCH (w:Workspace)
        WHERE NOT EXISTS((w)-[:HAS_SUITE]->(:Suite))
        RETURN w.id as workspaceId
        LIMIT 10
      `);
      
      for (const workspace of workspacesWithoutSuites) {
        try {
          await this.initializeDefaultSuites(workspace.workspaceId);
          applied.push(`Initialized default suites for workspace: ${workspace.workspaceId}`);
        } catch (error) {
          failed.push(`Failed to initialize suites for workspace: ${workspace.workspaceId}`);
        }
      }
      
    } catch (error) {
      failed.push(`Auto-fix process failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return { applied, failed };
  }
  
  /**
   * Initialize default suites for a workspace
   */
  private static async initializeDefaultSuites(workspaceId: string) {
    const query = `
      MATCH (w:Workspace {id: $workspaceId})
      WHERE NOT EXISTS((w)-[:HAS_SUITE]->(:Suite))
      WITH w
      UNWIND [
        {type: 'PRODUCT', name: 'Product', slug: 'product', description: 'Product development and management'},
        {type: 'MARKETING', name: 'Marketing', slug: 'marketing', description: 'Marketing campaigns and brand management'},
        {type: 'DEVELOPMENT', name: 'Coding', slug: 'coding', description: 'Software development and engineering'},
        {type: 'OPERATIONS', name: 'Ops', slug: 'ops', description: 'Operations and infrastructure management'},
        {type: 'STRATEGY', name: 'Strategy', slug: 'strategy', description: 'Strategic planning and business development'},
        {type: 'SALES', name: 'Sales', slug: 'sales', description: 'Sales processes and customer acquisition'}
      ] AS suiteInfo
      CREATE (s:Suite {
        id: randomUUID(),
        name: suiteInfo.name,
        description: suiteInfo.description,
        slug: suiteInfo.slug,
        workspaceId: w.id,
        isActive: true,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      CREATE (w)-[:HAS_SUITE]->(s)
      RETURN count(s) as created
    `;
    
    return runSingleQuery(query, { workspaceId });
  }
  
  /**
   * Generate validation report
   */
  static generateValidationReport(result: ValidationResult): string {
    const status = result.isValid ? '✅ VALID' : '❌ INVALID';
    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;
    const fixCount = result.fixes.length;
    
    let report = `
🔍 Neo4j Database Validation Report
Status: ${status}
Errors: ${errorCount}
Warnings: ${warningCount}
Recommended Fixes: ${fixCount}

`;
    
    if (result.errors.length > 0) {
      report += '❌ ERRORS:\n';
      result.errors.forEach((error, i) => {
        report += `  ${i + 1}. ${error}\n`;
      });
      report += '\n';
    }
    
    if (result.warnings.length > 0) {
      report += '⚠️  WARNINGS:\n';
      result.warnings.forEach((warning, i) => {
        report += `  ${i + 1}. ${warning}\n`;
      });
      report += '\n';
    }
    
    if (result.fixes.length > 0) {
      report += '🔧 RECOMMENDED FIXES:\n';
      result.fixes.forEach((fix, i) => {
        report += `  ${i + 1}. ${fix}\n`;
      });
    }
    
    return report.trim();
  }
}