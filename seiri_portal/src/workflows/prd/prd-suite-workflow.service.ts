// PRD Suite Workflow Service
// Integrates PRD generation with Product Suite and Initiative coordination

import { SuiteType } from '@/core/suites/suite.model';
import { SuiteServiceManager } from '@/core/suites/services';
import { ProductSuiteService } from '@/core/suites/services/product-suite.service';
import { initiativeService } from '@/core/initiatives/initiative.service';
import { taskService } from '@/core/tasks/task.service';
import { 
  CreateInitiativeInput, 
  RACIInput, 
  InitiativeValueInput,
  StageStatus 
} from '@/core/initiatives/initiative.model';
import {
  CreateTaskInput,
  DeliverableType,
  AgentType,
  Priority
} from '@/core/tasks/task.model';

export interface PRDWorkflowInput {
  workspaceId: string;
  productName: string;
  productDescription: string;
  targetLaunchDate?: Date;
  businessObjectives: string[];
  researchData?: {
    userInterviews?: any[];
    surveyResults?: any;
    competitorAnalysis?: any;
    marketResearch?: any;
  };
  stakeholders?: string[];
}

export interface PRDWorkflowResult {
  initiative: any;
  prdDocument: {
    id: string;
    personas: any[];
    jobsToBeDone: any[];
    productRequirements: any[];
    businessValue: string;
    successMetrics: any[];
    timeline: any[];
  };
  tasks: any[];
  insights: any;
  recommendations: string[];
}

export class PRDSuiteWorkflowService {
  private productService: ProductSuiteService;

  constructor() {
    this.productService = SuiteServiceManager.getService(SuiteType.PRODUCT) as ProductSuiteService;
  }

  /**
   * Execute complete PRD workflow with Suite-Initiative architecture
   */
  async executePRDWorkflow(input: PRDWorkflowInput): Promise<PRDWorkflowResult> {
    // 1. Create Initiative with RACI matrix
    const initiative = await this.createPRDInitiative(input);

    // 2. Generate PRD components using Product Suite
    const prdComponents = await this.generatePRDComponents(input, initiative.id);

    // 3. Create structured tasks for PRD development
    const tasks = await this.createPRDTasks(initiative.id, prdComponents);

    // 4. Generate insights and recommendations
    const insights = await this.generatePRDInsights(prdComponents);
    const recommendations = await this.generatePRDRecommendations(prdComponents);

    // 5. Assemble final PRD document
    const prdDocument = await this.assemblePRDDocument(prdComponents, input);

    return {
      initiative,
      prdDocument,
      tasks,
      insights,
      recommendations
    };
  }

  /**
   * Create PRD Initiative with proper RACI matrix
   */
  private async createPRDInitiative(input: PRDWorkflowInput): Promise<any> {
    // Define RACI matrix for PRD development
    const raciInput: RACIInput = {
      responsible: [], // Will be populated with actual suite IDs
      accountable: '', // Product suite will be accountable
      consulted: [],   // Marketing, Development suites consulted
      informed: []     // Operations, Sales, Strategy informed
    };

    // In a real implementation, we'd fetch actual suite IDs
    // For now, we'll use mock IDs that follow the pattern
    const mockSuiteIds = {
      PRODUCT: `suite_product_${Date.now()}`,
      MARKETING: `suite_marketing_${Date.now()}`,
      DEVELOPMENT: `suite_development_${Date.now()}`,
      OPERATIONS: `suite_operations_${Date.now()}`,
      STRATEGY: `suite_strategy_${Date.now()}`,
      SALES: `suite_sales_${Date.now()}`
    };

    raciInput.responsible = [mockSuiteIds.PRODUCT];
    raciInput.accountable = mockSuiteIds.PRODUCT;
    raciInput.consulted = [mockSuiteIds.MARKETING, mockSuiteIds.DEVELOPMENT];
    raciInput.informed = [mockSuiteIds.OPERATIONS, mockSuiteIds.SALES, mockSuiteIds.STRATEGY];

    // Define initiative value
    const valueInput: InitiativeValueInput = {
      estimatedImpact: `Product launch expected to generate $2M+ in first year revenue for ${input.productName}`,
      metrics: [
        {
          name: 'Time to Market',
          target: '6 months from PRD completion',
          unit: 'months',
          category: 'TIME_TO_MARKET' as any
        },
        {
          name: 'Market Capture',
          target: '5% market share in target segment',
          unit: 'percentage',
          category: 'MARKET_SHARE' as any
        },
        {
          name: 'Customer Satisfaction',
          target: '4.5+ rating in first 3 months',
          unit: 'rating',
          category: 'CUSTOMER_SATISFACTION'
        }
      ],
      clientVisibility: 'HIGH' as any
    };

    const initiativeInput: CreateInitiativeInput = {
      name: `PRD Development: ${input.productName}`,
      description: `Comprehensive Product Requirements Document development for ${input.productName}. ${input.productDescription}`,
      workspaceId: input.workspaceId,
      raci: raciInput,
      value: valueInput,
      priority: 'HIGH' as any
    };

    return await initiativeService.createInitiative(initiativeInput);
  }

  /**
   * Generate PRD components using Product Suite capabilities
   */
  private async generatePRDComponents(input: PRDWorkflowInput, initiativeId: string): Promise<{
    personas: any[];
    jobsToBeDone: any[];
    requirements: any[];
    validationResults: any;
  }> {
    // 1. Generate personas using Product Suite
    const personas = await this.productService.generatePersonas({
      researchData: input.researchData,
      interviewNotes: input.researchData?.userInterviews?.map(interview => interview.notes) || [],
      surveyResults: input.researchData?.surveyResults,
      userAnalytics: input.researchData?.marketResearch
    });

    // 2. Analyze jobs-to-be-done
    const allJobs = personas.flatMap(persona => persona.jobsToBeDone || []);
    const jobAnalysis = await this.productService.analyzeJobOpportunities(allJobs);

    // 3. Generate product requirements
    const requirements = await this.productService.generateProductRequirements(
      personas, 
      jobAnalysis.topOpportunities
    );

    // 4. Validate using Product ontology
    const prdData = { personas, jobs: allJobs, requirements };
    const validationResults = await this.productService.validateData(prdData);

    return {
      personas,
      jobsToBeDone: jobAnalysis.rankedJobs,
      requirements,
      validationResults
    };
  }

  /**
   * Create structured tasks for PRD development
   */
  private async createPRDTasks(initiativeId: string, prdComponents: any): Promise<any[]> {
    const tasks = [];

    // Task 1: Persona Validation and Refinement
    const personaTask: CreateTaskInput = {
      title: 'Validate and Refine User Personas',
      description: 'Review generated personas with stakeholders and refine based on feedback',
      initiativeId,
      priority: 'HIGH' as any,
      definitionOfDone: {
        criteria: [
          { description: 'All personas reviewed by product stakeholders', isMandatory: true },
          { description: 'Personas validated against user research data', isMandatory: true },
          { description: 'Jobs-to-be-done mapped to each persona', isMandatory: true }
        ],
        requiredDeliverables: [DeliverableType.PERSONA_SET]
      },
      agentRequirements: {
        primary: AgentType.PERSONA_AGENT,
        supporting: [AgentType.RESEARCH_AGENT, AgentType.ANALYSIS_AGENT],
        reviewers: [AgentType.STRATEGY_AGENT]
      }
    };

    // Task 2: Jobs-to-be-Done Analysis
    const jtbdTask: CreateTaskInput = {
      title: 'Complete Jobs-to-be-Done Analysis',
      description: 'Finalize JTBD analysis with opportunity scoring and prioritization',
      initiativeId,
      priority: 'HIGH' as any,
      definitionOfDone: {
        criteria: [
          { description: 'All jobs scored for importance and satisfaction', isMandatory: true },
          { description: 'Opportunity scores calculated and validated', isMandatory: true },
          { description: 'Top opportunity jobs identified for product focus', isMandatory: true }
        ],
        requiredDeliverables: [DeliverableType.JOB_MAP]
      },
      agentRequirements: {
        primary: AgentType.JTBD_AGENT,
        supporting: [AgentType.PRIORITIZATION_AGENT, AgentType.ANALYSIS_AGENT],
        reviewers: [AgentType.PERSONA_AGENT]
      }
    };

    // Task 3: Requirements Definition
    const requirementsTask: CreateTaskInput = {
      title: 'Define Product Requirements',
      description: 'Create detailed product requirements based on personas and JTBD analysis',
      initiativeId,
      priority: 'HIGH' as any,
      definitionOfDone: {
        criteria: [
          { description: 'Requirements trace to specific personas and jobs', isMandatory: true },
          { description: 'Acceptance criteria defined for each requirement', isMandatory: true },
          { description: 'Business value articulated for each requirement', isMandatory: true },
          { description: 'Requirements prioritized using MoSCoW method', isMandatory: true }
        ],
        requiredDeliverables: [DeliverableType.PRD_DOCUMENT]
      },
      agentRequirements: {
        primary: AgentType.ANALYSIS_AGENT,
        supporting: [AgentType.PRIORITIZATION_AGENT],
        reviewers: [AgentType.PERSONA_AGENT, AgentType.JTBD_AGENT]
      }
    };

    // Task 4: Technical Feasibility Review
    const feasibilityTask: CreateTaskInput = {
      title: 'Technical Feasibility Review',
      description: 'Review requirements with Development suite for technical feasibility',
      initiativeId,
      priority: 'MEDIUM' as any,
      definitionOfDone: {
        criteria: [
          { description: 'All requirements reviewed for technical feasibility', isMandatory: true },
          { description: 'Technical complexity estimated for each requirement', isMandatory: false },
          { description: 'Architectural implications identified', isMandatory: true }
        ],
        requiredDeliverables: [DeliverableType.TECHNICAL_ARCHITECTURE]
      },
      agentRequirements: {
        primary: AgentType.ARCHITECTURE_AGENT,
        supporting: [AgentType.ESTIMATION_AGENT],
        reviewers: [AgentType.COMPONENT_AGENT]
      }
    };

    // Create tasks
    const createdTasks = [];
    for (const taskInput of [personaTask, jtbdTask, requirementsTask, feasibilityTask]) {
      const task = await taskService.createTask(taskInput);
      createdTasks.push(task);
    }

    return createdTasks;
  }

  /**
   * Generate PRD insights using Product Suite
   */
  private async generatePRDInsights(prdComponents: any): Promise<any> {
    const insights = await this.productService.generateInsights({
      personas: prdComponents.personas,
      jobs: prdComponents.jobsToBeDone,
      requirements: prdComponents.requirements
    });

    // Add PRD-specific insights
    insights.keyMetrics.push(
      { 
        name: 'Requirements Coverage', 
        value: `${prdComponents.requirements.length} requirements covering ${prdComponents.personas.length} personas`
      },
      {
        name: 'Opportunity Score',
        value: prdComponents.jobsToBeDone.slice(0, 5).reduce((sum: number, job: any) => sum + job.opportunity, 0) / 5
      }
    );

    return insights;
  }

  /**
   * Generate PRD-specific recommendations
   */
  private async generatePRDRecommendations(prdComponents: any): Promise<string[]> {
    const baseRecommendations = await this.productService.suggestImprovements({
      personas: prdComponents.personas,
      jobs: prdComponents.jobsToBeDone,
      requirements: prdComponents.requirements
    });

    // Add PRD workflow specific recommendations
    const prdRecommendations = [
      'Conduct user testing to validate personas and jobs-to-be-done',
      'Create prototypes for high-priority requirements before development',
      'Establish success metrics for each major feature',
      'Plan iterative releases based on job opportunity scores'
    ];

    return [...baseRecommendations, ...prdRecommendations];
  }

  /**
   * Assemble final PRD document
   */
  private async assemblePRDDocument(prdComponents: any, input: PRDWorkflowInput): Promise<any> {
    const document = {
      id: `prd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        productName: input.productName,
        version: '1.0',
        createdAt: new Date(),
        lastModified: new Date(),
        author: 'Product Suite AI',
        stakeholders: input.stakeholders || []
      },
      
      // Executive Summary
      executiveSummary: {
        productOverview: input.productDescription,
        businessObjectives: input.businessObjectives,
        targetMarket: prdComponents.personas.map((p: any) => p.name).join(', '),
        expectedValue: `Address ${prdComponents.jobsToBeDone.filter((j: any) => j.opportunity > 10).length} high-opportunity user needs`
      },

      // User Research
      userResearch: {
        personas: prdComponents.personas,
        researchMethodology: input.researchData ? 'User interviews, surveys, and market analysis' : 'AI-generated based on product description',
        keyInsights: prdComponents.personas.flatMap((p: any) => p.painPoints?.slice(0, 2) || [])
      },

      // Jobs-to-be-Done Analysis
      jobsToBeDone: {
        methodology: 'Opportunity scoring based on importance and satisfaction gaps',
        rankedJobs: prdComponents.jobsToBeDone.slice(0, 10),
        priorityJobs: prdComponents.jobsToBeDone.filter((j: any) => j.opportunity > 12)
      },

      // Product Requirements
      requirements: {
        mustHave: prdComponents.requirements.filter((r: any) => r.priority === 'MUST_HAVE'),
        shouldHave: prdComponents.requirements.filter((r: any) => r.priority === 'SHOULD_HAVE'),
        couldHave: prdComponents.requirements.filter((r: any) => r.priority === 'COULD_HAVE'),
        wontHave: prdComponents.requirements.filter((r: any) => r.priority === 'WONT_HAVE')
      },

      // Success Metrics
      successMetrics: [
        {
          metric: 'User Satisfaction',
          target: '4.5+ rating',
          measurement: 'App store ratings and user surveys'
        },
        {
          metric: 'Job Completion Rate',
          target: '90% of top priority jobs can be completed',
          measurement: 'User task completion analytics'
        },
        {
          metric: 'Market Adoption',
          target: '10,000 active users in first 6 months',
          measurement: 'User analytics and engagement metrics'
        }
      ],

      // Timeline and Milestones
      timeline: [
        {
          phase: 'Design & Prototyping',
          duration: '4 weeks',
          deliverables: ['User experience design', 'Interactive prototypes'],
          dependencies: ['PRD approval']
        },
        {
          phase: 'Development Sprint 1',
          duration: '6 weeks', 
          deliverables: ['Core functionality', 'Must-have features'],
          dependencies: ['Design completion']
        },
        {
          phase: 'Testing & Refinement',
          duration: '3 weeks',
          deliverables: ['User testing results', 'Bug fixes'],
          dependencies: ['Development completion']
        },
        {
          phase: 'Launch Preparation',
          duration: '2 weeks',
          deliverables: ['Marketing materials', 'Launch strategy'],
          dependencies: ['Testing completion']
        }
      ],

      // Appendices
      appendices: {
        validationResults: prdComponents.validationResults,
        researchData: input.researchData,
        glossary: this.generateGlossary()
      }
    };

    return document;
  }

  /**
   * Generate glossary for PRD document
   */
  private generateGlossary(): Record<string, string> {
    return {
      'Jobs-to-be-Done': 'A framework for understanding customer needs by focusing on the functional, emotional, and social jobs customers are trying to accomplish',
      'Opportunity Score': 'Calculated as Importance + (Importance - Satisfaction), indicating the potential value of addressing a specific job',
      'Persona': 'A fictional character representing a segment of users, based on research and data about real customers',
      'RACI Matrix': 'A responsibility assignment matrix that defines who is Responsible, Accountable, Consulted, and Informed for each task',
      'MoSCoW': 'A prioritization technique categorizing requirements as Must have, Should have, Could have, or Won\'t have'
    };
  }

  /**
   * Update PRD based on feedback
   */
  async updatePRDWithFeedback(
    initiativeId: string, 
    feedback: {
      personaFeedback?: any[];
      requirementChanges?: any[];
      newResearchData?: any;
    }
  ): Promise<PRDWorkflowResult> {
    // Re-run workflow with updated inputs
    const initiative = await initiativeService.getInitiative(initiativeId);
    if (!initiative) {
      throw new Error(`Initiative ${initiativeId} not found`);
    }

    // Create updated input based on feedback
    const updatedInput: PRDWorkflowInput = {
      workspaceId: initiative.workspaceId,
      productName: initiative.name.replace('PRD Development: ', ''),
      productDescription: initiative.description || '',
      businessObjectives: ['Updated based on feedback'],
      researchData: feedback.newResearchData
    };

    return await this.executePRDWorkflow(updatedInput);
  }

  /**
   * Get PRD status and progress
   */
  async getPRDStatus(initiativeId: string): Promise<{
    initiative: any;
    tasks: any[];
    completionPercentage: number;
    nextSteps: string[];
    blockers: string[];
  }> {
    const initiative = await initiativeService.getInitiative(initiativeId);
    const tasks = await taskService.getTasksByInitiative(initiativeId);
    
    const completedTasks = tasks.filter(task => task.status === 'DONE');
    const completionPercentage = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
    
    const nextSteps = tasks
      .filter(task => task.status === 'TODO')
      .slice(0, 3)
      .map(task => `Complete: ${task.title}`);
    
    const blockers = tasks
      .filter(task => task.status === 'IN_PROGRESS')
      .flatMap(task => task.validationResults || [])
      .filter(result => result.status === 'FAILED')
      .map(result => result.message);

    return {
      initiative,
      tasks,
      completionPercentage,
      nextSteps,
      blockers
    };
  }
}