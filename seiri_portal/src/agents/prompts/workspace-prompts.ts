import "server-only";

import { AgentContext } from '../context-engine';

export interface WorkspaceInsights {
  summary: string;
  keyMetrics: {
    totalSuites: number;
    totalInitiatives: number;
    totalTasks: number;
    completionRate: number;
    avgTasksPerInitiative: number;
    activeWorkstreams: number;
  };
  healthScore: {
    overall: number;
    breakdown: {
      progress: number;
      velocity: number;
      blockers: number;
      quality: number;
    };
  };
  trends: {
    progressTrend: 'up' | 'down' | 'stable';
    velocityTrend: 'up' | 'down' | 'stable';
    workloadTrend: 'up' | 'down' | 'stable';
    insights: string[];
  };
  recommendations: Recommendation[];
  criticalIssues: CriticalIssue[];
}

export interface Recommendation {
  id: string;
  type: 'performance' | 'process' | 'resource' | 'quality';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  actionItems: string[];
}

export interface CriticalIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium';
  type: 'blocker' | 'risk' | 'quality' | 'resource';
  title: string;
  description: string;
  impact: string;
  suggestedActions: string[];
  affectedAreas: string[];
}

export interface OptimizationSuggestion {
  id: string;
  category: 'workflow' | 'resource' | 'process' | 'structure';
  title: string;
  description: string;
  expectedBenefit: string;
  implementationSteps: string[];
  estimatedEffort: string;
  roi: 'high' | 'medium' | 'low';
}

export class WorkspacePrompts {
  static buildInsightsPrompt(context: AgentContext, workspaceData: any): string {
    return `
You are an AI workspace analyst specializing in project management optimization. Analyze the following workspace data and provide comprehensive insights.

WORKSPACE CONTEXT:
- Workspace: ${context.workspace.name}
- Total Members: ${context.workspace.memberCount}
- User Role: ${context.workspace.userRole}
- Analysis Date: ${new Date().toISOString()}

WORKSPACE DATA:
${JSON.stringify(workspaceData, null, 2)}

HIERARCHY CONTEXT:
- Suites: ${context.hierarchy.children.filter(c => c.type === 'SUITE').length}
- Initiatives: ${context.hierarchy.children.filter(c => c.type === 'INITIATIVE').length}

Please provide a comprehensive analysis in the following JSON format:

{
  "summary": "2-3 sentence executive summary of workspace health and status",
  "keyMetrics": {
    "totalSuites": number,
    "totalInitiatives": number,
    "totalTasks": number,
    "completionRate": number (0-1),
    "avgTasksPerInitiative": number,
    "activeWorkstreams": number
  },
  "healthScore": {
    "overall": number (0-100),
    "breakdown": {
      "progress": number (0-100),
      "velocity": number (0-100),
      "blockers": number (0-100, higher is better),
      "quality": number (0-100)
    }
  },
  "trends": {
    "progressTrend": "up|down|stable",
    "velocityTrend": "up|down|stable", 
    "workloadTrend": "up|down|stable",
    "insights": ["trend insight 1", "trend insight 2", "trend insight 3"]
  },
  "recommendations": [
    {
      "id": "rec_1",
      "type": "performance|process|resource|quality",
      "priority": "high|medium|low",
      "title": "Short recommendation title",
      "description": "Detailed description of recommendation",
      "impact": "Expected impact if implemented",
      "effort": "low|medium|high",
      "actionItems": ["specific action 1", "specific action 2"]
    }
  ],
  "criticalIssues": [
    {
      "id": "issue_1",
      "severity": "critical|high|medium",
      "type": "blocker|risk|quality|resource",
      "title": "Issue title",
      "description": "Detailed issue description",
      "impact": "Business impact of this issue",
      "suggestedActions": ["action 1", "action 2"],
      "affectedAreas": ["area 1", "area 2"]
    }
  ]
}

Focus on:
1. Identifying bottlenecks and blockers
2. Measuring team velocity and progress
3. Highlighting resource allocation issues
4. Suggesting process improvements
5. Identifying risks and opportunities

Provide actionable, specific recommendations based on the actual data patterns you observe.
`;
  }

  static buildOptimizationPrompt(context: AgentContext, workspaceData: any, currentInsights?: WorkspaceInsights): string {
    const insightsContext = currentInsights ? 
      `CURRENT INSIGHTS:\n${JSON.stringify(currentInsights, null, 2)}\n\n` : '';

    return `
You are an AI workspace optimization specialist. Based on the workspace data and current insights, provide specific optimization suggestions.

WORKSPACE CONTEXT:
- Workspace: ${context.workspace.name}
- User Role: ${context.workspace.userRole}
- Permissions: ${JSON.stringify(context.permissions)}

${insightsContext}WORKSPACE DATA:
${JSON.stringify(workspaceData, null, 2)}

Please provide optimization suggestions in the following JSON format:

{
  "suggestions": [
    {
      "id": "opt_1",
      "category": "workflow|resource|process|structure",
      "title": "Optimization title",
      "description": "Detailed description of the optimization",
      "expectedBenefit": "Quantified expected benefit",
      "implementationSteps": [
        "Step 1: Specific action",
        "Step 2: Specific action",
        "Step 3: Specific action"
      ],
      "estimatedEffort": "Time/resource estimate",
      "roi": "high|medium|low"
    }
  ],
  "quickWins": [
    {
      "title": "Quick win title",
      "description": "Easy to implement improvement",
      "impact": "Expected impact",
      "effort": "Minimal effort required"
    }
  ],
  "longTermImprovements": [
    {
      "title": "Long-term improvement",
      "description": "Strategic improvement description",
      "timeline": "Implementation timeline",
      "impact": "Long-term benefits"
    }
  ]
}

Focus on:
1. Workflow efficiency improvements
2. Resource allocation optimization
3. Process automation opportunities
4. Team structure improvements
5. Tool and technology recommendations

Prioritize suggestions that have high impact and feasible implementation given the current team size and structure.
`;
  }

  static buildStrategyPrompt(context: AgentContext, goals: string[], constraints: string[]): string {
    return `
You are an AI strategic planning specialist for project management. Help develop a comprehensive strategy for this workspace.

WORKSPACE CONTEXT:
- Workspace: ${context.workspace.name}
- Team Size: ${context.workspace.memberCount}
- Current Role: ${context.workspace.userRole}

STRATEGIC GOALS:
${goals.map((goal, i) => `${i + 1}. ${goal}`).join('\n')}

CONSTRAINTS:
${constraints.map((constraint, i) => `${i + 1}. ${constraint}`).join('\n')}

CURRENT HIERARCHY:
${JSON.stringify(context.hierarchy, null, 2)}

Please provide a strategic plan in the following JSON format:

{
  "executiveSummary": "2-3 sentence summary of the strategic approach",
  "strategicPillars": [
    {
      "name": "Pillar name",
      "description": "Pillar description",
      "objectives": ["objective 1", "objective 2"],
      "keyResults": ["measurable result 1", "measurable result 2"]
    }
  ],
  "implementationRoadmap": [
    {
      "phase": "Phase 1: 0-3 months",
      "goals": ["goal 1", "goal 2"],
      "deliverables": ["deliverable 1", "deliverable 2"],
      "risks": ["risk 1", "risk 2"],
      "successMetrics": ["metric 1", "metric 2"]
    }
  ],
  "resourceRequirements": {
    "team": "Team composition needs",
    "tools": ["tool 1", "tool 2"],
    "budget": "Budget considerations",
    "timeline": "Overall timeline"
  },
  "riskMitigation": [
    {
      "risk": "Risk description",
      "impact": "high|medium|low",
      "probability": "high|medium|low", 
      "mitigation": "Mitigation strategy"
    }
  ]
}

Focus on creating a practical, achievable strategy that aligns with the stated goals while respecting the constraints.
`;
  }

  static buildHealthCheckPrompt(context: AgentContext, workspaceData: any): string {
    return `
You are an AI workspace health diagnostician. Perform a comprehensive health check of this workspace.

WORKSPACE: ${context.workspace.name}
USER ROLE: ${context.workspace.userRole}
ANALYSIS TIME: ${new Date().toISOString()}

WORKSPACE DATA:
${JSON.stringify(workspaceData, null, 2)}

Provide a health assessment in this JSON format:

{
  "overallHealth": "excellent|good|fair|poor|critical",
  "healthScore": number (0-100),
  "dimensions": {
    "productivity": {
      "score": number (0-100),
      "status": "excellent|good|fair|poor|critical",
      "indicators": ["indicator 1", "indicator 2"],
      "concerns": ["concern 1", "concern 2"]
    },
    "teamVelocity": {
      "score": number (0-100),
      "status": "excellent|good|fair|poor|critical",
      "indicators": ["indicator 1", "indicator 2"],
      "concerns": ["concern 1", "concern 2"]
    },
    "qualityControl": {
      "score": number (0-100),
      "status": "excellent|good|fair|poor|critical",
      "indicators": ["indicator 1", "indicator 2"],
      "concerns": ["concern 1", "concern 2"]
    },
    "riskManagement": {
      "score": number (0-100),
      "status": "excellent|good|fair|poor|critical", 
      "indicators": ["indicator 1", "indicator 2"],
      "concerns": ["concern 1", "concern 2"]
    }
  },
  "urgentActions": [
    {
      "priority": "critical|high|medium",
      "action": "Action description",
      "reason": "Why this is urgent",
      "timeline": "When to complete"
    }
  ],
  "improvementAreas": [
    {
      "area": "Area name",
      "currentState": "Current state description",
      "targetState": "Desired state description",
      "steps": ["step 1", "step 2", "step 3"]
    }
  ]
}

Focus on identifying both strengths to leverage and weaknesses to address.
`;
  }
}