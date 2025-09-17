// GraphQL Response Types for Seiri Portal

// Base Types
export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: Record<string, any>;
}

export interface BaseOperationResponse {
  success: boolean;
  operationId?: string;
  error?: string | null;
}

// Agent Types
export interface Agent {
  id: string;
  name: string;
  type: string;
  version?: string;
  capabilities: string[];
  enabled: boolean;
  health: string;
  priority: number;
  config?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentAnalytics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  operationsByType: Array<{
    type: string;
    count: number;
    averageTime: number;
  }>;
  recentErrors: Array<{
    message: string;
    timestamp: string;
    operation: string;
  }>;
}

export interface AgentOperation {
  id: string;
  operationId: string;
  agentId: string;
  operationType: string;
  input: any;
  result: any;
  status: string;
  duration: number;
  error?: string;
  createdAt: string;
}

export interface AgentOperationHistory {
  operations: AgentOperation[];
  total: number;
  hasMore: boolean;
}

// Task Types
export interface TaskBreakdown {
  taskId: string;
  subtasks: Array<{
    title: string;
    description: string;
    estimatedHours: number;
    priority: string;
    dependencies: string[];
    skills: string[];
    complexity: string;
  }>;
  complexity: string;
  estimatedHours: number;
  dependencies: Array<{
    type: string;
    description: string;
    blocking: boolean;
    external: boolean;
  }>;
  risks: Array<{
    type: string;
    description: string;
    probability: number;
    impact: string;
    mitigation: string;
  }>;
  generatedAt: string;
}

export interface TaskEstimation {
  taskId: string;
  optimisticHours: number;
  realisticHours: number;
  pessimisticHours: number;
  confidence: number;
  factors: Array<{
    name: string;
    impact: string;
    description: string;
  }>;
  assumptions: string[];
  risks: Array<{
    description: string;
    impact: string;
    mitigation: string;
  }>;
  generatedAt: string;
}

export interface TaskProgressUpdate {
  taskId: string;
  progress: number;
  status: string;
  completedSubtasks: number;
  currentPhase: string;
  blockers: Array<{
    description: string;
    type: string;
    severity: string;
    owner: string;
    estimatedResolution: string;
  }>;
  estimatedCompletion: string;
  notes: string;
  updatedAt: string;
}

// Workspace Types
export interface WorkspaceInsights {
  workspaceId: string;
  overallHealth: string;
  keyMetrics: Array<{
    name: string;
    value: number;
    trend: string;
    changePercent: number;
    period: string;
  }>;
  trends: Array<{
    category: string;
    direction: string;
    confidence: number;
    description: string;
    impact: string;
    timeframe: string;
  }>;
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    estimatedImpact: string;
    effort: string;
    category: string;
  }>;
  generatedAt: string;
}

// GraphQL Query Response Types
export interface DiscoverAgentsResponse {
  discoverAgents: Agent[];
}

export interface GetAgentAnalyticsResponse {
  getAgentAnalytics: AgentAnalytics;
}

export interface GetAgentOperationHistoryResponse {
  getAgentOperationHistory: AgentOperationHistory;
}

// GraphQL Mutation Response Types
export interface GenerateTaskBreakdownResponse {
  generateTaskBreakdown: BaseOperationResponse & {
    breakdown?: TaskBreakdown;
  };
}

export interface EstimateTaskEffortResponse {
  estimateTaskEffort: BaseOperationResponse & {
    estimation?: TaskEstimation;
  };
}

export interface TrackTaskProgressResponse {
  trackTaskProgress: BaseOperationResponse & {
    progressUpdate?: TaskProgressUpdate;
  };
}

export interface GenerateWorkspaceInsightsResponse {
  generateWorkspaceInsights: BaseOperationResponse & {
    insights?: WorkspaceInsights;
  };
}

export interface ExecuteAgentOperationResponse extends BaseOperationResponse {
  result?: any;
  agentId?: string;
}

// Apollo Client Types
export interface ErrorHandlerOptions {
  graphQLErrors?: readonly GraphQLError[];
  networkError?: Error | null;
  operation?: any;
  forward?: any;
}

// Agent Operation State
export interface AgentOperationState {
  loading: boolean;
  isLoading?: boolean;
  isExecuting?: boolean;
  error: Error | null;
  data: any;
  progress: number;
  stage: string;
  operationId: string | null;
}

// Additional response types for missing operations
export interface AutoGenerateSubtasksResponse {
  autoGenerateSubtasks: BaseOperationResponse & {
    subtasks?: Array<{
      id: string;
      title: string;
      description: string;
      estimatedHours: number;
      priority: string;
      dependencies: string[];
      createdAt: string;
    }>;
  };
}

// Chat Agent specific interface (extends base Agent)
export interface ChatAgent extends Agent {
  isAvailable: boolean;
}

// Agent Discovery variables
export interface DiscoverAgentsVariables {
  capabilities?: string[];
  enabled?: boolean;
}

export interface GetAgentAnalyticsVariables {
  agentId?: string;
  timeRange?: string;
}

export interface GetAgentOperationHistoryVariables {
  agentId?: string;
  limit?: number;
  offset?: number;
}

export interface ExecuteAgentOperationVariables {
  input: {
    agentId: string;
    operationType: string;
    parameters: Record<string, any>;
  };
}

export interface GenerateTaskBreakdownVariables {
  taskId: string;
}

export interface TrackTaskProgressVariables {
  taskId: string;
  input: any;
}

export interface AutoGenerateSubtasksVariables {
  taskId: string;
}

export interface GenerateWorkspaceInsightsVariables {
  workspaceId: string;
}