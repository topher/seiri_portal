import { gql } from '@apollo/client';

// Agent Operation Subscriptions
export const AGENT_OPERATION_PROGRESS = gql`
  subscription AgentOperationProgress($operationId: ID!) {
    agentOperationProgress(operationId: $operationId) {
      operationId
      agentId
      status
      progress
      stage
      message
      result
      error
      timestamp
    }
  }
`;

export const AGENT_OPERATION_COMPLETED = gql`
  subscription AgentOperationCompleted($agentId: ID) {
    agentOperationCompleted(agentId: $agentId) {
      operationId
      agentId
      operationType
      result
      status
      duration
      error
      completedAt
    }
  }
`;

// Workspace Subscriptions
export const WORKSPACE_INSIGHTS_UPDATED = gql`
  subscription WorkspaceInsightsUpdated($workspaceId: ID!) {
    workspaceInsightsUpdated(workspaceId: $workspaceId) {
      workspaceId
      insights {
        overallHealth
        keyMetrics {
          name
          value
          trend
          changePercent
        }
        trends {
          category
          direction
          confidence
          description
        }
        recommendations {
          type
          priority
          title
          description
        }
        generatedAt
      }
      operationId
    }
  }
`;

export const WORKSPACE_OPTIMIZATION_UPDATED = gql`
  subscription WorkspaceOptimizationUpdated($workspaceId: ID!) {
    workspaceOptimizationUpdated(workspaceId: $workspaceId) {
      workspaceId
      optimization {
        quickWins {
          title
          description
          effort
          impact
        }
        longTermImprovements {
          title
          description
          effort
          impact
          timeline
        }
        processOptimizations {
          process
          currentState
          recommendedState
          benefits
        }
        generatedAt
      }
      operationId
    }
  }
`;

export const WORKSPACE_HEALTH_UPDATED = gql`
  subscription WorkspaceHealthUpdated($workspaceId: ID!) {
    workspaceHealthUpdated(workspaceId: $workspaceId) {
      workspaceId
      healthCheck {
        overallScore
        dimensions {
          name
          score
          weight
        }
        criticalIssues {
          severity
          category
          title
          description
        }
        recommendations {
          priority
          category
          title
          description
        }
        checkedAt
      }
      operationId
    }
  }
`;

// Task Subscriptions
export const TASK_BREAKDOWN_UPDATED = gql`
  subscription TaskBreakdownUpdated($taskId: ID!) {
    taskBreakdownUpdated(taskId: $taskId) {
      taskId
      breakdown {
        subtasks {
          title
          description
          estimatedHours
          priority
          complexity
        }
        complexity
        estimatedHours
        dependencies {
          type
          description
          blocking
        }
        risks {
          type
          description
          probability
          impact
        }
        generatedAt
      }
      operationId
    }
  }
`;

export const TASK_ESTIMATION_UPDATED = gql`
  subscription TaskEstimationUpdated($taskId: ID!) {
    taskEstimationUpdated(taskId: $taskId) {
      taskId
      estimation {
        optimisticHours
        realisticHours
        pessimisticHours
        confidence
        factors {
          name
          impact
          description
        }
        assumptions
        risks {
          description
          impact
        }
        generatedAt
      }
      operationId
    }
  }
`;

export const TASK_PROGRESS_UPDATED = gql`
  subscription TaskProgressUpdated($taskId: ID!) {
    taskProgressUpdated(taskId: $taskId) {
      taskId
      progressUpdate {
        progress
        status
        completedSubtasks
        currentPhase
        blockers {
          description
          type
          severity
        }
        estimatedCompletion
        notes
        updatedAt
      }
      operationId
    }
  }
`;

export const TASK_SUBTASKS_GENERATED = gql`
  subscription TaskSubtasksGenerated($taskId: ID!) {
    taskSubtasksGenerated(taskId: $taskId) {
      taskId
      subtasks {
        id
        title
        description
        estimatedHours
        priority
        dependencies
        createdAt
      }
      operationId
    }
  }
`;

// Agent Registry Subscriptions
export const AGENT_STATUS_CHANGED = gql`
  subscription AgentStatusChanged($agentId: ID) {
    agentStatusChanged(agentId: $agentId) {
      agentId
      name
      type
      status
      health
      enabled
      timestamp
    }
  }
`;

export const AGENT_HEALTH_CHECK_COMPLETED = gql`
  subscription AgentHealthCheckCompleted {
    agentHealthCheckCompleted {
      agents {
        name
        type
        health
        enabled
        lastCheck
      }
      summary {
        totalAgents
        healthyAgents
        enabledAgents
        averageHealth
      }
      timestamp
    }
  }
`;

// System-wide Subscriptions
export const AGENT_ANALYTICS_UPDATED = gql`
  subscription AgentAnalyticsUpdated($agentId: ID) {
    agentAnalyticsUpdated(agentId: $agentId) {
      agentId
      analytics {
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
      timestamp
    }
  }
`;

export const OPERATION_QUEUE_UPDATED = gql`
  subscription OperationQueueUpdated {
    operationQueueUpdated {
      queueLength
      processingOperations
      averageWaitTime
      recentOperations {
        operationId
        agentId
        operationType
        status
        queuedAt
        startedAt
      }
      timestamp
    }
  }
`;