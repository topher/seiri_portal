// Tool System Schema Extension
// Implements stateless, deterministic tools vs stateful agents

// ================================
// 1. TOOL DEFINITIONS
// ================================

// Tool nodes - stateless, deterministic functions
CREATE CONSTRAINT tool_unique IF NOT EXISTS 
ON (t:Tool) ASSERT t.id IS UNIQUE;

CREATE INDEX tool_category_idx IF NOT EXISTS
FOR (t:Tool) ON (t.category);

CREATE INDEX tool_operation_idx IF NOT EXISTS
FOR (t:Tool) ON (t.operation);

// Core Tool Types
CREATE (json_validator:Tool {
  id: "tool_json_validator",
  name: "JSON Validator",
  operation: "validateJSON",
  category: "validation",
  version: "1.0.0",
  
  // Execution metadata
  runtime: "javascript",
  endpoint: "/api/tools/json-validator",
  stateless: true,
  deterministic: true,
  
  // Schema definitions (simplified)
  inputSchema: "{ json: string }",
  outputSchema: "{ valid: boolean, errors?: array }",
  
  // Performance characteristics
  avgExecutionTime: 45,
  successRate: 0.99,
  costPerExecution: 0.0001,
  
  createdAt: datetime(),
  updatedAt: datetime()
});

CREATE (sql_builder:Tool {
  id: "tool_sql_builder",
  name: "SQL Query Builder",
  operation: "buildQuery",
  category: "database",
  version: "1.0.0",
  
  runtime: "javascript",
  endpoint: "/api/tools/sql-builder",
  stateless: true,
  deterministic: true,
  
  inputSchema: "{ table: string, conditions: object, fields?: array }",
  outputSchema: "{ query: string, params: array }",
  
  avgExecutionTime: 20,
  successRate: 0.98,
  costPerExecution: 0.0001,
  
  createdAt: datetime(),
  updatedAt: datetime()
});

CREATE (text_formatter:Tool {
  id: "tool_text_formatter",
  name: "Text Formatter",
  operation: "formatText",
  category: "text_processing",
  version: "1.0.0",
  
  runtime: "javascript",
  endpoint: "/api/tools/text-formatter",
  stateless: true,
  deterministic: true,
  
  inputSchema: "{ text: string, format: string, options?: object }",
  outputSchema: "{ formatted: string, metadata: object }",
  
  avgExecutionTime: 15,
  successRate: 0.999,
  costPerExecution: 0.00005,
  
  createdAt: datetime(),
  updatedAt: datetime()
});

CREATE (api_caller:Tool {
  id: "tool_api_caller",
  name: "HTTP API Caller",
  operation: "callAPI",
  category: "integration",
  version: "1.0.0",
  
  runtime: "javascript",
  endpoint: "/api/tools/api-caller",
  stateless: true,
  deterministic: false, // External APIs may return different results
  
  inputSchema: "{ url: string, method: string, headers?: object, body?: any }",
  outputSchema: "{ status: number, data: any, headers: object }",
  
  avgExecutionTime: 500,
  successRate: 0.95,
  costPerExecution: 0.001,
  
  createdAt: datetime(),
  updatedAt: datetime()
});

CREATE (dependency_analyzer:Tool {
  id: "tool_dependency_analyzer",
  name: "Task Dependency Analyzer",
  operation: "analyzeDependencies",
  category: "analysis",
  version: "1.0.0",
  
  runtime: "python",
  endpoint: "/api/tools/dependency-analyzer",
  stateless: true,
  deterministic: true,
  
  inputSchema: "{ tasks: array, context: object }",
  outputSchema: "{ dependencies: array, critical_path: array, risks: array }",
  
  avgExecutionTime: 200,
  successRate: 0.92,
  costPerExecution: 0.002,
  
  createdAt: datetime(),
  updatedAt: datetime()
});

// ================================
// 2. RESOURCE DEFINITIONS
// ================================

// Resource nodes - data sources that agents/tools can access
CREATE CONSTRAINT resource_unique IF NOT EXISTS 
ON (r:Resource) ASSERT r.id IS UNIQUE;

CREATE INDEX resource_type_idx IF NOT EXISTS
FOR (r:Resource) ON (r.type);

CREATE (team_velocity_resource:Resource {
  id: "resource_team_velocity",
  name: "Team Velocity History",
  type: "database",
  
  accessMethod: "graphql",
  endpoint: "query { teamMetrics(timeRange: $range) { velocity } }",
  
  lastUpdated: datetime(),
  updateFrequency: "daily",
  qualityScore: 0.95,
  
  createdAt: datetime()
});

CREATE (task_patterns_resource:Resource {
  id: "resource_task_patterns",
  name: "Historical Task Patterns",
  type: "vector_store",
  
  accessMethod: "vector_search",
  endpoint: "neo4j://vectors/task_patterns",
  
  lastUpdated: datetime(),
  updateFrequency: "hourly",
  qualityScore: 0.88,
  
  createdAt: datetime()
});

CREATE (industry_standards_resource:Resource {
  id: "resource_industry_standards",
  name: "Industry Standards Database",
  type: "knowledge_base",
  
  accessMethod: "graphql",
  endpoint: "query { industryStandards(domain: $domain) }",
  
  lastUpdated: datetime(),
  updateFrequency: "weekly",
  qualityScore: 0.97,
  
  createdAt: datetime()
});

// ================================
// 3. AGENT-TOOL RELATIONSHIPS
// ================================

// Agents USE tools (many-to-many)
// Tools are stateless - same tool can be used by multiple agents simultaneously

// Example: Task Breakdown Agent uses multiple tools
MATCH (agent:AgentTemplate {id: "task-breakdown-agent-template"})
MATCH (dep_tool:Tool {id: "tool_dependency_analyzer"})
MATCH (format_tool:Tool {id: "tool_text_formatter"})
MATCH (json_tool:Tool {id: "tool_json_validator"})

CREATE (agent)-[:USES_TOOL {
  purpose: "Analyze task dependencies",
  frequency: "per_execution",
  fallbackBehavior: "manual_analysis"
}]->(dep_tool)

CREATE (agent)-[:USES_TOOL {
  purpose: "Format task descriptions",
  frequency: "per_execution", 
  fallbackBehavior: "skip"
}]->(format_tool)

CREATE (agent)-[:USES_TOOL {
  purpose: "Validate output format",
  frequency: "per_execution",
  fallbackBehavior: "skip_validation"
}]->(json_tool);

// ================================
// 4. AGENT-RESOURCE RELATIONSHIPS
// ================================

// Agents CONSUME resources for context and data
MATCH (agent:AgentTemplate {id: "task-breakdown-agent-template"})
MATCH (velocity_resource:Resource {id: "resource_team_velocity"})
MATCH (patterns_resource:Resource {id: "resource_task_patterns"})

CREATE (agent)-[:CONSUMES_RESOURCE {
  accessPattern: "on_demand",
  cacheStrategy: "ttl_300",
  usage: "reference"
}]->(velocity_resource)

CREATE (agent)-[:CONSUMES_RESOURCE {
  accessPattern: "on_demand",
  cacheStrategy: "ttl_1800",
  usage: "reference"
}]->(patterns_resource);

// ================================
// 5. TOOL PERFORMANCE TRACKING
// ================================

// Tool Usage Log nodes
CREATE CONSTRAINT tool_usage_unique IF NOT EXISTS 
ON (tu:ToolUsage) ASSERT tu.id IS UNIQUE;

CREATE INDEX tool_usage_tool_idx IF NOT EXISTS
FOR (tu:ToolUsage) ON (tu.toolId);

CREATE INDEX tool_usage_timestamp_idx IF NOT EXISTS
FOR (tu:ToolUsage) ON (tu.timestamp);

// Resource Access Log nodes
CREATE CONSTRAINT resource_access_unique IF NOT EXISTS 
ON (ra:ResourceAccess) ASSERT ra.id IS UNIQUE;

CREATE INDEX resource_access_resource_idx IF NOT EXISTS
FOR (ra:ResourceAccess) ON (ra.resourceId);

CREATE INDEX resource_access_timestamp_idx IF NOT EXISTS
FOR (ra:ResourceAccess) ON (ra.timestamp);

// ================================
// 6. AGENT LIFECYCLE STAGES
// ================================

// Agent Lifecycle nodes
CREATE CONSTRAINT lifecycle_stage_unique IF NOT EXISTS 
ON (ls:LifecycleStage) ASSERT ls.id IS UNIQUE;

CREATE INDEX lifecycle_stage_name_idx IF NOT EXISTS
FOR (ls:LifecycleStage) ON (ls.name);

// Define lifecycle stages
CREATE (template_stage:LifecycleStage {
  id: "stage_template",
  name: "template",
  description: "Pre-instantiation template state",
  allowedTransitions: ["initializing"]
});

CREATE (initializing_stage:LifecycleStage {
  id: "stage_initializing", 
  name: "initializing",
  description: "Being created and configured",
  allowedTransitions: ["learning", "active"]
});

CREATE (learning_stage:LifecycleStage {
  id: "stage_learning",
  name: "learning",
  description: "Initial training and setup",
  allowedTransitions: ["active", "paused"]
});

CREATE (active_stage:LifecycleStage {
  id: "stage_active",
  name: "active",
  description: "Fully operational",
  allowedTransitions: ["improving", "paused", "deprecated"]
});

CREATE (improving_stage:LifecycleStage {
  id: "stage_improving",
  name: "improving", 
  description: "Kaizen improvement cycle",
  allowedTransitions: ["active", "paused"]
});

CREATE (paused_stage:LifecycleStage {
  id: "stage_paused",
  name: "paused",
  description: "Temporarily disabled",
  allowedTransitions: ["active", "deprecated"]
});

CREATE (deprecated_stage:LifecycleStage {
  id: "stage_deprecated",
  name: "deprecated",
  description: "Being phased out",
  allowedTransitions: ["archived"]
});

CREATE (archived_stage:LifecycleStage {
  id: "stage_archived",
  name: "archived",
  description: "Historical record only",
  allowedTransitions: []
});

// ================================
// 7. SIMPLIFIED VALIDATION CONSTRAINTS
// ================================

// Ensure tools are stateless (enforced in application)
// Ensure agents have valid lifecycle stages
// Ensure tool usage patterns are recorded

// ================================
// 8. QUERIES FOR TOOL/AGENT MANAGEMENT
// ================================

// Find tools by capability
// MATCH (t:Tool {category: $category})
// WHERE t.successRate > $minSuccessRate
// RETURN t ORDER BY t.successRate DESC

// Find agents using specific tools
// MATCH (a:Agent)-[:USES_TOOL]->(t:Tool {id: $toolId})
// RETURN a, count(*) as usage_count

// Get tool performance metrics
// MATCH (t:Tool {id: $toolId})<-[:USED_TOOL]-(tu:ToolUsage)
// WHERE datetime(tu.timestamp) >= datetime($since)
// RETURN 
//   avg(tu.executionTime) as avgTime,
//   count(tu) as totalUses,
//   sum(CASE WHEN tu.success THEN 1 ELSE 0 END) as successCount

// Get agent lifecycle history
// MATCH (a:Agent {id: $agentId})-[:TRANSITIONED_TO]->(ls:LifecycleStage)
// RETURN ls.name, ls.timestamp
// ORDER BY ls.timestamp DESC

// ================================
// 9. TOOL REGISTRY INITIALIZATION
// ================================

// Create tool categories for organization
CREATE (validation_category:ToolCategory {
  id: "category_validation",
  name: "Validation Tools",
  description: "Tools for validating data and formats"
});

CREATE (database_category:ToolCategory {
  id: "category_database", 
  name: "Database Tools",
  description: "Tools for database operations"
});

CREATE (text_category:ToolCategory {
  id: "category_text_processing",
  name: "Text Processing Tools", 
  description: "Tools for text manipulation and formatting"
});

CREATE (integration_category:ToolCategory {
  id: "category_integration",
  name: "Integration Tools",
  description: "Tools for external system integration"
});

CREATE (analysis_category:ToolCategory {
  id: "category_analysis",
  name: "Analysis Tools",
  description: "Tools for data analysis and insights"
});

// Link tools to categories
MATCH (t:Tool), (c:ToolCategory)
WHERE t.category = c.name OR t.category = split(c.id, '_')[1]
CREATE (t)-[:BELONGS_TO]->(c);

// ================================
// VALIDATION QUERIES
// ================================

// Verify all tools have required properties
// MATCH (t:Tool)
// WHERE NOT EXISTS(t.stateless) OR NOT EXISTS(t.operation)
// RETURN t.id, t.name

// Verify all agents have lifecycle stages
// MATCH (a:Agent)
// WHERE NOT EXISTS(a.lifecycleStage)
// RETURN a.id, a.name

// Verify tool-agent relationships are valid
// MATCH (a:Agent)-[r:USES_TOOL]->(t:Tool)
// WHERE NOT EXISTS(r.purpose)
// RETURN a.id, t.id, r