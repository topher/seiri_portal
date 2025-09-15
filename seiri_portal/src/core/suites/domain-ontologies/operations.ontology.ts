// Operations Suite Domain Ontology
// Defines data structures and validation rules for Operations management

import { DomainOntology, ValidationResult } from '../suite.model';

export const OperationsOntology: DomainOntology = {
  namespace: "https://seiri.ai/ontology/operations#",
  
  classes: [
    // Process Definition Class
    {
      name: "ProcessDefinition",
      properties: [
        {
          name: "name",
          type: "String",
          required: true
        },
        {
          name: "description",
          type: "String",
          required: true,
          minItems: 50
        },
        {
          name: "steps",
          type: "[ProcessStep]",
          required: true,
          minItems: 2
        },
        {
          name: "inputs",
          type: "[ProcessInput]",
          required: true
        },
        {
          name: "outputs",
          type: "[ProcessOutput]",
          required: true
        },
        {
          name: "sla",
          type: "ServiceLevelAgreement",
          required: false
        },
        {
          name: "automationLevel",
          type: "AutomationLevel",
          required: true
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateProcessEfficiency",
          message: "Process should be optimized for efficiency"
        }
      ]
    },

    // Quality Management Class
    {
      name: "QualityManagement",
      properties: [
        {
          name: "qualityStandards",
          type: "[QualityStandard]",
          required: true,
          minItems: 1
        },
        {
          name: "qualityMetrics",
          type: "[QualityMetric]",
          required: true,
          minItems: 3
        },
        {
          name: "controlPoints",
          type: "[QualityControlPoint]",
          required: true
        },
        {
          name: "improvementActions",
          type: "[ImprovementAction]",
          required: false
        }
      ],
      constraints: []
    },

    // Resource Planning Class
    {
      name: "ResourcePlanning",
      properties: [
        {
          name: "resourceTypes",
          type: "[ResourceType]",
          required: true
        },
        {
          name: "capacity",
          type: "ResourceCapacity",
          required: true
        },
        {
          name: "allocation",
          type: "[ResourceAllocation]",
          required: true
        },
        {
          name: "utilization",
          type: "ResourceUtilization",
          required: false
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateResourceOptimization",
          message: "Resource allocation should be optimized"
        }
      ]
    }
  ],

  relationships: [
    {
      from: "ProcessDefinition",
      to: "QualityManagement",
      type: "GOVERNED_BY",
      cardinality: "1:many"
    },
    {
      from: "ProcessDefinition",
      to: "ResourcePlanning",
      type: "REQUIRES",
      cardinality: "many:many"
    }
  ],

  validationRules: [
    {
      name: "validateProcessEfficiency",
      description: "Ensure process is designed for efficiency",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (data.processes && Array.isArray(data.processes)) {
          data.processes.forEach((process: any, index: number) => {
            if (process.steps && process.steps.length > 10) {
              warnings.push(`Process ${index + 1}: Consider breaking down complex process (${process.steps.length} steps)`);
            }
            
            const manualSteps = process.steps?.filter((s: any) => s.automationLevel === 'MANUAL') || [];
            if (manualSteps.length > process.steps?.length * 0.7) {
              warnings.push(`Process ${index + 1}: High manual effort (${manualSteps.length}/${process.steps?.length}) - consider automation`);
            }
          });
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      }
    }
  ]
};

export enum AutomationLevel {
  MANUAL = 'MANUAL',
  SEMI_AUTOMATED = 'SEMI_AUTOMATED',
  FULLY_AUTOMATED = 'FULLY_AUTOMATED'
}

export const OperationsUtils = {
  calculateProcessEfficiency: (process: any): number => {
    const automatedSteps = process.steps?.filter((s: any) => s.automationLevel === 'FULLY_AUTOMATED').length || 0;
    const totalSteps = process.steps?.length || 1;
    return (automatedSteps / totalSteps) * 100;
  }
};