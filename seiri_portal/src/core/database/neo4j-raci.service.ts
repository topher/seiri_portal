// Neo4j RACI Service
// Database service for managing RACI relationships and value tracking in Neo4j

import { Driver, Session, Record } from 'neo4j-driver';
import { SuiteType, RACIRole } from '@/core/suites/suite.model';
import { ValueMetric, ValueMetricCategory } from '@/core/value/value-tracking.service';

export interface RACIAssignment {
  initiativeId: string;
  responsible: string[];
  accountable: string;
  consulted: string[];
  informed: string[];
  assignedAt: Date;
  lastUpdated: Date;
  version: string;
}

export interface RACIRelationshipProperties {
  assignedAt: Date;
  priority?: string;
  estimatedEffort?: string;
  authority?: string;
  decisionMaking?: string;
  inputRequired?: string;
  consultationFrequency?: string;
  frequency?: string;
  reportingLevel?: string;
  role: RACIRole;
}

export interface SuitePerformanceMetrics {
  suiteId: string;
  suiteName: string;
  responsibleCount: number;
  accountableCount: number;
  consultedCount: number;
  informedCount: number;
  averagePerformanceScore: number;
  lastPerformanceUpdate: Date;
}

export interface ValueMetricRecord {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  category: ValueMetricCategory;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  confidence: number;
  target?: number | string;
  createdAt: Date;
  lastUpdated: Date;
  source: string;
}

export class Neo4jRACIService {
  private driver: Driver;

  constructor(driver: Driver) {
    this.driver = driver;
  }

  /**
   * Create RACI assignment for an initiative
   */
  async createRACIAssignment(
    initiativeId: string,
    assignment: {
      responsible: string[];
      accountable: string;
      consulted: string[];
      informed: string[];
    }
  ): Promise<RACIAssignment> {
    const session = this.driver.session();
    
    try {
      const result = await session.executeWrite(async (tx) => {
        // First, clear any existing RACI relationships
        await tx.run(`
          MATCH (i:Initiative {id: $initiativeId})
          OPTIONAL MATCH (i)-[r:RESPONSIBLE_FOR|ACCOUNTABLE_FOR|CONSULTED_ON|INFORMED_ABOUT]-()
          DELETE r
        `, { initiativeId });

        // Create RESPONSIBLE relationships
        for (const suiteId of assignment.responsible) {
          await tx.run(`
            MATCH (i:Initiative {id: $initiativeId})
            MATCH (s:Suite {id: $suiteId})
            CREATE (s)-[r:RESPONSIBLE_FOR]->(i)
            SET r.assignedAt = datetime(),
                r.priority = "HIGH",
                r.estimatedEffort = "40 hours/week",
                r.role = "RESPONSIBLE"
          `, { initiativeId, suiteId });
        }

        // Create ACCOUNTABLE relationship
        await tx.run(`
          MATCH (i:Initiative {id: $initiativeId})
          MATCH (s:Suite {id: $accountableId})
          CREATE (s)-[r:ACCOUNTABLE_FOR]->(i)
          SET r.assignedAt = datetime(),
              r.authority = "FULL",
              r.decisionMaking = "PRIMARY", 
              r.role = "ACCOUNTABLE"
        `, { initiativeId, accountableId: assignment.accountable });

        // Create CONSULTED relationships
        for (const suiteId of assignment.consulted) {
          await tx.run(`
            MATCH (i:Initiative {id: $initiativeId})
            MATCH (s:Suite {id: $suiteId})
            CREATE (s)-[r:CONSULTED_ON]->(i)
            SET r.assignedAt = datetime(),
                r.inputRequired = "DOMAIN_EXPERTISE",
                r.consultationFrequency = "WEEKLY",
                r.role = "CONSULTED"
          `, { initiativeId, suiteId });
        }

        // Create INFORMED relationships
        for (const suiteId of assignment.informed) {
          await tx.run(`
            MATCH (i:Initiative {id: $initiativeId})
            MATCH (s:Suite {id: $suiteId})
            CREATE (s)-[r:INFORMED_ABOUT]->(i)
            SET r.assignedAt = datetime(),
                r.frequency = "WEEKLY",
                r.reportingLevel = "SUMMARY",
                r.role = "INFORMED"
          `, { initiativeId, suiteId });
        }

        // Update initiative RACI matrix property with proper Neo4j types
        await tx.run(`
          MATCH (i:Initiative {id: $initiativeId})
          SET i.raciResponsible = $responsible,
              i.raciAccountable = $accountable,
              i.raciConsulted = $consulted,
              i.raciInformed = $informed,
              i.raciLastUpdated = datetime(),
              i.raciVersion = "1.0"
        `, {
          initiativeId,
          responsible: assignment.responsible,
          accountable: assignment.accountable,
          consulted: assignment.consulted,
          informed: assignment.informed
        });

        return assignment;
      });

      return {
        initiativeId,
        ...assignment,
        assignedAt: new Date(),
        lastUpdated: new Date(),
        version: "1.0"
      };

    } finally {
      await session.close();
    }
  }

  /**
   * Get RACI assignment for an initiative
   */
  async getRACIAssignment(initiativeId: string): Promise<RACIAssignment | null> {
    const session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        const record = await tx.run(`
          MATCH (i:Initiative {id: $initiativeId})
          RETURN i.raciResponsible as responsible,
                 i.raciAccountable as accountable,
                 i.raciConsulted as consulted,
                 i.raciInformed as informed,
                 i.raciLastUpdated as lastUpdated,
                 i.raciVersion as version
        `, { initiativeId });

        if (record.records.length === 0) {
          return null;
        }

        const raciRecord = record.records[0];
        const responsible = raciRecord.get('responsible');
        
        // If no RACI data exists, return null
        if (!responsible && !raciRecord.get('accountable')) {
          return null;
        }

        return {
          initiativeId,
          responsible: responsible || [],
          accountable: raciRecord.get('accountable') || '',
          consulted: raciRecord.get('consulted') || [],
          informed: raciRecord.get('informed') || [],
          assignedAt: new Date(raciRecord.get('lastUpdated') || new Date()),
          lastUpdated: new Date(raciRecord.get('lastUpdated') || new Date()),
          version: raciRecord.get('version') || "1.0"
        };
      });

      return result;

    } finally {
      await session.close();
    }
  }

  /**
   * Get all initiatives for a suite with their RACI roles
   */
  async getInitiativesForSuite(
    suiteId: string,
    role?: RACIRole
  ): Promise<Array<{
    initiativeId: string;
    initiativeName: string;
    raciRole: RACIRole;
    relationshipProperties: any;
  }>> {
    const session = this.driver.session();
    
    try {
      const relationshipPattern = role ? 
        this.getRACIRelationshipType(role) : 
        'RESPONSIBLE_FOR|ACCOUNTABLE_FOR|CONSULTED_ON|INFORMED_ABOUT';

      const result = await session.executeRead(async (tx) => {
        const records = await tx.run(`
          MATCH (s:Suite {id: $suiteId})-[r:${relationshipPattern}]->(i:Initiative)
          RETURN i.id as initiativeId,
                 i.name as initiativeName,
                 type(r) as relationshipType,
                 properties(r) as relationshipProperties
          ORDER BY i.createdAt DESC
        `, { suiteId });

        return records.records.map(record => ({
          initiativeId: record.get('initiativeId'),
          initiativeName: record.get('initiativeName'),
          raciRole: this.relationshipTypeToRACIRole(record.get('relationshipType')),
          relationshipProperties: record.get('relationshipProperties')
        }));
      });

      return result;

    } finally {
      await session.close();
    }
  }

  /**
   * Create value metrics for an initiative
   */
  async createValueMetrics(
    initiativeId: string,
    metrics: Omit<ValueMetricRecord, 'id' | 'createdAt' | 'lastUpdated'>[]
  ): Promise<ValueMetricRecord[]> {
    const session = this.driver.session();
    
    try {
      const createdMetrics = await session.executeWrite(async (tx) => {
        const results = [];

        for (const metric of metrics) {
          const metricId = `metric_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          
          const result = await tx.run(`
            MATCH (i:Initiative {id: $initiativeId})
            CREATE (vm:ValueMetric {
              id: $metricId,
              name: $name,
              value: $value,
              unit: $unit,
              category: $category,
              trend: $trend,
              confidence: $confidence,
              target: $target,
              source: $source,
              createdAt: datetime(),
              lastUpdated: datetime()
            })
            CREATE (i)-[:HAS_METRIC {
              createdAt: datetime(),
              priority: CASE 
                WHEN $category IN ["REVENUE", "COST_REDUCTION"] THEN "HIGH"
                ELSE "MEDIUM"
              END
            }]->(vm)
            RETURN vm
          `, {
            initiativeId,
            metricId,
            name: metric.name,
            value: metric.value,
            unit: metric.unit,
            category: metric.category,
            trend: metric.trend,
            confidence: metric.confidence,
            target: metric.target || null,
            source: metric.source
          });

          const vmNode = result.records[0].get('vm');
          results.push({
            id: vmNode.properties.id,
            name: vmNode.properties.name,
            value: vmNode.properties.value,
            unit: vmNode.properties.unit,
            category: vmNode.properties.category as ValueMetricCategory,
            trend: vmNode.properties.trend as 'INCREASING' | 'DECREASING' | 'STABLE',
            confidence: vmNode.properties.confidence,
            target: vmNode.properties.target,
            createdAt: new Date(vmNode.properties.createdAt),
            lastUpdated: new Date(vmNode.properties.lastUpdated),
            source: vmNode.properties.source
          });
        }

        return results;
      });

      return createdMetrics;

    } finally {
      await session.close();
    }
  }

  /**
   * Get value metrics for an initiative
   */
  async getValueMetrics(initiativeId: string): Promise<ValueMetricRecord[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        const records = await tx.run(`
          MATCH (i:Initiative {id: $initiativeId})-[:HAS_METRIC]->(vm:ValueMetric)
          RETURN vm
          ORDER BY vm.createdAt DESC
        `, { initiativeId });

        return records.records.map(record => {
          const vm = record.get('vm');
          return {
            id: vm.properties.id,
            name: vm.properties.name,
            value: vm.properties.value,
            unit: vm.properties.unit,
            category: vm.properties.category as ValueMetricCategory,
            trend: vm.properties.trend as 'INCREASING' | 'DECREASING' | 'STABLE',
            confidence: vm.properties.confidence,
            target: vm.properties.target,
            createdAt: new Date(vm.properties.createdAt),
            lastUpdated: new Date(vm.properties.lastUpdated),
            source: vm.properties.source
          };
        });
      });

      return result;

    } finally {
      await session.close();
    }
  }

  /**
   * Update suite RACI performance metrics
   */
  async updateSuitePerformance(
    suiteId: string,
    performanceScore: number
  ): Promise<void> {
    const session = this.driver.session();
    
    try {
      await session.executeWrite(async (tx) => {
        // Count current RACI assignments
        const countResult = await tx.run(`
          MATCH (s:Suite {id: $suiteId})
          OPTIONAL MATCH (s)-[resp:RESPONSIBLE_FOR]->()
          OPTIONAL MATCH (s)-[acc:ACCOUNTABLE_FOR]->()
          OPTIONAL MATCH (s)-[cons:CONSULTED_ON]->()
          OPTIONAL MATCH (s)-[inf:INFORMED_ABOUT]->()
          RETURN count(DISTINCT resp) as responsibleCount,
                 count(DISTINCT acc) as accountableCount,
                 count(DISTINCT cons) as consultedCount,
                 count(DISTINCT inf) as informedCount
        `, { suiteId });

        const counts = countResult.records[0];
        
        // Update suite performance
        await tx.run(`
          MATCH (s:Suite {id: $suiteId})
          SET s.raciPerformance = {
            responsibleCount: $responsibleCount,
            accountableCount: $accountableCount,
            consultedCount: $consultedCount,
            informedCount: $informedCount,
            averagePerformanceScore: $performanceScore,
            lastPerformanceUpdate: datetime()
          }
        `, {
          suiteId,
          responsibleCount: counts.get('responsibleCount'),
          accountableCount: counts.get('accountableCount'),
          consultedCount: counts.get('consultedCount'),
          informedCount: counts.get('informedCount'),
          performanceScore
        });
      });

    } finally {
      await session.close();
    }
  }

  /**
   * Get suite performance metrics
   */
  async getSuitePerformance(suiteId: string): Promise<SuitePerformanceMetrics | null> {
    const session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        const record = await tx.run(`
          MATCH (s:Suite {id: $suiteId})
          RETURN s.name as suiteName,
                 s.raciPerformance as performance
        `, { suiteId });

        if (record.records.length === 0) {
          return null;
        }

        const performance = record.records[0].get('performance') || {};
        const suiteName = record.records[0].get('suiteName');

        return {
          suiteId,
          suiteName,
          responsibleCount: performance.responsibleCount || 0,
          accountableCount: performance.accountableCount || 0,
          consultedCount: performance.consultedCount || 0,
          informedCount: performance.informedCount || 0,
          averagePerformanceScore: performance.averagePerformanceScore || 85,
          lastPerformanceUpdate: new Date(performance.lastPerformanceUpdate || new Date())
        };
      });

      return result;

    } finally {
      await session.close();
    }
  }

  /**
   * Get RACI effectiveness report for workspace
   */
  async getRACIEffectivenessReport(workspaceId: string): Promise<{
    totalInitiatives: number;
    averageCoordinationScore: number;
    suiteUtilization: { [key: string]: number };
    raciDistribution: { [key in RACIRole]: number };
    topPerformingSuites: Array<{ suiteId: string; suiteName: string; score: number }>;
  }> {
    const session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        // Get total initiatives and coordination scores
        const overviewResult = await tx.run(`
          MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(i:Initiative)
          RETURN count(i) as totalInitiatives,
                 avg(i.raciCoordination.coordinationScore) as avgCoordination
        `, { workspaceId });

        // Get RACI distribution
        const raciDistResult = await tx.run(`
          MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(s:Suite)
          OPTIONAL MATCH (s)-[resp:RESPONSIBLE_FOR]->(:Initiative)
          OPTIONAL MATCH (s)-[acc:ACCOUNTABLE_FOR]->(:Initiative)
          OPTIONAL MATCH (s)-[cons:CONSULTED_ON]->(:Initiative)
          OPTIONAL MATCH (s)-[inf:INFORMED_ABOUT]->(:Initiative)
          RETURN count(DISTINCT resp) as responsibleTotal,
                 count(DISTINCT acc) as accountableTotal,
                 count(DISTINCT cons) as consultedTotal,
                 count(DISTINCT inf) as informedTotal
        `, { workspaceId });

        // Get top performing suites
        const performanceResult = await tx.run(`
          MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(s:Suite)
          WHERE s.raciPerformance IS NOT NULL
          RETURN s.id as suiteId,
                 s.name as suiteName,
                 s.raciPerformance.averagePerformanceScore as score
          ORDER BY score DESC
          LIMIT 5
        `, { workspaceId });

        const overview = overviewResult.records[0];
        const raciDist = raciDistResult.records[0];

        return {
          totalInitiatives: overview.get('totalInitiatives'),
          averageCoordinationScore: overview.get('avgCoordination') || 0,
          suiteUtilization: {}, // Would calculate based on active vs total suites
          raciDistribution: {
            RESPONSIBLE: raciDist.get('responsibleTotal'),
            ACCOUNTABLE: raciDist.get('accountableTotal'),
            CONSULTED: raciDist.get('consultedTotal'),
            INFORMED: raciDist.get('informedTotal')
          },
          topPerformingSuites: performanceResult.records.map(record => ({
            suiteId: record.get('suiteId'),
            suiteName: record.get('suiteName'),
            score: record.get('score') || 85
          }))
        };
      });

      return result;

    } finally {
      await session.close();
    }
  }

  // Helper methods
  private getRACIRelationshipType(role: RACIRole): string {
    switch (role) {
      case 'RESPONSIBLE': return 'RESPONSIBLE_FOR';
      case 'ACCOUNTABLE': return 'ACCOUNTABLE_FOR';
      case 'CONSULTED': return 'CONSULTED_ON';
      case 'INFORMED': return 'INFORMED_ABOUT';
      default: return 'RESPONSIBLE_FOR';
    }
  }

  private relationshipTypeToRACIRole(relationshipType: string): RACIRole {
    switch (relationshipType) {
      case 'RESPONSIBLE_FOR': return 'RESPONSIBLE' as RACIRole;
      case 'ACCOUNTABLE_FOR': return 'ACCOUNTABLE' as RACIRole;
      case 'CONSULTED_ON': return 'CONSULTED' as RACIRole;
      case 'INFORMED_ABOUT': return 'INFORMED' as RACIRole;
      default: return 'RESPONSIBLE' as RACIRole;
    }
  }
}

// Export for use in other services
export default Neo4jRACIService;