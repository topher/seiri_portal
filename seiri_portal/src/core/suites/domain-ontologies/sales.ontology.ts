// Sales Suite Domain Ontology
// Defines data structures and validation rules for Sales management

import { DomainOntology, ValidationResult } from '../suite.model';

export const SalesOntology: DomainOntology = {
  namespace: "https://seiri.ai/ontology/sales#",
  
  classes: [
    // Sales Strategy Class
    {
      name: "SalesStrategy",
      properties: [
        {
          name: "salesModel",
          type: "SalesModel",
          required: true
        },
        {
          name: "targetMarkets",
          type: "[String]",
          required: true,
          minItems: 1
        },
        {
          name: "salesChannels",
          type: "[SalesChannel]",
          required: true,
          minItems: 1
        },
        {
          name: "pricingStrategy",
          type: "PricingStrategy",
          required: true
        },
        {
          name: "salesTargets",
          type: "[SalesTarget]",
          required: true
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateSalesViability",
          message: "Sales strategy must be achievable and profitable"
        }
      ]
    },

    // Lead Qualification Class
    {
      name: "LeadQualification",
      properties: [
        {
          name: "qualificationCriteria",
          type: "[QualificationCriterion]",
          required: true,
          minItems: 3
        },
        {
          name: "scoringModel",
          type: "LeadScoringModel",
          required: true
        },
        {
          name: "conversionThresholds",
          type: "[ConversionThreshold]",
          required: true
        }
      ],
      constraints: []
    }
  ],

  relationships: [
    {
      from: "SalesStrategy",
      to: "LeadQualification",
      type: "USES",
      cardinality: "1:1"
    }
  ],

  validationRules: [
    {
      name: "validateSalesViability",
      description: "Ensure sales strategy is viable",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (data.salesStrategy) {
          const strategy = data.salesStrategy;
          
          if (!strategy.salesTargets || strategy.salesTargets.length === 0) {
            errors.push('Sales strategy must include specific targets');
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

export enum SalesModel {
  DIRECT = 'DIRECT',
  PARTNER = 'PARTNER',
  HYBRID = 'HYBRID',
  SELF_SERVICE = 'SELF_SERVICE'
}

export enum SalesChannel {
  INSIDE_SALES = 'INSIDE_SALES',
  FIELD_SALES = 'FIELD_SALES',
  ONLINE = 'ONLINE',
  PARTNER = 'PARTNER',
  RETAIL = 'RETAIL'
}

export const SalesUtils = {
  calculateConversionRate: (leads: number, conversions: number): number => {
    return leads > 0 ? (conversions / leads) * 100 : 0;
  }
};