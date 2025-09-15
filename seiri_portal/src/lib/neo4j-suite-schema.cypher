// Suite-Initiative Architecture Database Schema
// Phase 1: Core Architecture - Neo4j Schema Updates

// ================================
// 1. SUITE CONSTRAINTS & INDEXES
// ================================

// Unique constraints
CREATE CONSTRAINT suite_unique IF NOT EXISTS 
ON (s:Suite) ASSERT s.id IS UNIQUE;

CREATE CONSTRAINT suite_type_workspace_unique IF NOT EXISTS
ON (s:Suite) ASSERT (s.type, s.workspaceId) IS UNIQUE;

// Indexes for performance
CREATE INDEX suite_workspace_idx IF NOT EXISTS
FOR (s:Suite) ON (s.workspaceId);

CREATE INDEX suite_type_idx IF NOT EXISTS
FOR (s:Suite) ON (s.type);

// ================================
// 2. INITIATIVE CONSTRAINTS & INDEXES
// ================================

// Unique constraints
CREATE CONSTRAINT initiative_unique IF NOT EXISTS 
ON (i:Initiative) ASSERT i.id IS UNIQUE;

// Indexes for performance
CREATE INDEX initiative_workspace_idx IF NOT EXISTS
FOR (i:Initiative) ON (i.workspaceId);

CREATE INDEX initiative_status_idx IF NOT EXISTS
FOR (i:Initiative) ON (i.status);

CREATE INDEX initiative_value_idx IF NOT EXISTS
FOR (i:Initiative) ON (i.estimatedValue);

// ================================
// 3. AGENT CONSTRAINTS & INDEXES
// ================================

// Unique constraints for agents
CREATE CONSTRAINT agent_unique IF NOT EXISTS 
ON (a:Agent) ASSERT a.id IS UNIQUE;

// Indexes for agent allocation
CREATE INDEX agent_type_idx IF NOT EXISTS
FOR (a:Agent) ON (a.type);

CREATE INDEX agent_suite_idx IF NOT EXISTS
FOR (a:Agent) ON (a.suiteType);

CREATE INDEX agent_status_idx IF NOT EXISTS
FOR (a:Agent) ON (a.status);

// ================================
// 4. RELATIONSHIP PATTERNS
// ================================

// Workspace-Suite Relationships (Always 6 suites)
// (:Workspace)-[:HAS_SUITE]->(:Suite)

// Workspace-Initiative Relationships
// (:Workspace)-[:HAS_INITIATIVE]->(:Initiative)

// Initiative-Suite RACI Relationships
// (:Initiative)-[:RESPONSIBLE_SUITE]->(:Suite)
// (:Initiative)-[:ACCOUNTABLE_SUITE]->(:Suite) // Always exactly one
// (:Initiative)-[:CONSULTED_SUITE]->(:Suite)
// (:Initiative)-[:INFORMED_SUITE]->(:Suite)

// Initiative-Task Relationships
// (:Initiative)-[:HAS_TASK]->(:Task)

// Suite-Agent Relationships
// (:Suite)-[:HAS_AGENT]->(:Agent)

// Task-Agent Allocation Relationships
// (:Task)-[:REQUIRES_AGENT {role: 'primary'}]->(:Agent)
// (:Task)-[:REQUIRES_AGENT {role: 'supporting'}]->(:Agent)
// (:Task)-[:REQUIRES_AGENT {role: 'reviewer'}]->(:Agent)

// ================================
// 5. VALIDATION CONSTRAINTS
// ================================

// Ensure every workspace has exactly 6 suites
// (This will be enforced in application logic)

// Ensure every initiative has exactly one accountable suite
// (This will be enforced in GraphQL resolvers)

// Ensure suite types are valid
// Valid types: PRODUCT, MARKETING, DEVELOPMENT, OPERATIONS, STRATEGY, SALES

// ================================
// 6. DATA MIGRATION PREPARATION
// ================================

// Create default suites for existing workspaces
MATCH (w:Workspace)
WHERE NOT EXISTS((w)-[:HAS_SUITE]->(:Suite))
WITH w
UNWIND ['PRODUCT', 'MARKETING', 'DEVELOPMENT', 'OPERATIONS', 'STRATEGY', 'SALES'] AS suiteType
CREATE (s:Suite {
  id: randomUUID(),
  type: suiteType,
  workspaceId: w.id,
  name: suiteType + ' Suite',
  description: 'Default ' + suiteType + ' suite for workspace',
  capabilities: [],
  createdAt: datetime(),
  updatedAt: datetime()
})
CREATE (w)-[:HAS_SUITE]->(s);

// ================================
// 7. PERFORMANCE OPTIMIZATION
// ================================

// Composite indexes for common queries
CREATE INDEX workspace_suite_type_idx IF NOT EXISTS
FOR (s:Suite) ON (s.workspaceId, s.type);

CREATE INDEX initiative_raci_idx IF NOT EXISTS
FOR (i:Initiative) ON (i.workspaceId, i.status);

// ================================
// 8. AGENT POOL INITIALIZATION
// ================================

// Create base agent types for each suite (to be populated by application)
// This will be handled in the AgentPoolService implementation

// ================================
// SCHEMA VALIDATION QUERIES
// ================================

// Verify all workspaces have 6 suites
// MATCH (w:Workspace)-[:HAS_SUITE]->(s:Suite)
// WITH w, count(s) as suiteCount
// WHERE suiteCount <> 6
// RETURN w.id, w.name, suiteCount;

// Verify all suite types are present per workspace
// MATCH (w:Workspace)-[:HAS_SUITE]->(s:Suite)
// WITH w, collect(s.type) as suiteTypes
// WHERE size(suiteTypes) <> 6 OR 
//       NOT 'PRODUCT' IN suiteTypes OR 
//       NOT 'MARKETING' IN suiteTypes OR
//       NOT 'DEVELOPMENT' IN suiteTypes OR
//       NOT 'OPERATIONS' IN suiteTypes OR
//       NOT 'STRATEGY' IN suiteTypes OR
//       NOT 'SALES' IN suiteTypes
// RETURN w.id, w.name, suiteTypes;

// Verify RACI matrix completeness for initiatives
// MATCH (i:Initiative)
// OPTIONAL MATCH (i)-[:ACCOUNTABLE_SUITE]->(accountable:Suite)
// OPTIONAL MATCH (i)-[:RESPONSIBLE_SUITE]->(responsible:Suite)
// WHERE accountable IS NULL OR responsible IS NULL
// RETURN i.id, i.name, 
//        CASE WHEN accountable IS NULL THEN 'Missing Accountable' ELSE accountable.type END as accountable_status,
//        count(responsible) as responsible_count;