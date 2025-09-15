import { gql } from '@apollo/client';

// Agent Discovery Queries
export const DISCOVER_AGENTS = gql`
  query DiscoverAgents($capabilities: [String!], $enabled: Boolean) {
    discoverAgents(capabilities: $capabilities, enabled: $enabled) {
      id
      name
      type
      version
      capabilities
      enabled
      health
      priority
      config
      createdAt
      updatedAt
    }
  }
`;

export const GET_AGENT_ANALYTICS = gql`
  query GetAgentAnalytics($agentId: String, $timeRange: TimeRange) {
    getAgentAnalytics(agentId: $agentId, timeRange: $timeRange) {
      totalOperations
      successfulOperations
      failedOperations
      averageResponseTime
      operationsByType {
        type
        count
        averageTime
      }
      recentErrors {
        message
        timestamp
        operation
      }
    }
  }
`;

export const GET_AGENT_OPERATION_HISTORY = gql`
  query GetAgentOperationHistory($agentId: String, $limit: Int, $offset: Int) {
    getAgentOperationHistory(agentId: $agentId, limit: $limit, offset: $offset) {
      operations {
        id
        operationId
        agentId
        operationType
        input
        result
        status
        duration
        error
        createdAt
      }
      total
      hasMore
    }
  }
`;

// Workspace Queries
export const GET_WORKSPACE = gql`
  query GetWorkspace($id: ID!) {
    workspace(id: $id) {
      id
      name
      description
      ownerId
      createdAt
      updatedAt
      suites {
        id
        name
        description
        status
        priority
        createdAt
        updatedAt
      }
      tasks {
        id
        title
        description
        status
        priority
        assigneeId
        createdAt
        updatedAt
      }
    }
  }
`;

// Task Queries
export const GET_TASK = gql`
  query GetTask($id: ID!) {
    task(id: $id) {
      id
      title
      description
      status
      priority
      assigneeId
      workspaceId
      suiteId
      initiativeId
      createdAt
      updatedAt
      acceptanceCriteria {
        id
        description
        completed
        createdAt
        updatedAt
      }
      subtasks {
        id
        title
        description
        status
        priority
        createdAt
        updatedAt
      }
    }
  }
`;

// User Queries
export const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
      avatarUrl
      createdAt
      updatedAt
    }
  }
`;

// Suite Queries
export const GET_SUITE = gql`
  query GetSuite($id: ID!) {
    suite(id: $id) {
      id
      name
      description
      status
      priority
      workspaceId
      createdAt
      updatedAt
      initiatives {
        id
        title
        description
        status
        priority
        createdAt
        updatedAt
      }
    }
  }
`;

// Initiative Queries
export const GET_INITIATIVE = gql`
  query GetInitiative($id: ID!) {
    initiative(id: $id) {
      id
      title
      description
      status
      priority
      suiteId
      workspaceId
      createdAt
      updatedAt
      tasks {
        id
        title
        description
        status
        priority
        assigneeId
        createdAt
        updatedAt
      }
    }
  }
`;

// Agent Status Query
export const GET_AGENT_STATUS = gql`
  query GetAgentStatus {
    getAgentStatus {
      totalAgents
      enabledAgents
      healthyAgents
      agents {
        name
        type
        enabled
        health
        priority
      }
      llmStatus {
        openai {
          available
          model
          lastCheck
        }
        anthropic {
          available
          model
          lastCheck
        }
      }
      cacheStatus {
        redisAvailable
        stats {
          hits
          misses
          hitRate
          memoryUsage
        }
      }
    }
  }
`;

// Health Check Query
export const PERFORM_AGENT_HEALTH_CHECK = gql`
  query PerformAgentHealthCheck {
    performAgentHealthCheck {
      name
      type
      health
      enabled
    }
  }
`;