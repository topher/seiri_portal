// Workflows Index
// Central exports for all Suite-Initiative integrated workflows

// PRD Workflow
export { PRDSuiteWorkflowService } from './prd/prd-suite-workflow.service';
export type { 
  PRDWorkflowInput, 
  PRDWorkflowResult 
} from './prd/prd-suite-workflow.service';

// Business Model Workflow
export { BusinessModelRACIWorkflowService } from './business-model/business-model-raci-workflow.service';
export type { 
  BusinessModelWorkflowInput, 
  BusinessModelWorkflowResult 
} from './business-model/business-model-raci-workflow.service';

// Import for internal use
import { PRDSuiteWorkflowService } from './prd/prd-suite-workflow.service';
import { BusinessModelRACIWorkflowService } from './business-model/business-model-raci-workflow.service';

// Workflow Manager - Central orchestration
export class WorkflowManager {
  private static prdWorkflow = new PRDSuiteWorkflowService();
  private static businessModelWorkflow = new BusinessModelRACIWorkflowService();

  /**
   * Execute PRD workflow with Suite-Initiative integration
   */
  static async executePRDWorkflow(input: any) {
    return await this.prdWorkflow.executePRDWorkflow(input);
  }

  /**
   * Execute Business Model workflow with RACI coordination
   */
  static async executeBusinessModelWorkflow(input: any) {
    return await this.businessModelWorkflow.executeBusinessModelWorkflow(input);
  }

  /**
   * Get workflow status
   */
  static async getWorkflowStatus(workflowType: 'PRD' | 'BUSINESS_MODEL', initiativeId: string) {
    switch (workflowType) {
      case 'PRD':
        return await this.prdWorkflow.getPRDStatus(initiativeId);
      case 'BUSINESS_MODEL':
        return await this.businessModelWorkflow.getBusinessModelStatus(initiativeId);
      default:
        throw new Error(`Unknown workflow type: ${workflowType}`);
    }
  }

  /**
   * List available workflows
   */
  static getAvailableWorkflows() {
    return [
      {
        id: 'PRD',
        name: 'Product Requirements Document',
        description: 'Comprehensive PRD development using Product Suite capabilities',
        suites: ['PRODUCT'],
        raci: {
          responsible: ['PRODUCT'],
          accountable: 'PRODUCT',
          consulted: ['MARKETING', 'DEVELOPMENT'],
          informed: ['OPERATIONS', 'SALES', 'STRATEGY']
        }
      },
      {
        id: 'BUSINESS_MODEL',
        name: 'Business Model Canvas',
        description: 'Cross-suite business model development with RACI coordination',
        suites: ['STRATEGY', 'MARKETING', 'SALES', 'PRODUCT'],
        raci: {
          responsible: ['MARKETING', 'SALES'],
          accountable: 'STRATEGY',
          consulted: ['PRODUCT', 'DEVELOPMENT'],
          informed: ['OPERATIONS']
        }
      }
    ];
  }

  /**
   * Validate workflow prerequisites
   */
  static async validateWorkflowPrerequisites(
    workflowType: 'PRD' | 'BUSINESS_MODEL',
    workspaceId: string
  ): Promise<{
    isValid: boolean;
    missingRequirements: string[];
    recommendations: string[];
  }> {
    const missingRequirements: string[] = [];
    const recommendations: string[] = [];

    // For this implementation, we'll assume basic validation
    // In a real system, this would check suite readiness, data availability, etc.
    
    switch (workflowType) {
      case 'PRD':
        // Check if Product suite has necessary data
        recommendations.push('Ensure user research data is available');
        recommendations.push('Gather competitive analysis information');
        break;
        
      case 'BUSINESS_MODEL':
        // Check if required suites have necessary data
        recommendations.push('Ensure customer data is available for segmentation');
        recommendations.push('Gather market research and competitive intelligence');
        recommendations.push('Prepare financial projections and assumptions');
        break;
    }

    return {
      isValid: missingRequirements.length === 0,
      missingRequirements,
      recommendations
    };
  }

  /**
   * Get workflow templates
   */
  static getWorkflowTemplates() {
    return {
      PRD: {
        requiredInputs: [
          'productName',
          'productDescription', 
          'businessObjectives',
          'targetLaunchDate'
        ],
        optionalInputs: [
          'researchData',
          'stakeholders',
          'competitorAnalysis'
        ],
        expectedDeliverables: [
          'User personas',
          'Jobs-to-be-done analysis',
          'Product requirements',
          'Success metrics',
          'Implementation timeline'
        ]
      },
      BUSINESS_MODEL: {
        requiredInputs: [
          'businessName',
          'businessDescription',
          'industry',
          'targetMarkets'
        ],
        optionalInputs: [
          'existingCustomerData',
          'competitorData',
          'financialProjections'
        ],
        expectedDeliverables: [
          'Business model canvas',
          'Customer segments',
          'Revenue streams',
          'Value proposition',
          'Go-to-market strategy'
        ]
      }
    };
  }
}

// Export workflow instances for direct access
export const workflowServices = {
  prd: new PRDSuiteWorkflowService(),
  businessModel: new BusinessModelRACIWorkflowService()
};

export default WorkflowManager;