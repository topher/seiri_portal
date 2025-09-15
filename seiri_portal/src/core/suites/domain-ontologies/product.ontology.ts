// Product Suite Domain Ontology
// Defines data structures and validation rules for Product management

import { DomainOntology, ValidationResult, OntologyClass, PropertyDefinition, Constraint } from '../suite.model';

export const ProductOntology: DomainOntology = {
  namespace: "https://seiri.ai/ontology/product#",
  
  classes: [
    // Persona Class Definition
    {
      name: "Persona",
      properties: [
        {
          name: "name",
          type: "String",
          required: true,
          pattern: "^[A-Za-z\\s]{2,50}$"
        },
        {
          name: "demographics",
          type: "Demographics",
          required: true
        },
        {
          name: "goals",
          type: "[Goal]",
          required: true,
          minItems: 1,
          maxItems: 5
        },
        {
          name: "painPoints",
          type: "[PainPoint]",
          required: true,
          minItems: 2,
          maxItems: 8
        },
        {
          name: "jobsToBeDone",
          type: "[Job]",
          required: true,
          minItems: 3,
          maxItems: 10
        },
        {
          name: "behaviorPatterns",
          type: "[BehaviorPattern]",
          required: false,
          minItems: 1,
          maxItems: 5
        },
        {
          name: "preferredChannels",
          type: "[Channel]",
          required: false,
          minItems: 1,
          maxItems: 3
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validatePersonaCoherence",
          message: "Persona goals and pain points must be coherent"
        },
        {
          type: "custom", 
          value: "validateHighValuePainPoints",
          message: "At least 2 pain points must have severity >= 7"
        }
      ]
    },

    // Demographics Class
    {
      name: "Demographics",
      properties: [
        {
          name: "ageRange",
          type: "String",
          required: true,
          pattern: "^\\d{2}-\\d{2}$"
        },
        {
          name: "occupation",
          type: "String",
          required: true
        },
        {
          name: "income",
          type: "String",
          required: false
        },
        {
          name: "location",
          type: "String",
          required: false
        },
        {
          name: "education",
          type: "String",
          required: false
        }
      ],
      constraints: []
    },

    // Goal Class Definition
    {
      name: "Goal",
      properties: [
        {
          name: "description",
          type: "String",
          required: true,
          minItems: 10,
          maxItems: 200
        },
        {
          name: "priority",
          type: "GoalPriority",
          required: true
        },
        {
          name: "frequency",
          type: "Frequency",
          required: true
        },
        {
          name: "successCriteria",
          type: "String",
          required: true
        },
        {
          name: "currentSolution",
          type: "String",
          required: false
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateGoalMeasurability",
          message: "Goals must have measurable success criteria"
        }
      ]
    },

    // Pain Point Class Definition
    {
      name: "PainPoint",
      properties: [
        {
          name: "description",
          type: "String",
          required: true,
          minItems: 10,
          maxItems: 300
        },
        {
          name: "severity",
          type: "Number",
          required: true,
          minItems: 1,
          maxItems: 10
        },
        {
          name: "frequency",
          type: "Frequency",
          required: true
        },
        {
          name: "category",
          type: "PainCategory",
          required: true
        },
        {
          name: "currentWorkaround",
          type: "String",
          required: false
        },
        {
          name: "impact",
          type: "ImpactLevel",
          required: true
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validatePainImpactAlignment",
          message: "High severity pain points must have significant impact"
        }
      ]
    },

    // Job-to-be-Done Class Definition
    {
      name: "Job",
      properties: [
        {
          name: "description",
          type: "String",
          required: true,
          minItems: 15,
          maxItems: 250
        },
        {
          name: "jobType",
          type: "JobType",
          required: true
        },
        {
          name: "frequency",
          type: "Frequency",
          required: true
        },
        {
          name: "importance",
          type: "Number",
          required: true,
          minItems: 1,
          maxItems: 10
        },
        {
          name: "satisfaction",
          type: "Number",
          required: true,
          minItems: 1,
          maxItems: 10
        },
        {
          name: "opportunity",
          type: "Number",
          required: false // Calculated: importance + (importance - satisfaction)
        },
        {
          name: "desiredOutcome",
          type: "String",
          required: true
        },
        {
          name: "contextualTriggers",
          type: "[String]",
          required: false,
          minItems: 1,
          maxItems: 5
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateJobOpportunity",
          message: "Jobs with low satisfaction must have high importance to be valuable"
        }
      ]
    },

    // Behavior Pattern Class Definition
    {
      name: "BehaviorPattern",
      properties: [
        {
          name: "context",
          type: "String",
          required: true
        },
        {
          name: "trigger",
          type: "String",
          required: true
        },
        {
          name: "action",
          type: "String",
          required: true
        },
        {
          name: "frequency",
          type: "Frequency",
          required: true
        }
      ],
      constraints: []
    },

    // Product Requirement Class Definition
    {
      name: "ProductRequirement",
      properties: [
        {
          name: "title",
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
          name: "priority",
          type: "RequirementPriority",
          required: true
        },
        {
          name: "personas",
          type: "[String]", // Persona IDs
          required: true,
          minItems: 1
        },
        {
          name: "jobs",
          type: "[String]", // Job IDs
          required: true,
          minItems: 1
        },
        {
          name: "acceptanceCriteria",
          type: "[String]",
          required: true,
          minItems: 1
        },
        {
          name: "businessValue",
          type: "String",
          required: true
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateRequirementTraceability",
          message: "Requirements must trace to specific personas and jobs"
        }
      ]
    }
  ],

  relationships: [
    {
      from: "Persona",
      to: "Goal",
      type: "HAS_GOAL",
      cardinality: "1:many"
    },
    {
      from: "Persona", 
      to: "PainPoint",
      type: "HAS_PAIN_POINT",
      cardinality: "1:many"
    },
    {
      from: "Persona",
      to: "Job",
      type: "HAS_JOB",
      cardinality: "1:many"
    },
    {
      from: "Goal",
      to: "Job",
      type: "ENABLES",
      cardinality: "many:many"
    },
    {
      from: "PainPoint",
      to: "Job", 
      type: "PREVENTS",
      cardinality: "many:many"
    },
    {
      from: "ProductRequirement",
      to: "Persona",
      type: "SERVES",
      cardinality: "many:many"
    },
    {
      from: "ProductRequirement",
      to: "Job",
      type: "ADDRESSES",
      cardinality: "many:many"
    }
  ],

  validationRules: [
    {
      name: "validatePersonaCoherence",
      description: "Ensure persona goals and pain points are logically coherent",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (data.personas && Array.isArray(data.personas)) {
          data.personas.forEach((persona: any, index: number) => {
            // Check goal-pain point alignment
            if (persona.goals && persona.painPoints) {
              const goalKeywords = persona.goals.flatMap((g: any) => 
                g.description.toLowerCase().split(' ')
              );
              const painKeywords = persona.painPoints.flatMap((p: any) => 
                p.description.toLowerCase().split(' ')
              );
              
              const overlap = goalKeywords.filter((word: string) => 
                painKeywords.includes(word) && word.length > 3
              );
              
              if (overlap.length < 2) {
                warnings.push(`Persona ${index + 1}: Goals and pain points should have more thematic overlap`);
              }
            }
          });
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      }
    },

    {
      name: "validateHighValuePainPoints",
      description: "Ensure personas have sufficient high-value pain points",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];

        if (data.personas && Array.isArray(data.personas)) {
          data.personas.forEach((persona: any, index: number) => {
            if (persona.painPoints && Array.isArray(persona.painPoints)) {
              const highSeverityPains = persona.painPoints.filter((p: any) => p.severity >= 7);
              if (highSeverityPains.length < 2) {
                errors.push(`Persona ${index + 1}: Must have at least 2 pain points with severity >= 7`);
              }
            }
          });
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings: []
        };
      }
    },

    {
      name: "validateJobOpportunity", 
      description: "Ensure jobs have appropriate opportunity scores",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (data.jobs && Array.isArray(data.jobs)) {
          data.jobs.forEach((job: any, index: number) => {
            if (job.importance && job.satisfaction) {
              const opportunityScore = job.importance + (job.importance - job.satisfaction);
              
              // High importance + low satisfaction = high opportunity
              if (job.importance >= 8 && job.satisfaction <= 4 && opportunityScore < 12) {
                warnings.push(`Job ${index + 1}: High importance with low satisfaction should create significant opportunity`);
              }
              
              // Low opportunity jobs might not be worth addressing
              if (opportunityScore < 6) {
                warnings.push(`Job ${index + 1}: Low opportunity score (${opportunityScore}) - consider if this job is worth addressing`);
              }
            }
          });
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      }
    },

    {
      name: "validateRequirementTraceability",
      description: "Ensure product requirements trace to personas and jobs",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];

        if (data.requirements && Array.isArray(data.requirements)) {
          data.requirements.forEach((req: any, index: number) => {
            if (!req.personas || req.personas.length === 0) {
              errors.push(`Requirement ${index + 1}: Must specify target personas`);
            }
            if (!req.jobs || req.jobs.length === 0) {
              errors.push(`Requirement ${index + 1}: Must address specific jobs-to-be-done`);
            }
            if (!req.businessValue || req.businessValue.trim().length < 20) {
              errors.push(`Requirement ${index + 1}: Must have clear business value description`);
            }
          });
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings: []
        };
      }
    }
  ]
};

// Enums for Product Domain
export enum GoalPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', 
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum Frequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  RARELY = 'RARELY'
}

export enum PainCategory {
  TIME = 'TIME',
  COST = 'COST',
  QUALITY = 'QUALITY',
  CONVENIENCE = 'CONVENIENCE',
  EMOTIONAL = 'EMOTIONAL',
  FUNCTIONAL = 'FUNCTIONAL'
}

export enum ImpactLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum JobType {
  FUNCTIONAL = 'FUNCTIONAL',
  EMOTIONAL = 'EMOTIONAL',
  SOCIAL = 'SOCIAL'
}

export enum RequirementPriority {
  MUST_HAVE = 'MUST_HAVE',
  SHOULD_HAVE = 'SHOULD_HAVE',
  COULD_HAVE = 'COULD_HAVE',
  WONT_HAVE = 'WONT_HAVE'
}

export enum Channel {
  WEB = 'WEB',
  MOBILE = 'MOBILE',
  EMAIL = 'EMAIL',
  SOCIAL = 'SOCIAL',
  PHONE = 'PHONE',
  IN_PERSON = 'IN_PERSON'
}

// Product-specific utility functions
export const ProductUtils = {
  // Calculate job opportunity score
  calculateJobOpportunity: (importance: number, satisfaction: number): number => {
    return importance + (importance - satisfaction);
  },

  // Rank jobs by opportunity
  rankJobsByOpportunity: (jobs: any[]): any[] => {
    return jobs
      .map(job => ({
        ...job,
        opportunity: ProductUtils.calculateJobOpportunity(job.importance, job.satisfaction)
      }))
      .sort((a, b) => b.opportunity - a.opportunity);
  },

  // Find gaps in persona coverage
  findPersonaGaps: (personas: any[]): string[] => {
    const gaps: string[] = [];
    
    // Check demographic coverage
    const ageRanges = personas.map(p => p.demographics?.ageRange).filter(Boolean);
    if (new Set(ageRanges).size < 2) {
      gaps.push('Limited age range coverage');
    }
    
    // Check goal diversity
    const allGoals = personas.flatMap(p => p.goals || []);
    const uniqueGoalTypes = new Set(allGoals.map(g => g.priority));
    if (uniqueGoalTypes.size < 3) {
      gaps.push('Limited goal priority diversity');
    }
    
    // Check pain point categories
    const allPainPoints = personas.flatMap(p => p.painPoints || []);
    const painCategories = new Set(allPainPoints.map(p => p.category));
    if (painCategories.size < 3) {
      gaps.push('Limited pain point category coverage');
    }
    
    return gaps;
  },

  // Validate persona set completeness
  validatePersonaSet: (personas: any[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (personas.length < 3) {
      errors.push('Minimum 3 personas required for comprehensive coverage');
    }
    
    if (personas.length > 7) {
      warnings.push('More than 7 personas may be difficult to manage - consider consolidation');
    }
    
    const gaps = ProductUtils.findPersonaGaps(personas);
    warnings.push(...gaps);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  // Generate persona insights
  generatePersonaInsights: (personas: any[]): {
    primaryPainPoints: string[];
    topOpportunities: string[];
    behaviorPatterns: string[];
    recommendations: string[];
  } => {
    const allPainPoints = personas.flatMap(p => p.painPoints || []);
    const highSeverityPains = allPainPoints
      .filter(p => p.severity >= 7)
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 5);
    
    const allJobs = personas.flatMap(p => p.jobsToBeDone || []);
    const topOpportunityJobs = ProductUtils.rankJobsByOpportunity(allJobs).slice(0, 5);
    
    const allBehaviors = personas.flatMap(p => p.behaviorPatterns || []);
    const commonBehaviors = allBehaviors
      .filter(b => b.frequency === 'DAILY' || b.frequency === 'WEEKLY')
      .slice(0, 3);
    
    const recommendations = [];
    if (highSeverityPains.length > 0) {
      recommendations.push(`Focus on addressing ${highSeverityPains[0].category} pain points`);
    }
    if (topOpportunityJobs.length > 0) {
      recommendations.push(`Prioritize ${topOpportunityJobs[0].jobType} jobs with high opportunity scores`);
    }
    
    return {
      primaryPainPoints: highSeverityPains.map(p => p.description),
      topOpportunities: topOpportunityJobs.map(j => j.description),
      behaviorPatterns: commonBehaviors.map(b => `${b.context}: ${b.action}`),
      recommendations
    };
  }
};