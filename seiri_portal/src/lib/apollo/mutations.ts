import { gql } from '@apollo/client';

// Workspace Agent Mutations
export const GENERATE_WORKSPACE_INSIGHTS = gql`
  mutation GenerateWorkspaceInsights($workspaceId: ID!) {
    generateWorkspaceInsights(workspaceId: $workspaceId) {
      success
      insights {
        workspaceId
        overallHealth
        keyMetrics {
          name
          value
          trend
          changePercent
          period
        }
        trends {
          category
          direction
          confidence
          description
          impact
          timeframe
        }
        recommendations {
          type
          priority
          title
          description
          estimatedImpact
          effort
          category
        }
        generatedAt
      }
      operationId
      error
    }
  }
`;

export const OPTIMIZE_WORKSPACE = gql`
  mutation OptimizeWorkspace($workspaceId: ID!) {
    optimizeWorkspace(workspaceId: $workspaceId) {
      success
      optimization {
        workspaceId
        quickWins {
          title
          description
          effort
          impact
          category
        }
        longTermImprovements {
          title
          description
          effort
          impact
          timeline
          dependencies
        }
        processOptimizations {
          process
          currentState
          recommendedState
          benefits
          implementationSteps
        }
        resourceOptimizations {
          resource
          currentUsage
          recommendedUsage
          savings
          riskLevel
        }
        generatedAt
      }
      operationId
      error
    }
  }
`;

export const GENERATE_WORKSPACE_STRATEGY = gql`
  mutation GenerateWorkspaceStrategy($workspaceId: ID!, $input: StrategyInput!) {
    generateWorkspaceStrategy(workspaceId: $workspaceId, input: $input) {
      success
      strategy {
        workspaceId
        goals {
          id
          title
          description
          priority
          timeline
          metrics
          dependencies
        }
        constraints {
          type
          description
          impact
          mitigation
        }
        roadmap {
          phase
          title
          duration
          objectives
          deliverables
          resources
          risks
        }
        riskAssessment {
          risk
          probability
          impact
          mitigation
          owner
        }
        generatedAt
      }
      operationId
      error
    }
  }
`;

export const PERFORM_WORKSPACE_HEALTH_CHECK = gql`
  mutation PerformWorkspaceHealthCheck($workspaceId: ID!) {
    performWorkspaceHealthCheck(workspaceId: $workspaceId) {
      success
      healthCheck {
        workspaceId
        overallScore
        dimensions {
          name
          score
          weight
          factors {
            name
            score
            description
          }
        }
        criticalIssues {
          severity
          category
          title
          description
          impact
          recommendation
        }
        recommendations {
          priority
          category
          title
          description
          estimatedImprovement
        }
        checkedAt
      }
      operationId
      error
    }
  }
`;

// Task Agent Mutations
export const GENERATE_TASK_BREAKDOWN = gql`
  mutation GenerateTaskBreakdown($taskId: ID!) {
    generateTaskBreakdown(taskId: $taskId) {
      success
      breakdown {
        taskId
        subtasks {
          title
          description
          estimatedHours
          priority
          dependencies
          skills
          complexity
        }
        complexity
        estimatedHours
        dependencies {
          type
          description
          blocking
          external
        }
        risks {
          type
          description
          probability
          impact
          mitigation
        }
        generatedAt
      }
      operationId
      error
    }
  }
`;

export const ESTIMATE_TASK_EFFORT = gql`
  mutation EstimateTaskEffort($taskId: ID!) {
    estimateTaskEffort(taskId: $taskId) {
      success
      estimation {
        taskId
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
          mitigation
        }
        generatedAt
      }
      operationId
      error
    }
  }
`;

export const OPTIMIZE_TASK = gql`
  mutation OptimizeTask($taskId: ID!) {
    optimizeTask(taskId: $taskId) {
      success
      optimization {
        taskId
        automationOpportunities {
          area
          description
          effort
          savings
          tools
        }
        processImprovements {
          current
          improved
          benefits
          effort
        }
        qualityImprovements {
          area
          description
          implementation
          impact
        }
        resourceOptimizations {
          resource
          optimization
          impact
          requirements
        }
        generatedAt
      }
      operationId
      error
    }
  }
`;

export const ANALYZE_TASK_DEPENDENCIES = gql`
  mutation AnalyzeTaskDependencies($taskId: ID!) {
    analyzeTaskDependencies(taskId: $taskId) {
      success
      analysis {
        taskId
        internalDependencies {
          taskId
          title
          relationship
          criticality
          status
        }
        externalDependencies {
          name
          type
          description
          criticality
          owner
          estimatedResolution
        }
        technicalDependencies {
          name
          type
          description
          version
          criticality
          alternatives
        }
        resourceDependencies {
          resource
          type
          availability
          criticality
          alternatives
        }
        generatedAt
      }
      operationId
      error
    }
  }
`;

export const TRACK_TASK_PROGRESS = gql`
  mutation TrackTaskProgress($taskId: ID!, $input: ProgressInput!) {
    trackTaskProgress(taskId: $taskId, input: $input) {
      success
      progressUpdate {
        taskId
        progress
        status
        completedSubtasks
        currentPhase
        blockers {
          description
          type
          severity
          owner
          estimatedResolution
        }
        estimatedCompletion
        notes
        updatedAt
      }
      operationId
      error
    }
  }
`;

export const AUTO_GENERATE_SUBTASKS = gql`
  mutation AutoGenerateSubtasks($taskId: ID!) {
    autoGenerateSubtasks(taskId: $taskId) {
      success
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
      error
    }
  }
`;

// Generic Agent Mutation
export const EXECUTE_AGENT_OPERATION = gql`
  mutation ExecuteAgentOperation($input: AgentOperationInput!) {
    executeAgentOperation(input: $input) {
      success
      result
      operationId
      agentId
      error
    }
  }
`;

// Agent Management Mutations
export const ENABLE_AGENT = gql`
  mutation EnableAgent($agentId: ID!) {
    enableAgent(agentId: $agentId) {
      success
      agent {
        id
        name
        enabled
        health
      }
      error
    }
  }
`;

export const DISABLE_AGENT = gql`
  mutation DisableAgent($agentId: ID!) {
    disableAgent(agentId: $agentId) {
      success
      agent {
        id
        name
        enabled
        health
      }
      error
    }
  }
`;

export const UPDATE_AGENT_PRIORITY = gql`
  mutation UpdateAgentPriority($agentId: ID!, $priority: Int!) {
    updateAgentPriority(agentId: $agentId, priority: $priority) {
      success
      agent {
        id
        name
        priority
      }
      error
    }
  }
`;

// Initiative Agent Mutations
export const GENERATE_INITIATIVE_PLANNING = gql`
  mutation GenerateInitiativePlanning($initiativeId: ID!, $requirements: PlanningRequirementsInput) {
    generateInitiativePlanning(initiativeId: $initiativeId, requirements: $requirements) {
      success
      planning {
        initiativeId
        phases {
          name
          description
          duration
          dependencies
          milestones
        }
        resources {
          type
          name
          allocation
          availability
        }
        timeline {
          phase
          startDate
          endDate
          dependencies
        }
        risks {
          description
          probability
          impact
          mitigation
        }
        generatedAt
      }
      operationId
      error
    }
  }
`;

export const GENERATE_INITIATIVE_STRATEGY = gql`
  mutation GenerateInitiativeStrategy($initiativeId: ID!, $input: StrategyInput!) {
    generateInitiativeStrategy(initiativeId: $initiativeId, input: $input) {
      success
      strategy {
        initiativeId
        objectives {
          id
          title
          description
          priority
          timeline
          metrics
        }
        approaches {
          name
          description
          pros
          cons
          effort
          impact
        }
        implementation {
          phase
          activities
          deliverables
          timeline
          resources
        }
        success_criteria {
          metric
          target
          measurement
          timeline
        }
        generatedAt
      }
      operationId
      error
    }
  }
`;

export const TRACK_INITIATIVE_PROGRESS = gql`
  mutation TrackInitiativeProgress($initiativeId: ID!) {
    trackInitiativeProgress(initiativeId: $initiativeId) {
      success
      progress {
        initiativeId
        overallProgress
        currentPhase
        completedMilestones
        upcomingMilestones {
          name
          dueDate
          status
        }
        blockers {
          description
          severity
          owner
          estimatedResolution
        }
        metrics {
          name
          current
          target
          trend
        }
        recommendations {
          type
          description
          priority
          effort
        }
        updatedAt
      }
      operationId
      error
    }
  }
`;

export const AUTO_GENERATE_INITIATIVE_TASKS = gql`
  mutation AutoGenerateInitiativeTasks($initiativeId: ID!, $requirements: TaskGenerationRequirementsInput) {
    autoGenerateInitiativeTasks(initiativeId: $initiativeId, requirements: $requirements) {
      success
      tasks {
        id
        title
        description
        priority
        estimatedHours
        dependencies
        skills
        phase
        createdAt
      }
      operationId
      error
    }
  }
`;