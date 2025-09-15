// Seiri AI Studio - Agent Mesh Schema Extension
// Extends existing Neo4j schema with distributed intelligence platform capabilities

// ================================
// 1. AGENT TEMPLATE SYSTEM
// ================================

// Agent Template nodes - reusable agent definitions
CREATE CONSTRAINT agent_template_unique IF NOT EXISTS 
ON (at:AgentTemplate) ASSERT at.id IS UNIQUE;

CREATE INDEX agent_template_category_idx IF NOT EXISTS
FOR (at:AgentTemplate) ON (at.category);

CREATE INDEX agent_template_version_idx IF NOT EXISTS
FOR (at:AgentTemplate) ON (at.version);

// Example Agent Templates
// Strategic Layer Templates
CREATE (workspace_orchestrator_template:AgentTemplate {
  id: "workspace-orchestrator-template",
  category: "orchestrator",
  version: "1.0.0",
  name: "Workspace Orchestrator",
  description: "Coordinates all agents within a workspace",
  capabilities: ["coordinate_suites", "manage_initiatives", "resource_allocation"],
  requiredResources: ["high_memory", "persistent_storage"],
  createdAt: datetime(),
  updatedAt: datetime()
});

CREATE (suite_orchestrator_template:AgentTemplate {
  id: "suite-orchestrator-template",
  category: "orchestrator",
  version: "1.0.0",
  name: "Suite Orchestrator",
  description: "Manages all activities within a specific suite",
  capabilities: ["manage_suite_tasks", "coordinate_with_other_suites", "domain_expertise"],
  requiredResources: ["medium_memory", "domain_knowledge"],
  createdAt: datetime(),
  updatedAt: datetime()
});

// Tactical Layer Templates
CREATE (initiative_orchestrator_template:AgentTemplate {
  id: "initiative-orchestrator-template",
  category: "orchestrator",
  version: "1.0.0",
  name: "Initiative Orchestrator",
  description: "Manages initiative lifecycle and cross-suite coordination",
  capabilities: ["initiative_planning", "cross_suite_coordination", "progress_tracking"],
  requiredResources: ["medium_memory", "analytics_access"],
  createdAt: datetime(),
  updatedAt: datetime()
});

CREATE (task_agent_template:AgentTemplate {
  id: "task-agent-template",
  category: "executor",
  version: "1.0.0",
  name: "Task Agent",
  description: "Executes specific tasks within suite context",
  capabilities: ["task_execution", "quality_validation", "progress_reporting"],
  requiredResources: ["low_memory", "task_tools"],
  createdAt: datetime(),
  updatedAt: datetime()
});

// ================================
// 2. AGENT CAPABILITY SYSTEM
// ================================

// Capability nodes - graph-based capability representation
CREATE CONSTRAINT capability_unique IF NOT EXISTS 
ON (c:Capability) ASSERT c.id IS UNIQUE;

CREATE INDEX capability_domain_idx IF NOT EXISTS
FOR (c:Capability) ON (c.domain);

CREATE INDEX capability_type_idx IF NOT EXISTS
FOR (c:Capability) ON (c.type);

// Core Capabilities
CREATE (coord_capability:Capability {
  id: "coordination",
  name: "Coordination",
  description: "Ability to coordinate multiple agents or processes",
  domain: "orchestration",
  type: "meta",
  requiredInputs: ["agent_list", "coordination_pattern"],
  outputSchema: "CoordinationPlan",
  createdAt: datetime()
});

CREATE (analysis_capability:Capability {
  id: "analysis",
  name: "Analysis",
  description: "Ability to analyze data and generate insights",
  domain: "intelligence",
  type: "cognitive",
  requiredInputs: ["data_source", "analysis_type"],
  outputSchema: "AnalysisResult",
  createdAt: datetime()
});

CREATE (execution_capability:Capability {
  id: "execution",
  name: "Execution",
  description: "Ability to execute tasks and operations",
  domain: "operations",
  type: "operational",
  requiredInputs: ["task_definition", "execution_context"],
  outputSchema: "ExecutionResult",
  createdAt: datetime()
});

// ================================
// 3. ONTOLOGY INTEGRATION
// ================================

// Ontology Class nodes - domain knowledge representation
CREATE CONSTRAINT ontology_class_unique IF NOT EXISTS 
ON (oc:OntologyClass) ASSERT oc.id IS UNIQUE;

CREATE INDEX ontology_class_domain_idx IF NOT EXISTS
FOR (oc:OntologyClass) ON (oc.domain);

// Core Ontology Classes
CREATE (workspace_ontology:OntologyClass {
  id: "workspace_ontology",
  name: "Workspace",
  description: "Workspace domain knowledge and patterns",
  domain: "workspace_management",
  properties: ["structure", "governance", "metrics"],
  validationRules: ["min_suites:6", "max_suites:6", "required_roles:defined"],
  createdAt: datetime()
});

CREATE (initiative_ontology:OntologyClass {
  id: "initiative_ontology",
  name: "Initiative",
  description: "Initiative domain knowledge and patterns",
  domain: "initiative_management",
  properties: ["lifecycle", "raci_matrix", "value_tracking"],
  validationRules: ["single_accountable:true", "min_responsible:1", "value_defined:true"],
  createdAt: datetime()
});

// ================================
// 4. AGENT INSTANCE SYSTEM
// ================================

// Enhanced Agent constraints (extending existing)
CREATE INDEX agent_template_idx IF NOT EXISTS
FOR (a:Agent) ON (a.templateId);

CREATE INDEX agent_workspace_idx IF NOT EXISTS
FOR (a:Agent) ON (a.workspaceId);

CREATE INDEX agent_subgraph_idx IF NOT EXISTS
FOR (a:Agent) ON (a.subgraphId);

// ================================
// 5. AGENT SUBGRAPH OWNERSHIP
// ================================

// Agent Subgraph nodes - define agent ownership boundaries
CREATE CONSTRAINT agent_subgraph_unique IF NOT EXISTS 
ON (asg:AgentSubgraph) ASSERT asg.id IS UNIQUE;

CREATE INDEX agent_subgraph_agent_idx IF NOT EXISTS
FOR (asg:AgentSubgraph) ON (asg.agentId);

// ================================
// 6. AGENT COMMUNICATION PROTOCOLS
// ================================

// Communication Protocol nodes
CREATE CONSTRAINT protocol_unique IF NOT EXISTS 
ON (p:Protocol) ASSERT p.id IS UNIQUE;

CREATE INDEX protocol_type_idx IF NOT EXISTS
FOR (p:Protocol) ON (p.type);

// Message nodes for agent communication
CREATE CONSTRAINT message_unique IF NOT EXISTS 
ON (m:Message) ASSERT m.id IS UNIQUE;

CREATE INDEX message_timestamp_idx IF NOT EXISTS
FOR (m:Message) ON (m.timestamp);

CREATE INDEX message_from_agent_idx IF NOT EXISTS
FOR (m:Message) ON (m.fromAgentId);

CREATE INDEX message_to_agent_idx IF NOT EXISTS
FOR (m:Message) ON (m.toAgentId);

// ================================
// 7. HUMAN-IN-THE-LOOP CHECKPOINTS
// ================================

// Checkpoint nodes for human review points
CREATE CONSTRAINT checkpoint_unique IF NOT EXISTS 
ON (cp:Checkpoint) ASSERT cp.id IS UNIQUE;

CREATE INDEX checkpoint_status_idx IF NOT EXISTS
FOR (cp:Checkpoint) ON (cp.status);

CREATE INDEX checkpoint_agent_idx IF NOT EXISTS
FOR (cp:Checkpoint) ON (cp.agentId);

// ================================
// 8. AGENT COORDINATION PATTERNS
// ================================

// Coordination Pattern nodes
CREATE CONSTRAINT coordination_pattern_unique IF NOT EXISTS 
ON (cpt:CoordinationPattern) ASSERT cpt.id IS UNIQUE;

CREATE INDEX coordination_pattern_type_idx IF NOT EXISTS
FOR (cpt:CoordinationPattern) ON (cpt.type);

// Example Coordination Patterns
CREATE (sequential_pattern:CoordinationPattern {
  id: "sequential_with_review",
  name: "Sequential with Review",
  description: "Agents execute in sequence with human review points",
  type: "sequential",
  stages: ["preparation", "execution", "review", "completion"],
  humanCheckpoints: ["batch_completion", "quality_review"],
  createdAt: datetime()
});

CREATE (parallel_pattern:CoordinationPattern {
  id: "parallel_with_merge",
  name: "Parallel with Merge",
  description: "Agents execute in parallel with result merging",
  type: "parallel",
  stages: ["preparation", "parallel_execution", "merge", "completion"],
  humanCheckpoints: ["merge_approval"],
  createdAt: datetime()
});

// ================================
// 9. RELATIONSHIP DEFINITIONS
// ================================

// Agent Template Relationships
CREATE (workspace_orchestrator_template)-[:HAS_CAPABILITY]->(coord_capability);
CREATE (workspace_orchestrator_template)-[:HAS_CAPABILITY]->(analysis_capability);
CREATE (suite_orchestrator_template)-[:HAS_CAPABILITY]->(coord_capability);
CREATE (suite_orchestrator_template)-[:HAS_CAPABILITY]->(analysis_capability);
CREATE (initiative_orchestrator_template)-[:HAS_CAPABILITY]->(coord_capability);
CREATE (task_agent_template)-[:HAS_CAPABILITY]->(execution_capability);

// Capability to Ontology Relationships
CREATE (coord_capability)-[:VALIDATES_AGAINST]->(workspace_ontology);
CREATE (analysis_capability)-[:VALIDATES_AGAINST]->(initiative_ontology);
CREATE (execution_capability)-[:VALIDATES_AGAINST]->(initiative_ontology);

// ================================
// 10. AGENT MESH INITIALIZATION
// ================================

// Function to create agent mesh for a workspace
// This will be called from application code when workspace is created
// CALL seiri.createAgentMesh($workspaceId)

// ================================
// 11. VALIDATION CONSTRAINTS
// ================================

// Ensure agent instances reference valid templates
// This will be enforced in GraphQL resolvers and application logic

// Ensure agents have required capabilities for their roles
// This will be validated through graph traversal queries

// Ensure subgraph boundaries are maintained
// This will be enforced through Neo4j security rules

// ================================
// 12. PERFORMANCE OPTIMIZATION
// ================================

// Composite indexes for agent mesh queries
CREATE INDEX agent_template_capability_idx IF NOT EXISTS
FOR ()-[r:HAS_CAPABILITY]-() ON (r.agentTemplateId, r.capabilityId);

CREATE INDEX agent_communication_idx IF NOT EXISTS
FOR (m:Message) ON (m.fromAgentId, m.toAgentId, m.timestamp);

CREATE INDEX checkpoint_workflow_idx IF NOT EXISTS
FOR (cp:Checkpoint) ON (cp.workflowId, cp.status, cp.createdAt);

// ================================
// 13. AGENT MESH QUERIES
// ================================

// Query to get all agents in a workspace with their capabilities
// MATCH (w:Workspace {id: $workspaceId})-[:HAS_AGENT]->(a:Agent)
// MATCH (a)-[:INSTANTIATED_FROM]->(at:AgentTemplate)-[:HAS_CAPABILITY]->(c:Capability)
// RETURN a.id, a.status, at.name, collect(c.name) as capabilities

// Query to find agents capable of specific operations
// MATCH (c:Capability {name: $capabilityName})<-[:HAS_CAPABILITY]-(at:AgentTemplate)
// MATCH (at)<-[:INSTANTIATED_FROM]-(a:Agent)
// WHERE a.workspaceId = $workspaceId AND a.status = 'active'
// RETURN a.id, a.type, at.name

// Query to get agent communication history
// MATCH (m:Message)
// WHERE m.fromAgentId = $agentId OR m.toAgentId = $agentId
// RETURN m.id, m.type, m.content, m.timestamp, m.fromAgentId, m.toAgentId
// ORDER BY m.timestamp DESC

// ================================
// 14. AGENT LIFECYCLE MANAGEMENT
// ================================

// Agent Health Tracking
CREATE CONSTRAINT agent_health_unique IF NOT EXISTS 
ON (ah:AgentHealth) ASSERT ah.id IS UNIQUE;

CREATE INDEX agent_health_agent_idx IF NOT EXISTS
FOR (ah:AgentHealth) ON (ah.agentId);

CREATE INDEX agent_health_timestamp_idx IF NOT EXISTS
FOR (ah:AgentHealth) ON (ah.timestamp);

// Agent Performance Metrics
CREATE CONSTRAINT agent_metrics_unique IF NOT EXISTS 
ON (am:AgentMetrics) ASSERT am.id IS UNIQUE;

CREATE INDEX agent_metrics_agent_idx IF NOT EXISTS
FOR (am:AgentMetrics) ON (am.agentId);

CREATE INDEX agent_metrics_date_idx IF NOT EXISTS
FOR (am:AgentMetrics) ON (am.date);

// ================================
// SCHEMA VALIDATION QUERIES
// ================================

// Verify all agent templates have required capabilities
// MATCH (at:AgentTemplate)
// WHERE NOT EXISTS((at)-[:HAS_CAPABILITY]->(:Capability))
// RETURN at.id, at.name

// Verify all active agents have valid templates
// MATCH (a:Agent {status: 'active'})
// WHERE NOT EXISTS((a)-[:INSTANTIATED_FROM]->(:AgentTemplate))
// RETURN a.id, a.type, a.workspaceId

// Verify agent subgraph ownership
// MATCH (a:Agent)-[:OWNS_SUBGRAPH]->(asg:AgentSubgraph)
// WHERE NOT EXISTS((asg)-[:CONTAINS_NODE]->())
// RETURN a.id, asg.id as empty_subgraph