import "server-only";

import { AgentContext } from '../context-engine';

export interface TaskBreakdown {
  id: string;
  originalTaskId: string;
  subtasks: SubTask[];
  dependencies: TaskDependency[];
  estimatedEffort: {
    total: number; // hours
    breakdown: {
      planning: number;
      development: number;
      testing: number;
      review: number;
    };
  };
  complexity: {
    score: number; // 1-10
    factors: string[];
    reasoning: string;
  };
  risks: TaskRisk[];
  recommendations: string[];
  confidence: number; // 0-1
}

export interface SubTask {
  id: string;
  title: string;
  description: string;
  type: 'planning' | 'development' | 'testing' | 'review' | 'deployment' | 'research';
  priority: 'high' | 'medium' | 'low';
  estimatedHours: number;
  skills: string[];
  acceptanceCriteria: string[];
  dependencies: string[]; // IDs of other subtasks
}

export interface TaskDependency {
  id: string;
  type: 'blocks' | 'requires' | 'enhances';
  targetTaskId: string;
  description: string;
  critical: boolean;
}

export interface TaskRisk {
  id: string;
  type: 'technical' | 'resource' | 'timeline' | 'quality' | 'external';
  severity: 'high' | 'medium' | 'low';
  probability: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  mitigation: string;
}

export interface TaskEstimation {
  baseEstimate: number; // hours
  optimisticEstimate: number;
  pessimisticEstimate: number;
  confidenceLevel: number; // 0-1
  methodology: string;
  assumptions: string[];
  risks: string[];
  breakdown: {
    analysis: number;
    implementation: number;
    testing: number;
    documentation: number;
    buffer: number;
  };
}

export interface TaskOptimization {
  suggestions: OptimizationSuggestion[];
  automationOpportunities: AutomationOpportunity[];
  qualityImprovements: QualityImprovement[];
  processImprovements: ProcessImprovement[];
}

export interface OptimizationSuggestion {
  id: string;
  type: 'efficiency' | 'quality' | 'process' | 'tools';
  title: string;
  description: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface AutomationOpportunity {
  id: string;
  area: string;
  description: string;
  tools: string[];
  timesSaved: string;
  complexity: 'low' | 'medium' | 'high';
}

export interface QualityImprovement {
  id: string;
  area: string;
  currentState: string;
  improvedState: string;
  implementation: string[];
}

export interface ProcessImprovement {
  id: string;
  process: string;
  currentIssue: string;
  proposal: string;
  benefits: string[];
}

export class TaskPrompts {
  static buildBreakdownPrompt(context: AgentContext, taskData: any): string {
    return `
You are an AI task breakdown specialist with expertise in software development and project management. Analyze the following task and create a comprehensive breakdown.

TASK CONTEXT:
- Task: ${taskData.title}
- Description: ${taskData.description || 'No description provided'}
- Priority: ${taskData.priority}
- Status: ${taskData.status}
- Initiative: ${context.hierarchy.parents[0]?.name || 'None'}

WORKSPACE CONTEXT:
- Workspace: ${context.workspace.name}
- User Role: ${context.workspace.userRole}

HIERARCHY CONTEXT:
- Parent Initiative: ${context.hierarchy.parents[0]?.name || 'Direct workspace task'}
- Sibling Tasks: ${context.hierarchy.siblings.length}
- Dependencies: ${context.hierarchy.dependencies.length}

EXISTING ACCEPTANCE CRITERIA:
${context.hierarchy.children.filter(c => c.type === 'ACCEPTANCE_CRITERION').map(ac => `- ${ac.name}: ${ac.description || ''}`).join('\n') || 'None defined'}

Please provide a comprehensive task breakdown in the following JSON format:

{
  "id": "breakdown_${Date.now()}",
  "originalTaskId": "${taskData.id}",
  "subtasks": [
    {
      "id": "subtask_1",
      "title": "Subtask title",
      "description": "Detailed description of what needs to be done",
      "type": "planning|development|testing|review|deployment|research",
      "priority": "high|medium|low",
      "estimatedHours": number,
      "skills": ["skill1", "skill2"],
      "acceptanceCriteria": ["criteria 1", "criteria 2"],
      "dependencies": ["subtask_id_1", "subtask_id_2"]
    }
  ],
  "dependencies": [
    {
      "id": "dep_1",
      "type": "blocks|requires|enhances",
      "targetTaskId": "external_task_id",
      "description": "Dependency description",
      "critical": true
    }
  ],
  "estimatedEffort": {
    "total": number,
    "breakdown": {
      "planning": number,
      "development": number,
      "testing": number,
      "review": number
    }
  },
  "complexity": {
    "score": number (1-10),
    "factors": ["factor 1", "factor 2"],
    "reasoning": "Explanation of complexity assessment"
  },
  "risks": [
    {
      "id": "risk_1",
      "type": "technical|resource|timeline|quality|external",
      "severity": "high|medium|low",
      "probability": "high|medium|low",
      "description": "Risk description",
      "impact": "Impact if risk occurs",
      "mitigation": "How to mitigate this risk"
    }
  ],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "confidence": number (0-1)
}

Guidelines:
1. Break down into logical, manageable subtasks (typically 2-8 hours each)
2. Consider the full development lifecycle
3. Account for code review, testing, and documentation
4. Identify external dependencies and blockers
5. Assess technical complexity realistically
6. Include buffer time for unknowns
7. Consider the team's skill level and context

Focus on creating actionable, specific subtasks that a developer could immediately understand and execute.
`;
  }

  static buildEstimationPrompt(context: AgentContext, taskData: any, breakdownData?: TaskBreakdown): string {
    const breakdownContext = breakdownData ? 
      `EXISTING BREAKDOWN:\n${JSON.stringify(breakdownData, null, 2)}\n\n` : '';

    return `
You are an AI estimation specialist with deep knowledge of software development timelines and complexity assessment.

TASK CONTEXT:
- Task: ${taskData.title}
- Description: ${taskData.description || 'No description provided'}
- Priority: ${taskData.priority}

${breakdownContext}TEAM CONTEXT:
- Workspace: ${context.workspace.name}
- Team Size: ${context.workspace.memberCount}
- User Role: ${context.workspace.userRole}

RELATED TASKS (for reference):
${context.hierarchy.siblings.slice(0, 3).map(sibling => `- ${sibling.name}: ${sibling.status}`).join('\n')}

Please provide a detailed estimation in the following JSON format:

{
  "baseEstimate": number (hours),
  "optimisticEstimate": number (best case),
  "pessimisticEstimate": number (worst case),
  "confidenceLevel": number (0-1),
  "methodology": "Description of estimation approach used",
  "assumptions": [
    "Assumption 1",
    "Assumption 2"
  ],
  "risks": [
    "Risk factor 1",
    "Risk factor 2"
  ],
  "breakdown": {
    "analysis": number (hours),
    "implementation": number (hours),
    "testing": number (hours),
    "documentation": number (hours),
    "buffer": number (hours for unknowns)
  },
  "comparisons": [
    {
      "similar_task": "Description of similar task",
      "effort": number,
      "lessons": "What we learned"
    }
  ],
  "recommendations": [
    "Recommendation for managing this estimate",
    "Suggestion for improving accuracy"
  ]
}

Estimation Guidelines:
1. Use three-point estimation (optimistic, pessimistic, most likely)
2. Include buffer time for unknowns (typically 20-30%)
3. Consider team experience and skill level
4. Account for integration complexity
5. Include time for proper testing and documentation
6. Factor in review cycles and iteration
7. Consider external dependencies and waiting time

Provide honest, realistic estimates based on typical software development practices.
`;
  }

  static buildOptimizationPrompt(context: AgentContext, taskData: any): string {
    return `
You are an AI task optimization specialist focused on improving efficiency, quality, and delivery speed.

TASK CONTEXT:
- Task: ${taskData.title}
- Description: ${taskData.description || 'No description provided'}
- Current Status: ${taskData.status}
- Priority: ${taskData.priority}

CONTEXT:
- Workspace: ${context.workspace.name}
- User Permissions: ${JSON.stringify(context.permissions)}
- Related Tasks: ${context.hierarchy.siblings.length}

Please analyze this task and provide optimization suggestions in the following JSON format:

{
  "suggestions": [
    {
      "id": "opt_1",
      "type": "efficiency|quality|process|tools",
      "title": "Optimization title",
      "description": "Detailed description",
      "benefit": "Expected benefit",
      "effort": "low|medium|high",
      "impact": "low|medium|high"
    }
  ],
  "automationOpportunities": [
    {
      "id": "auto_1",
      "area": "Area that can be automated",
      "description": "What can be automated",
      "tools": ["tool1", "tool2"],
      "timesSaved": "Expected time savings",
      "complexity": "low|medium|high"
    }
  ],
  "qualityImprovements": [
    {
      "id": "quality_1",
      "area": "Quality area",
      "currentState": "Current quality state",
      "improvedState": "Improved quality state",
      "implementation": ["step 1", "step 2"]
    }
  ],
  "processImprovements": [
    {
      "id": "process_1",
      "process": "Process name",
      "currentIssue": "Current problem",
      "proposal": "Proposed improvement",
      "benefits": ["benefit 1", "benefit 2"]
    }
  ],
  "toolRecommendations": [
    {
      "category": "development|testing|deployment|monitoring",
      "tool": "Tool name",
      "purpose": "What it helps with",
      "integration": "How to integrate",
      "impact": "Expected impact"
    }
  ],
  "bestPractices": [
    {
      "area": "Practice area",
      "practice": "Best practice description",
      "implementation": "How to implement",
      "benefit": "Why this helps"
    }
  ]
}

Focus on:
1. Identifying repetitive or manual work that can be automated
2. Suggesting tools and techniques to improve efficiency
3. Recommending quality gates and checks
4. Proposing process improvements
5. Highlighting collaboration opportunities
6. Suggesting ways to reduce technical debt

Provide practical, implementable suggestions that fit the team's current context and capabilities.
`;
  }

  static buildDependencyAnalysisPrompt(context: AgentContext, taskData: any): string {
    return `
You are an AI dependency analysis specialist. Analyze this task to identify all dependencies and potential blockers.

TASK: ${taskData.title}
DESCRIPTION: ${taskData.description || 'No description provided'}

CURRENT DEPENDENCIES:
${context.hierarchy.dependencies.map(dep => `- ${dep.target.name} (${dep.type}): ${dep.description || ''}`).join('\n') || 'None identified'}

RELATED TASKS:
${context.hierarchy.siblings.map(sibling => `- ${sibling.name} (${sibling.status})`).join('\n')}

INITIATIVE CONTEXT:
${context.hierarchy.parents[0]?.name || 'No parent initiative'}

Please provide a comprehensive dependency analysis in this JSON format:

{
  "internalDependencies": [
    {
      "id": "dep_1",
      "type": "blocks|requires|enhances",
      "targetTask": "Task name",
      "description": "Dependency description",
      "critical": true,
      "estimated_delay": "Potential delay if not resolved",
      "mitigation": "How to work around this"
    }
  ],
  "externalDependencies": [
    {
      "id": "ext_dep_1",
      "type": "system|api|data|approval|resource",
      "dependency": "External dependency name",
      "description": "What we need",
      "owner": "Who owns this dependency",
      "timeline": "When we need it",
      "risk": "Risk if not available"
    }
  ],
  "technicalDependencies": [
    {
      "id": "tech_dep_1",
      "category": "library|service|infrastructure|tool",
      "name": "Dependency name",
      "version": "Required version",
      "purpose": "Why we need it",
      "alternatives": ["alternative 1", "alternative 2"]
    }
  ],
  "resourceDependencies": [
    {
      "id": "resource_dep_1",
      "type": "skill|person|budget|time|equipment",
      "resource": "Resource name",
      "requirement": "What we need",
      "availability": "When available",
      "impact": "Impact if not available"
    }
  ],
  "criticalPath": [
    {
      "step": "Critical step",
      "dependencies": ["dep_1", "dep_2"],
      "duration": "Expected duration",
      "risk": "Risk assessment"
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "Recommended action",
      "reason": "Why this is important",
      "timeline": "When to act"
    }
  ]
}

Focus on identifying:
1. Technical dependencies (libraries, APIs, services)
2. Process dependencies (approvals, reviews, gates)
3. Resource dependencies (people, skills, tools)
4. Data dependencies (input data, external systems)
5. Timeline dependencies (sequencing, parallel work)

Provide actionable recommendations for managing and mitigating dependency risks.
`;
  }

  static buildProgressTrackingPrompt(context: AgentContext, taskData: any, subtasks?: SubTask[]): string {
    const subtaskContext = subtasks ? 
      `SUBTASKS:\n${subtasks.map(st => `- ${st.title} (${st.estimatedHours}h)`).join('\n')}\n\n` : '';

    return `
You are an AI progress tracking specialist. Create a comprehensive progress tracking plan for this task.

TASK: ${taskData.title}
STATUS: ${taskData.status}
${subtaskContext}
CONTEXT: ${context.workspace.name}

Please create a progress tracking plan in this JSON format:

{
  "milestones": [
    {
      "id": "milestone_1",
      "name": "Milestone name",
      "description": "What constitutes completion",
      "criteria": ["criterion 1", "criterion 2"],
      "estimated_completion": "Expected date/time",
      "dependencies": ["dependency 1"]
    }
  ],
  "checkpoints": [
    {
      "id": "checkpoint_1",
      "type": "daily|weekly|milestone",
      "name": "Checkpoint name", 
      "questions": ["Is X complete?", "Any blockers?"],
      "deliverables": ["deliverable 1"],
      "frequency": "How often to check"
    }
  ],
  "metrics": [
    {
      "name": "Metric name",
      "type": "completion|quality|velocity|blocker",
      "measurement": "How to measure",
      "target": "Target value",
      "warning_threshold": "When to flag"
    }
  ],
  "reportingSchedule": {
    "frequency": "daily|weekly|milestone",
    "format": "standup|status|dashboard",
    "stakeholders": ["stakeholder 1"],
    "content": ["what to report"]
  },
  "riskIndicators": [
    {
      "indicator": "Warning sign",
      "threshold": "When to worry",
      "action": "What to do",
      "escalation": "Who to notify"
    }
  ]
}

Include tracking for:
1. Progress against estimated timeline
2. Quality gates and reviews
3. Blocker identification and resolution
4. Resource utilization
5. Scope changes
6. Risk indicators

Make it practical and not overly bureaucratic for the team size and context.
`;
  }
}