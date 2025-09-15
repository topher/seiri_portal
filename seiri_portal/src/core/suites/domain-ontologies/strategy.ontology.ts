// Strategy Suite Domain Ontology
// Defines data structures and validation rules for Strategy management

import { DomainOntology, ValidationResult } from '../suite.model';

export const StrategyOntology: DomainOntology = {
  namespace: "https://seiri.ai/ontology/strategy#",
  
  classes: [
    // Strategic Plan Class
    {
      name: "StrategicPlan",
      properties: [
        {
          name: "vision",
          type: "String",
          required: true,
          minItems: 50
        },
        {
          name: "mission",
          type: "String",
          required: true,
          minItems: 30
        },
        {
          name: "objectives",
          type: "[StrategicObjective]",
          required: true,
          minItems: 3,
          maxItems: 7
        },
        {
          name: "initiatives",
          type: "[String]", // Initiative IDs
          required: true
        },
        {
          name: "timeframe",
          type: "String",
          required: true
        },
        {
          name: "successMetrics",
          type: "[SuccessMetric]",
          required: true,
          minItems: 5
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateStrategicAlignment",
          message: "Strategic objectives must align with vision and mission"
        }
      ]
    },

    // Business Model Class
    {
      name: "BusinessModel",
      properties: [
        {
          name: "valueProposition",
          type: "String",
          required: true
        },
        {
          name: "customerSegments",
          type: "[String]",
          required: true,
          minItems: 1
        },
        {
          name: "revenueStreams",
          type: "[RevenueStream]",
          required: true,
          minItems: 1
        },
        {
          name: "costStructure",
          type: "CostStructure",
          required: true
        },
        {
          name: "keyResources",
          type: "[String]",
          required: true
        },
        {
          name: "keyPartners",
          type: "[String]",
          required: false
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateBusinessModelViability",
          message: "Business model must be financially viable"
        }
      ]
    }
  ],

  relationships: [
    {
      from: "StrategicPlan",
      to: "BusinessModel",
      type: "SUPPORTS",
      cardinality: "1:1"
    }
  ],

  validationRules: [
    {
      name: "validateStrategicAlignment",
      description: "Ensure strategic components are aligned",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (data.strategicPlan) {
          const plan = data.strategicPlan;
          
          if (!plan.vision || plan.vision.length < 50) {
            errors.push('Vision statement must be comprehensive (minimum 50 characters)');
          }
          
          if (plan.objectives && plan.objectives.length > 7) {
            warnings.push('More than 7 strategic objectives may dilute focus');
          }
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

export const StrategyUtils = {
  calculateStrategicAlignment: (objectives: any[]): number => {
    // Mock calculation for strategic alignment score
    return Math.min(100, objectives.length * 15);
  }
};