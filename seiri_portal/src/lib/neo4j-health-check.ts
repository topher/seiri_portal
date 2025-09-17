import { neo4jClient, runQuery, runSingleQuery } from './neo4j';
import { SCHEMA_QUERIES } from './neo4j-schema';

export interface DatabaseHealthReport {
  timestamp: Date;
  connectivity: {
    status: 'connected' | 'disconnected' | 'degraded';
    responseTime: number;
    error?: string;
  };
  schema: {
    constraints: {
      total: number;
      active: number;
      failed: string[];
    };
    indexes: {
      total: number;
      online: number;
      failed: string[];
    };
  };
  dataIntegrity: {
    orphanedNodes: number;
    missingRelationships: string[];
    duplicateConstraintViolations: string[];
  };
  performance: {
    slowQueries: Array<{
      query: string;
      avgExecutionTime: number;
      frequency: number;
    }>;
    indexUsage: Array<{
      index: string;
      usageCount: number;
      effectiveness: number;
    }>;
  };
  recommendations: string[];
  overallHealth: 'healthy' | 'warning' | 'critical';
}

export class Neo4jHealthCheckService {
  
  /**
   * Perform comprehensive database health check
   */
  static async performHealthCheck(): Promise<DatabaseHealthReport> {
    const startTime = Date.now();
    
    try {
      // Check connectivity
      const connectivity = await this.checkConnectivity();
      
      // Check schema integrity
      const schema = await this.checkSchemaIntegrity();
      
      // Check data integrity
      const dataIntegrity = await this.checkDataIntegrity();
      
      // Check performance
      const performance = await this.checkPerformance();
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(schema, dataIntegrity, performance);
      
      // Determine overall health
      const overallHealth = this.determineOverallHealth(connectivity, schema, dataIntegrity, performance);
      
      return {
        timestamp: new Date(),
        connectivity,
        schema,
        dataIntegrity,
        performance,
        recommendations,
        overallHealth
      };
      
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
  
  /**
   * Check database connectivity and response time
   */
  private static async checkConnectivity() {
    const startTime = Date.now();
    
    try {
      const connected = await neo4jClient.verifyConnectivity();
      const responseTime = Date.now() - startTime;
      
      let status: 'connected' | 'disconnected' | 'degraded' = 'connected';
      if (!connected) {
        status = 'disconnected';
      } else if (responseTime > 1000) {
        status = 'degraded';
      }
      
      return {
        status,
        responseTime,
        ...(status === 'disconnected' && { error: 'Failed to connect to Neo4j database' })
      };
    } catch (error) {
      return {
        status: 'disconnected' as const,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Check schema constraints and indexes
   */
  private static async checkSchemaIntegrity() {
    try {
      // Check constraints
      const constraintsQuery = `
        SHOW CONSTRAINTS YIELD name, type, entityType, labelsOrTypes, properties, ownedIndexName
        RETURN name, type, entityType, labelsOrTypes, properties, ownedIndexName
      `;
      const constraints = await runQuery(constraintsQuery);
      
      // Check indexes
      const indexesQuery = `
        SHOW INDEXES YIELD name, state, type, entityType, labelsOrTypes, properties
        RETURN name, state, type, entityType, labelsOrTypes, properties
      `;
      const indexes = await runQuery(indexesQuery);
      
      const failedConstraints = constraints
        .filter((c: any) => c.state && c.state !== 'ONLINE')
        .map((c: any) => c.name);
      
      const failedIndexes = indexes
        .filter((i: any) => i.state && i.state !== 'ONLINE')
        .map((i: any) => i.name);
      
      const onlineIndexes = indexes.filter((i: any) => !i.state || i.state === 'ONLINE');
      
      return {
        constraints: {
          total: constraints.length,
          active: constraints.length - failedConstraints.length,
          failed: failedConstraints
        },
        indexes: {
          total: indexes.length,
          online: onlineIndexes.length,
          failed: failedIndexes
        }
      };
      
    } catch (error) {
      console.error('Schema integrity check failed:', error);
      return {
        constraints: { total: 0, active: 0, failed: ['Schema check failed'] },
        indexes: { total: 0, online: 0, failed: ['Schema check failed'] }
      };
    }
  }
  
  /**
   * Check data integrity issues
   */
  private static async checkDataIntegrity() {
    try {
      const checks = await Promise.allSettled([
        // Check for orphaned nodes
        this.checkOrphanedNodes(),
        // Check missing relationships
        this.checkMissingRelationships(),
        // Check constraint violations
        this.checkConstraintViolations()
      ]);
      
      const orphanedNodes = checks[0].status === 'fulfilled' ? checks[0].value : 0;
      const missingRelationships = checks[1].status === 'fulfilled' ? checks[1].value : [];
      const duplicateConstraintViolations = checks[2].status === 'fulfilled' ? checks[2].value : [];
      
      return {
        orphanedNodes,
        missingRelationships,
        duplicateConstraintViolations
      };
      
    } catch (error) {
      console.error('Data integrity check failed:', error);
      return {
        orphanedNodes: 0,
        missingRelationships: [],
        duplicateConstraintViolations: []
      };
    }
  }
  
  /**
   * Check for orphaned nodes (nodes without expected relationships)
   */
  private static async checkOrphanedNodes(): Promise<number> {
    const queries = [
      // Tasks without initiatives
      `MATCH (t:Task) WHERE NOT EXISTS((t)<-[:HAS]-(:Initiative)) RETURN count(t) as count`,
      // Initiatives without suites  
      `MATCH (i:Initiative) WHERE NOT EXISTS((i)<-[:HAS]-(:Suite)) RETURN count(i) as count`,
      // Suites without workspaces
      `MATCH (s:Suite) WHERE NOT EXISTS((s)<-[:HAS_SUITE]-(:Workspace)) RETURN count(s) as count`,
      // Users without any relationships
      `MATCH (u:User) WHERE NOT EXISTS((u)-[]-()) RETURN count(u) as count`
    ];
    
    let totalOrphaned = 0;
    
    for (const query of queries) {
      try {
        const result = await runSingleQuery<{count: number}>(query);
        if (result) {
          totalOrphaned += result.count;
        }
      } catch (error) {
        console.error('Orphaned nodes check failed:', error);
      }
    }
    
    return totalOrphaned;
  }
  
  /**
   * Check for missing critical relationships
   */
  private static async checkMissingRelationships(): Promise<string[]> {
    const issues: string[] = [];
    
    const checks = [
      {
        query: `MATCH (w:Workspace) WHERE NOT EXISTS((w)-[:HAS_SUITE]->(:Suite)) RETURN count(w) as count`,
        issue: 'Workspaces without suites'
      },
      {
        query: `MATCH (i:Initiative) WHERE NOT EXISTS((i)-[:ACCOUNTABLE_SUITE]->(:Suite)) RETURN count(i) as count`,
        issue: 'Initiatives without accountable suite'
      },
      {
        query: `MATCH (t:Task) WHERE t.assigneeId IS NOT NULL AND NOT EXISTS((t)<-[:ASSIGNED_TO]-(:User)) RETURN count(t) as count`,
        issue: 'Tasks with assigneeId but no User relationship'
      }
    ];
    
    for (const check of checks) {
      try {
        const result = await runSingleQuery<{count: number}>(check.query);
        if (result && result.count > 0) {
          issues.push(`${check.issue}: ${result.count} found`);
        }
      } catch (error) {
        console.error(`Check failed for ${check.issue}:`, error);
        issues.push(`${check.issue}: Check failed`);
      }
    }
    
    return issues;
  }
  
  /**
   * Check for constraint violations
   */
  private static async checkConstraintViolations(): Promise<string[]> {
    const violations: string[] = [];
    
    // Check for duplicate IDs (should be prevented by constraints)
    const duplicateChecks = [
      { label: 'User', property: 'id' },
      { label: 'User', property: 'clerkId' },
      { label: 'Workspace', property: 'id' },
      { label: 'Suite', property: 'id' },
      { label: 'Initiative', property: 'id' },
      { label: 'Task', property: 'id' }
    ];
    
    for (const check of duplicateChecks) {
      try {
        const query = `
          MATCH (n:${check.label})
          WITH n.${check.property} as value, count(n) as count
          WHERE count > 1
          RETURN value, count
          LIMIT 10
        `;
        
        const result = await runQuery(query);
        if (result.length > 0) {
          violations.push(`Duplicate ${check.label}.${check.property}: ${result.length} duplicates found`);
        }
      } catch (error) {
        console.error(`Duplicate check failed for ${check.label}.${check.property}:`, error);
      }
    }
    
    return violations;
  }
  
  /**
   * Check performance metrics
   */
  private static async checkPerformance() {
    try {
      // Get database stats
      const dbStats = await this.getDatabaseStats();
      
      // Check for slow queries (would need query logging enabled)
      const slowQueries: any[] = []; // Placeholder - requires query logging
      
      // Check index effectiveness
      const indexUsage = await this.getIndexUsage();
      
      return {
        slowQueries,
        indexUsage
      };
      
    } catch (error) {
      console.error('Performance check failed:', error);
      return {
        slowQueries: [],
        indexUsage: []
      };
    }
  }
  
  /**
   * Get database statistics
   */
  private static async getDatabaseStats() {
    const query = `
      MATCH (n) 
      WITH labels(n) as labels, count(n) as count
      UNWIND labels as label
      WITH label, sum(count) as totalCount
      RETURN label, totalCount
      ORDER BY totalCount DESC
    `;
    
    return runQuery(query);
  }
  
  /**
   * Get index usage statistics (simplified)
   */
  private static async getIndexUsage() {
    try {
      const query = `
        SHOW INDEXES YIELD name, type, entityType, labelsOrTypes, properties, state
        WHERE state = 'ONLINE'
        RETURN name, type, entityType, labelsOrTypes, properties
      `;
      
      const indexes = await runQuery(query);
      
      return indexes.map((index: any) => ({
        index: index.name,
        usageCount: 0, // Would need monitoring data
        effectiveness: 0.8 // Placeholder - would be calculated from actual usage
      }));
      
    } catch (error) {
      console.error('Index usage check failed:', error);
      return [];
    }
  }
  
  /**
   * Generate recommendations based on health check results
   */
  private static generateRecommendations(
    schema: any, 
    dataIntegrity: any, 
    performance: any
  ): string[] {
    const recommendations: string[] = [];
    
    // Schema recommendations
    if (schema.constraints.failed.length > 0) {
      recommendations.push(`Fix ${schema.constraints.failed.length} failed constraints`);
    }
    
    if (schema.indexes.failed.length > 0) {
      recommendations.push(`Repair ${schema.indexes.failed.length} failed indexes`);
    }
    
    // Data integrity recommendations
    if (dataIntegrity.orphanedNodes > 0) {
      recommendations.push(`Clean up ${dataIntegrity.orphanedNodes} orphaned nodes`);
    }
    
    if (dataIntegrity.missingRelationships.length > 0) {
      recommendations.push('Fix missing critical relationships');
    }
    
    if (dataIntegrity.duplicateConstraintViolations.length > 0) {
      recommendations.push('Resolve constraint violations');
    }
    
    // Performance recommendations
    if (performance.slowQueries.length > 0) {
      recommendations.push('Optimize slow queries');
    }
    
    // Add schema optimization recommendations
    recommendations.push(
      'Consider adding composite indexes for common query patterns',
      'Regular maintenance: run health checks weekly',
      'Monitor query performance and adjust indexes as needed'
    );
    
    return recommendations;
  }
  
  /**
   * Determine overall health status
   */
  private static determineOverallHealth(
    connectivity: any,
    schema: any, 
    dataIntegrity: any,
    performance: any
  ): 'healthy' | 'warning' | 'critical' {
    
    // Critical issues
    if (connectivity.status === 'disconnected') {
      return 'critical';
    }
    
    if (schema.constraints.failed.length > 0 || schema.indexes.failed.length > 2) {
      return 'critical';
    }
    
    if (dataIntegrity.duplicateConstraintViolations.length > 0) {
      return 'critical';
    }
    
    // Warning issues
    if (connectivity.status === 'degraded') {
      return 'warning';
    }
    
    if (dataIntegrity.orphanedNodes > 10 || dataIntegrity.missingRelationships.length > 0) {
      return 'warning';
    }
    
    if (schema.indexes.failed.length > 0) {
      return 'warning';
    }
    
    return 'healthy';
  }
  
  /**
   * Auto-fix common issues
   */
  static async performAutoFix(): Promise<{
    fixed: string[];
    failed: string[];
  }> {
    const fixed: string[] = [];
    const failed: string[] = [];
    
    try {
      // Recreate missing constraints
      for (const constraint of SCHEMA_QUERIES.constraints) {
        try {
          await runQuery(constraint);
          fixed.push(`Constraint: ${constraint}`);
        } catch (error) {
          console.error(`Failed to create constraint: ${constraint}`, error);
          failed.push(`Constraint: ${constraint}`);
        }
      }
      
      // Recreate missing indexes
      for (const index of SCHEMA_QUERIES.indexes) {
        try {
          await runQuery(index);
          fixed.push(`Index: ${index}`);
        } catch (error) {
          console.error(`Failed to create index: ${index}`, error);
          failed.push(`Index: ${index}`);
        }
      }
      
    } catch (error) {
      console.error('Auto-fix failed:', error);
      failed.push('Auto-fix process failed');
    }
    
    return { fixed, failed };
  }
  
  /**
   * Generate health report summary
   */
  static generateHealthSummary(report: DatabaseHealthReport): string {
    const { connectivity, schema, dataIntegrity, overallHealth } = report;
    
    const healthEmoji = {
      'healthy': '✅',
      'warning': '⚠️',
      'critical': '🚨'
    };
    
    return `
${healthEmoji[overallHealth]} Database Health: ${overallHealth.toUpperCase()}

🔗 Connectivity: ${connectivity.status} (${connectivity.responseTime}ms)
🏗️  Schema: ${schema.constraints.active}/${schema.constraints.total} constraints, ${schema.indexes.online}/${schema.indexes.total} indexes
🔍 Data Integrity: ${dataIntegrity.orphanedNodes} orphaned nodes, ${dataIntegrity.missingRelationships.length} relationship issues
📊 Recommendations: ${report.recommendations.length} items

Generated: ${report.timestamp.toISOString()}
    `.trim();
  }
}