import { runQuery, runSingleQuery, runTransaction } from './neo4j';
import { TaskStatus, TaskPriority, MemberRole, Moscow } from './neo4j-schema';

/**
 * Optimized Neo4j Query Patterns for Seiri Portal
 * Focus on performance, indexing, and minimal data transfer
 */

export interface QueryPerformanceMetrics {
  queryTime: number;
  resultsCount: number;
  indexesUsed: string[];
  cacheHit: boolean;
}

export class OptimizedNeo4jQueries {
  
  // ================================
  // WORKSPACE QUERIES
  // ================================
  
  /**
   * Get workspace with essential data only
   * Uses indexes: workspace_id, user_clerk_id_idx
   */
  static async getWorkspaceEssentials(workspaceId: string, clerkUserId: string) {
    const query = `
      MATCH (u:User {clerkId: $clerkUserId})-[:MEMBER_OF]->(w:Workspace {id: $workspaceId})
      RETURN w {
        .id, .name, .imageUrl, .inviteCode, .createdAt, .updatedAt,
        memberRole: [(u)-[r:MEMBER_OF]->(w) | r.role][0]
      } as workspace
    `;
    
    return runSingleQuery(query, { workspaceId, clerkUserId });
  }

  /**
   * Get workspace dashboard data with optimized relationships
   * Uses composite indexes for performance
   */
  static async getWorkspaceDashboard(workspaceId: string) {
    const query = `
      MATCH (w:Workspace {id: $workspaceId})
      
      // Get suite counts and status
      OPTIONAL MATCH (w)-[:HAS_SUITE]->(s:Suite)
      WITH w, 
           count(s) as totalSuites,
           sum(CASE WHEN s.isActive THEN 1 ELSE 0 END) as activeSuites
      
      // Get initiative counts by status
      OPTIONAL MATCH (w)-[:CONTAINS]->(s:Suite)-[:HAS]->(i:Initiative)
      WITH w, totalSuites, activeSuites,
           count(i) as totalInitiatives,
           sum(CASE WHEN i.status = 'TODO' THEN 1 ELSE 0 END) as todoInitiatives,
           sum(CASE WHEN i.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgressInitiatives,
           sum(CASE WHEN i.status = 'DONE' THEN 1 ELSE 0 END) as doneInitiatives
      
      // Get task counts by priority
      OPTIONAL MATCH (w)-[:CONTAINS]->(s)-[:HAS]->(i)-[:HAS]->(t:Task)
      WITH w, totalSuites, activeSuites, totalInitiatives, todoInitiatives, 
           inProgressInitiatives, doneInitiatives,
           count(t) as totalTasks,
           sum(CASE WHEN t.priority = 'HIGH' THEN 1 ELSE 0 END) as highPriorityTasks,
           sum(CASE WHEN t.priority = 'URGENT' THEN 1 ELSE 0 END) as urgentTasks,
           sum(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as completedTasks
      
      // Get recent activity (last 7 days)
      OPTIONAL MATCH (w)-[:CONTAINS]->(s)-[:HAS]->(i)-[:HAS]->(t:Task)
      WHERE t.updatedAt >= datetime() - duration('P7D')
      
      RETURN {
        workspace: w {.id, .name, .imageUrl, .updatedAt},
        suites: {total: totalSuites, active: activeSuites},
        initiatives: {
          total: totalInitiatives, 
          todo: todoInitiatives, 
          inProgress: inProgressInitiatives, 
          done: doneInitiatives
        },
        tasks: {
          total: totalTasks, 
          high: highPriorityTasks, 
          urgent: urgentTasks, 
          completed: completedTasks
        },
        recentActivity: count(DISTINCT t)
      } as dashboard
    `;
    
    return runSingleQuery(query, { workspaceId });
  }

  // ================================
  // SUITE QUERIES
  // ================================
  
  /**
   * Get all suites for workspace with initiative counts
   * Optimized for workspace overview
   */
  static async getWorkspaceSuites(workspaceId: string) {
    const query = `
      MATCH (w:Workspace {id: $workspaceId})-[:HAS_SUITE]->(s:Suite)
      
      OPTIONAL MATCH (s)-[:HAS]->(i:Initiative)
      WITH s, count(i) as initiativeCount,
           sum(CASE WHEN i.status = 'DONE' THEN 1 ELSE 0 END) as completedInitiatives
      
      OPTIONAL MATCH (s)-[:HAS]->(i:Initiative)-[:HAS]->(t:Task)
      WITH s, initiativeCount, completedInitiatives, count(t) as taskCount
      
      RETURN s {
        .id, .name, .description, .slug, .isActive, .createdAt,
        metrics: {
          initiatives: initiativeCount,
          completed: completedInitiatives,
          tasks: taskCount,
          completionRate: CASE WHEN initiativeCount > 0 
                         THEN toFloat(completedInitiatives) / initiativeCount 
                         ELSE 0 END
        }
      }
      ORDER BY s.createdAt ASC
    `;
    
    return runQuery(query, { workspaceId });
  }

  /**
   * Get suite details with recent activity
   * Uses suite_workspace_id index
   */
  static async getSuiteDetails(suiteId: string, includeInactiveInitiatives: boolean = false) {
    const statusFilter = includeInactiveInitiatives ? '' : 'AND i.status <> \'CANCELLED\'';
    
    const query = `
      MATCH (s:Suite {id: $suiteId})
      
      // Get initiatives with task counts
      OPTIONAL MATCH (s)-[:HAS]->(i:Initiative)
      WHERE 1=1 ${statusFilter}
      
      OPTIONAL MATCH (i)-[:HAS]->(t:Task)
      WITH s, i,
           count(t) as taskCount,
           sum(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as completedTasks
      
      // Get assignees for initiatives
      OPTIONAL MATCH (i)<-[:ASSIGNED_TO]-(u:User)
      
      WITH s, 
           collect(CASE WHEN i IS NOT NULL THEN i {
             .id, .name, .description, .moscow, .status, .startDate, .endDate,
             assignee: u {.id, .name, .imageUrl},
             metrics: {tasks: taskCount, completed: completedTasks}
           } END) as initiatives
      
      RETURN s {
        .id, .name, .description, .slug, .isActive, .startDate, .endDate,
        .createdAt, .updatedAt,
        initiatives: initiatives
      } as suite
    `;
    
    return runSingleQuery(query, { suiteId });
  }

  // ================================
  // INITIATIVE QUERIES
  // ================================
  
  /**
   * Get initiative with full RACI matrix and task breakdown
   * Optimized for initiative detail view
   */
  static async getInitiativeDetails(initiativeId: string) {
    const query = `
      MATCH (i:Initiative {id: $initiativeId})
      MATCH (i)<-[:HAS]-(s:Suite)<-[:HAS_SUITE]-(w:Workspace)
      
      // Get assignee
      OPTIONAL MATCH (i)<-[:ASSIGNED_TO]-(assignee:User)
      
      // Get RACI relationships
      OPTIONAL MATCH (i)-[:RESPONSIBLE_SUITE]->(responsibleSuite:Suite)
      OPTIONAL MATCH (i)-[:ACCOUNTABLE_SUITE]->(accountableSuite:Suite)
      OPTIONAL MATCH (i)-[:CONSULTED_SUITE]->(consultedSuite:Suite)
      OPTIONAL MATCH (i)-[:INFORMED_SUITE]->(informedSuite:Suite)
      
      // Get tasks with assignees and acceptance criteria
      OPTIONAL MATCH (i)-[:HAS]->(t:Task)
      OPTIONAL MATCH (t)<-[:ASSIGNED_TO]-(taskAssignee:User)
      OPTIONAL MATCH (t)-[:HAS]->(ac:AcceptanceCriterion)
      
      WITH i, s, w, assignee,
           responsibleSuite, accountableSuite, consultedSuite, informedSuite,
           t, taskAssignee,
           count(ac) as totalCriteria,
           sum(CASE WHEN ac.completed THEN 1 ELSE 0 END) as completedCriteria
      
      WITH i, s, w, assignee, responsibleSuite, accountableSuite, 
           consultedSuite, informedSuite,
           collect(CASE WHEN t IS NOT NULL THEN t {
             .id, .name, .description, .status, .priority, .position,
             .dueDate, .createdAt, .updatedAt,
             assignee: taskAssignee {.id, .name, .imageUrl},
             acceptanceCriteria: {
               total: totalCriteria,
               completed: completedCriteria,
               completionRate: CASE WHEN totalCriteria > 0 
                              THEN toFloat(completedCriteria) / totalCriteria 
                              ELSE 0 END
             }
           } END) as tasks
      
      RETURN {
        initiative: i {
          .id, .name, .description, .moscow, .status, .startDate, .endDate,
          .createdAt, .updatedAt,
          assignee: assignee {.id, .name, .imageUrl}
        },
        suite: s {.id, .name, .slug},
        workspace: w {.id, .name},
        raci: {
          responsible: collect(DISTINCT responsibleSuite {.id, .name, .slug}),
          accountable: accountableSuite {.id, .name, .slug},
          consulted: collect(DISTINCT consultedSuite {.id, .name, .slug}),
          informed: collect(DISTINCT informedSuite {.id, .name, .slug})
        },
        tasks: [task IN tasks WHERE task IS NOT NULL | task]
      } as details
    `;
    
    return runSingleQuery(query, { initiativeId });
  }

  // ================================
  // TASK QUERIES
  // ================================
  
  /**
   * Get tasks with efficient filtering and pagination
   * Uses multiple indexes for optimal performance
   */
  static async getFilteredTasks(options: {
    workspaceId?: string;
    suiteId?: string;
    initiativeId?: string;
    assigneeId?: string;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    limit?: number;
    offset?: number;
    sortBy?: 'priority' | 'dueDate' | 'createdAt' | 'position';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const { 
      workspaceId, suiteId, initiativeId, assigneeId, 
      status, priority, limit = 50, offset = 0,
      sortBy = 'position', sortOrder = 'ASC'
    } = options;
    
    let whereClause = [];
    let matchPattern = '';
    
    if (workspaceId) {
      matchPattern = `MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(s:Suite)-[:HAS]->(i:Initiative)-[:HAS]->(t:Task)`;
    } else if (suiteId) {
      matchPattern = `MATCH (s:Suite {id: $suiteId})-[:HAS]->(i:Initiative)-[:HAS]->(t:Task)`;
    } else if (initiativeId) {
      matchPattern = `MATCH (i:Initiative {id: $initiativeId})-[:HAS]->(t:Task)`;
    } else {
      matchPattern = `MATCH (t:Task)`;
    }
    
    if (assigneeId) {
      matchPattern += `\nMATCH (t)<-[:ASSIGNED_TO]-(assignee:User {id: $assigneeId})`;
    } else {
      matchPattern += `\nOPTIONAL MATCH (t)<-[:ASSIGNED_TO]-(assignee:User)`;
    }
    
    if (status?.length) {
      whereClause.push(`t.status IN $status`);
    }
    if (priority?.length) {
      whereClause.push(`t.priority IN $priority`);
    }
    
    const whereString = whereClause.length ? `WHERE ${whereClause.join(' AND ')}` : '';
    
    const query = `
      ${matchPattern}
      ${whereString}
      
      OPTIONAL MATCH (t)<-[:HAS]-(initiative:Initiative)<-[:HAS]-(suite:Suite)
      OPTIONAL MATCH (t)-[:HAS]->(ac:AcceptanceCriterion)
      
      WITH t, assignee, initiative, suite,
           count(ac) as totalCriteria,
           sum(CASE WHEN ac.completed THEN 1 ELSE 0 END) as completedCriteria
      
      RETURN t {
        .id, .name, .description, .status, .priority, .position,
        .dueDate, .createdAt, .updatedAt,
        assignee: assignee {.id, .name, .imageUrl},
        initiative: initiative {.id, .name},
        suite: suite {.id, .name, .slug},
        acceptanceCriteria: {
          total: totalCriteria,
          completed: completedCriteria
        }
      } as task
      ORDER BY t.${sortBy} ${sortOrder}
      SKIP $offset
      LIMIT $limit
    `;
    
    return runQuery(query, { 
      workspaceId, suiteId, initiativeId, assigneeId, 
      status, priority, offset, limit 
    });
  }

  // ================================
  // PERFORMANCE OPTIMIZATION QUERIES
  // ================================
  
  /**
   * Batch update task positions for reordering
   * Uses transaction for consistency
   */
  static async batchUpdateTaskPositions(updates: Array<{taskId: string, position: number}>) {
    const query = `
      UNWIND $updates as update
      MATCH (t:Task {id: update.taskId})
      SET t.position = update.position, t.updatedAt = datetime()
      RETURN count(t) as updatedCount
    `;
    
    return runTransaction(async (tx) => {
      const result = await tx.run(query, { updates });
      return result.records[0]?.get('updatedCount') || 0;
    });
  }

  /**
   * Get workspace health metrics for monitoring
   * Optimized aggregation query
   */
  static async getWorkspaceHealthMetrics(workspaceId: string) {
    const query = `
      MATCH (w:Workspace {id: $workspaceId})
      
      // Suite health
      OPTIONAL MATCH (w)-[:HAS_SUITE]->(s:Suite)
      WITH w, count(s) as totalSuites, sum(CASE WHEN s.isActive THEN 1 ELSE 0 END) as activeSuites
      
      // Initiative health
      OPTIONAL MATCH (w)-[:CONTAINS]->(s:Suite)-[:HAS]->(i:Initiative)
      WITH w, totalSuites, activeSuites, 
           count(i) as totalInitiatives,
           sum(CASE WHEN i.status = 'DONE' THEN 1 ELSE 0 END) as completedInitiatives,
           sum(CASE WHEN i.endDate < datetime() AND i.status <> 'DONE' THEN 1 ELSE 0 END) as overdueInitiatives
      
      // Task health
      OPTIONAL MATCH (w)-[:CONTAINS]->(s)-[:HAS]->(i)-[:HAS]->(t:Task)
      WITH w, totalSuites, activeSuites, totalInitiatives, completedInitiatives, overdueInitiatives,
           count(t) as totalTasks,
           sum(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as completedTasks,
           sum(CASE WHEN t.dueDate < datetime() AND t.status <> 'DONE' THEN 1 ELSE 0 END) as overdueTasks,
           sum(CASE WHEN t.assigneeId IS NULL THEN 1 ELSE 0 END) as unassignedTasks
      
      // Member activity
      OPTIONAL MATCH (w)<-[:MEMBER_OF]-(u:User)
      
      RETURN {
        suites: {
          total: totalSuites,
          active: activeSuites,
          healthScore: CASE WHEN totalSuites > 0 THEN toFloat(activeSuites) / totalSuites ELSE 0 END
        },
        initiatives: {
          total: totalInitiatives,
          completed: completedInitiatives,
          overdue: overdueInitiatives,
          healthScore: CASE WHEN totalInitiatives > 0 
                      THEN (toFloat(completedInitiatives) / totalInitiatives) - (toFloat(overdueInitiatives) / totalInitiatives * 0.5)
                      ELSE 0 END
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          overdue: overdueTasks,
          unassigned: unassignedTasks,
          healthScore: CASE WHEN totalTasks > 0
                      THEN (toFloat(completedTasks) / totalTasks) - (toFloat(overdueTasks + unassignedTasks) / totalTasks * 0.3)
                      ELSE 0 END
        },
        members: count(u),
        lastUpdated: datetime()
      } as healthMetrics
    `;
    
    return runSingleQuery(query, { workspaceId });
  }

  // ================================
  // SEARCH AND ANALYTICS
  // ================================
  
  /**
   * Full-text search across workspace content
   * Uses text indexes where available
   */
  static async searchWorkspaceContent(workspaceId: string, searchTerm: string, limit: number = 20) {
    const query = `
      MATCH (w:Workspace {id: $workspaceId})
      
      // Search in initiatives
      OPTIONAL MATCH (w)-[:CONTAINS]->(s:Suite)-[:HAS]->(i:Initiative)
      WHERE i.name CONTAINS $searchTerm OR i.description CONTAINS $searchTerm
      
      // Search in tasks  
      OPTIONAL MATCH (w)-[:CONTAINS]->(s2:Suite)-[:HAS]->(i2:Initiative)-[:HAS]->(t:Task)
      WHERE t.name CONTAINS $searchTerm OR t.description CONTAINS $searchTerm
      
      WITH collect(DISTINCT {
        type: 'initiative',
        id: i.id,
        name: i.name,
        description: i.description,
        suite: s.name,
        relevance: CASE 
          WHEN i.name CONTAINS $searchTerm THEN 2 
          ELSE 1 
        END
      }) as initiativeResults,
      collect(DISTINCT {
        type: 'task',
        id: t.id,
        name: t.name,
        description: t.description,
        initiative: i2.name,
        suite: s2.name,
        relevance: CASE 
          WHEN t.name CONTAINS $searchTerm THEN 2 
          ELSE 1 
        END
      }) as taskResults
      
      WITH initiativeResults + taskResults as allResults
      UNWIND allResults as result
      WHERE result.id IS NOT NULL
      
      RETURN result
      ORDER BY result.relevance DESC, result.name ASC
      LIMIT $limit
    `;
    
    return runQuery(query, { workspaceId, searchTerm, limit });
  }
}

/**
 * Database maintenance and optimization utilities
 */
export class Neo4jMaintenanceService {
  
  /**
   * Analyze query performance and suggest optimizations
   */
  static async analyzeQueryPerformance(query: string, params: any = {}) {
    const profileQuery = `PROFILE ${query}`;
    
    try {
      const result = await runQuery(profileQuery, params);
      
      // Extract performance metrics from Neo4j profile
      return {
        executionTime: 0, // Would be extracted from Neo4j profile
        dbHits: 0,
        indexesUsed: [],
        suggestions: []
      };
    } catch (error) {
      console.error('Query performance analysis failed:', error);
      throw error;
    }
  }
  
  /**
   * Check index usage and suggest new indexes
   */
  static async suggestIndexOptimizations(workspaceId: string) {
    const query = `
      MATCH (w:Workspace {id: $workspaceId})
      CALL db.schema.nodeTypeProperties() YIELD nodeType, propertyName, propertyTypes
      WHERE nodeType IN ['Task', 'Initiative', 'Suite', 'User']
      RETURN nodeType, propertyName, propertyTypes
    `;
    
    const result = await runQuery(query, { workspaceId });
    
    // Analyze common query patterns and suggest indexes
    return {
      existingIndexes: [],
      suggestedIndexes: [
        'CREATE INDEX task_composite_idx IF NOT EXISTS FOR (t:Task) ON (t.initiativeId, t.status, t.priority)',
        'CREATE INDEX initiative_date_idx IF NOT EXISTS FOR (i:Initiative) ON (i.endDate, i.status)',
        'CREATE INDEX user_workspace_idx IF NOT EXISTS FOR ()-[r:MEMBER_OF]-() ON (r.workspaceId, r.role)'
      ]
    };
  }
}