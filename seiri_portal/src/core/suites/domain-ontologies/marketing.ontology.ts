// Marketing Suite Domain Ontology
// Defines data structures and validation rules for Marketing management

import { DomainOntology, ValidationResult } from '../suite.model';

export const MarketingOntology: DomainOntology = {
  namespace: "https://seiri.ai/ontology/marketing#",
  
  classes: [
    // Customer Segment Class Definition
    {
      name: "CustomerSegment",
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
          name: "size",
          type: "Number",
          required: true
        },
        {
          name: "growthRate",
          type: "Number",
          required: true
        },
        {
          name: "demographics",
          type: "SegmentDemographics",
          required: true
        },
        {
          name: "psychographics",
          type: "Psychographics",
          required: true
        },
        {
          name: "channels",
          type: "[MarketingChannel]",
          required: true,
          minItems: 2
        },
        {
          name: "messaging",
          type: "MessagingStrategy",
          required: true
        },
        {
          name: "acquisitionCost",
          type: "Number",
          required: false
        },
        {
          name: "lifetimeValue",
          type: "Number",
          required: false
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateSegmentViability",
          message: "Segment must be large enough and accessible to be viable"
        },
        {
          type: "custom",
          value: "validateLTVCACRatio",
          message: "Lifetime Value should be at least 3x Customer Acquisition Cost"
        }
      ]
    },

    // Marketing Campaign Class Definition
    {
      name: "MarketingCampaign",
      properties: [
        {
          name: "name",
          type: "String",
          required: true
        },
        {
          name: "objective",
          type: "CampaignObjective",
          required: true
        },
        {
          name: "targetSegments",
          type: "[String]", // Segment IDs
          required: true,
          minItems: 1
        },
        {
          name: "channels",
          type: "[MarketingChannel]",
          required: true,
          minItems: 1
        },
        {
          name: "budget",
          type: "Number",
          required: true
        },
        {
          name: "duration",
          type: "Number", // Days
          required: true
        },
        {
          name: "messaging",
          type: "CampaignMessaging",
          required: true
        },
        {
          name: "kpis",
          type: "[KPI]",
          required: true,
          minItems: 2
        },
        {
          name: "creativeAssets",
          type: "[CreativeAsset]",
          required: false
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateCampaignBudgetAllocation",
          message: "Budget allocation across channels must be strategic"
        }
      ]
    },

    // Brand Strategy Class Definition
    {
      name: "BrandStrategy",
      properties: [
        {
          name: "brandPromise",
          type: "String",
          required: true,
          minItems: 20
        },
        {
          name: "valueProposition",
          type: "String",
          required: true,
          minItems: 30
        },
        {
          name: "brandPersonality",
          type: "[BrandTrait]",
          required: true,
          minItems: 3,
          maxItems: 7
        },
        {
          name: "brandValues",
          type: "[String]",
          required: true,
          minItems: 3,
          maxItems: 5
        },
        {
          name: "brandVoice",
          type: "BrandVoice",
          required: true
        },
        {
          name: "visualIdentity",
          type: "VisualIdentity",
          required: false
        },
        {
          name: "competitivePositioning",
          type: "String",
          required: true
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateBrandCoherence",
          message: "Brand elements must be coherent and aligned"
        }
      ]
    },

    // Content Strategy Class Definition
    {
      name: "ContentStrategy",
      properties: [
        {
          name: "contentPillars",
          type: "[ContentPillar]",
          required: true,
          minItems: 3,
          maxItems: 6
        },
        {
          name: "audienceMapping",
          type: "[AudienceContent]",
          required: true
        },
        {
          name: "contentTypes",
          type: "[ContentType]",
          required: true,
          minItems: 3
        },
        {
          name: "publishingFrequency",
          type: "PublishingSchedule",
          required: true
        },
        {
          name: "distributionChannels",
          type: "[MarketingChannel]",
          required: true
        },
        {
          name: "seoStrategy",
          type: "SEOStrategy",
          required: false
        }
      ],
      constraints: []
    },

    // Market Analysis Class Definition
    {
      name: "MarketAnalysis",
      properties: [
        {
          name: "marketSize",
          type: "MarketSize",
          required: true
        },
        {
          name: "competitorAnalysis",
          type: "[Competitor]",
          required: true,
          minItems: 3
        },
        {
          name: "trends",
          type: "[MarketTrend]",
          required: true,
          minItems: 3
        },
        {
          name: "opportunities",
          type: "[MarketOpportunity]",
          required: true
        },
        {
          name: "threats",
          type: "[MarketThreat]",
          required: true
        },
        {
          name: "swotAnalysis",
          type: "SWOTAnalysis",
          required: false
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateMarketSizing",
          message: "Market sizing must include TAM, SAM, and SOM"
        }
      ]
    }
  ],

  relationships: [
    {
      from: "CustomerSegment",
      to: "MarketingCampaign",
      type: "TARGETED_BY",
      cardinality: "many:many"
    },
    {
      from: "BrandStrategy",
      to: "MarketingCampaign",
      type: "GUIDES",
      cardinality: "1:many"
    },
    {
      from: "ContentStrategy",
      to: "MarketingCampaign",
      type: "SUPPORTS",
      cardinality: "1:many"
    },
    {
      from: "MarketAnalysis",
      to: "CustomerSegment",
      type: "IDENTIFIES",
      cardinality: "1:many"
    },
    {
      from: "CustomerSegment",
      to: "ContentStrategy",
      type: "INFORMS",
      cardinality: "1:many"
    }
  ],

  validationRules: [
    {
      name: "validateSegmentViability",
      description: "Ensure customer segments are large enough and accessible",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (data.segments && Array.isArray(data.segments)) {
          data.segments.forEach((segment: any, index: number) => {
            if (segment.size < 10000) {
              warnings.push(`Segment ${index + 1}: Size (${segment.size}) may be too small for viable targeting`);
            }
            
            if (segment.channels && segment.channels.length < 2) {
              errors.push(`Segment ${index + 1}: Must have at least 2 accessible marketing channels`);
            }
            
            if (segment.growthRate < -5) {
              warnings.push(`Segment ${index + 1}: Negative growth rate (${segment.growthRate}%) indicates declining market`);
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
      name: "validateLTVCACRatio",
      description: "Ensure lifetime value to customer acquisition cost ratio is healthy",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (data.segments && Array.isArray(data.segments)) {
          data.segments.forEach((segment: any, index: number) => {
            if (segment.lifetimeValue && segment.acquisitionCost) {
              const ratio = segment.lifetimeValue / segment.acquisitionCost;
              
              if (ratio < 3) {
                errors.push(`Segment ${index + 1}: LTV:CAC ratio (${ratio.toFixed(1)}) is below minimum threshold of 3:1`);
              } else if (ratio < 5) {
                warnings.push(`Segment ${index + 1}: LTV:CAC ratio (${ratio.toFixed(1)}) is acceptable but could be improved`);
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
      name: "validateMarketSizing",
      description: "Ensure market analysis includes proper sizing methodology",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];

        if (data.marketAnalysis) {
          const analysis = data.marketAnalysis;
          
          if (!analysis.marketSize) {
            errors.push('Market analysis must include market sizing');
          } else {
            if (!analysis.marketSize.tam) {
              errors.push('Market sizing must include Total Addressable Market (TAM)');
            }
            if (!analysis.marketSize.sam) {
              errors.push('Market sizing must include Serviceable Addressable Market (SAM)');
            }
            if (!analysis.marketSize.som) {
              errors.push('Market sizing must include Serviceable Obtainable Market (SOM)');
            }
          }
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

// Enums for Marketing Domain
export enum CampaignObjective {
  AWARENESS = 'AWARENESS',
  CONSIDERATION = 'CONSIDERATION',
  CONVERSION = 'CONVERSION',
  RETENTION = 'RETENTION',
  ADVOCACY = 'ADVOCACY'
}

export enum MarketingChannel {
  PAID_SEARCH = 'PAID_SEARCH',
  PAID_SOCIAL = 'PAID_SOCIAL',
  EMAIL = 'EMAIL',
  CONTENT_MARKETING = 'CONTENT_MARKETING',
  SEO = 'SEO',
  INFLUENCER = 'INFLUENCER',
  PR = 'PR',
  EVENTS = 'EVENTS',
  DIRECT_MAIL = 'DIRECT_MAIL',
  RADIO = 'RADIO',
  TV = 'TV',
  OUTDOOR = 'OUTDOOR'
}

export enum BrandTrait {
  INNOVATIVE = 'INNOVATIVE',
  TRUSTWORTHY = 'TRUSTWORTHY',
  FRIENDLY = 'FRIENDLY',
  PROFESSIONAL = 'PROFESSIONAL',
  LUXURIOUS = 'LUXURIOUS',
  ACCESSIBLE = 'ACCESSIBLE',
  BOLD = 'BOLD',
  TRADITIONAL = 'TRADITIONAL',
  MODERN = 'MODERN',
  AUTHENTIC = 'AUTHENTIC'
}

export enum ContentType {
  BLOG_POST = 'BLOG_POST',
  VIDEO = 'VIDEO',
  INFOGRAPHIC = 'INFOGRAPHIC',
  PODCAST = 'PODCAST',
  WEBINAR = 'WEBINAR',
  CASE_STUDY = 'CASE_STUDY',
  WHITE_PAPER = 'WHITE_PAPER',
  SOCIAL_POST = 'SOCIAL_POST',
  EMAIL_NEWSLETTER = 'EMAIL_NEWSLETTER',
  INTERACTIVE_TOOL = 'INTERACTIVE_TOOL'
}

// Supporting type definitions
export interface SegmentDemographics {
  ageRange: string;
  income: string;
  education: string;
  location: string;
  occupation: string;
}

export interface Psychographics {
  values: string[];
  interests: string[];
  lifestyle: string;
  personality: string;
  attitudes: string[];
}

export interface MessagingStrategy {
  primaryMessage: string;
  supportingMessages: string[];
  tonalAttributes: string[];
  keyBenefits: string[];
  callToAction: string;
}

export interface CampaignMessaging {
  headline: string;
  subheadline: string;
  bodyText: string;
  callToAction: string;
  valueProposition: string;
}

export interface KPI {
  name: string;
  target: number;
  measurement: string;
  timeframe: string;
}

export interface CreativeAsset {
  type: string;
  description: string;
  specifications: Record<string, any>;
}

export interface BrandVoice {
  tone: string;
  personality: string[];
  communicationStyle: string;
  doAndDonts: {
    do: string[];
    dont: string[];
  };
}

export interface VisualIdentity {
  colorPalette: string[];
  typography: string[];
  logoGuidelines: string;
  imageStyle: string;
}

export interface ContentPillar {
  name: string;
  description: string;
  percentage: number; // % of content
  topics: string[];
}

export interface MarketSize {
  tam: number; // Total Addressable Market
  sam: number; // Serviceable Addressable Market
  som: number; // Serviceable Obtainable Market
  methodology: string;
}

export interface Competitor {
  name: string;
  marketShare: number;
  strengths: string[];
  weaknesses: string[];
  positioning: string;
}

export interface MarketTrend {
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe: string;
  implications: string[];
}

export interface MarketOpportunity {
  description: string;
  size: number;
  feasibility: 'LOW' | 'MEDIUM' | 'HIGH';
  timeToCapture: string;
}

export interface MarketThreat {
  description: string;
  probability: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigation: string;
}

// Marketing-specific utility functions
export const MarketingUtils = {
  // Calculate segment attractiveness score
  calculateSegmentAttractiveness: (segment: any): number => {
    let score = 0;
    
    // Size (30% weight)
    if (segment.size > 1000000) score += 30;
    else if (segment.size > 100000) score += 20;
    else if (segment.size > 10000) score += 10;
    
    // Growth rate (25% weight)
    if (segment.growthRate > 10) score += 25;
    else if (segment.growthRate > 5) score += 20;
    else if (segment.growthRate > 0) score += 15;
    
    // Accessibility (25% weight)
    const channelScore = Math.min(segment.channels?.length || 0, 5) * 5;
    score += channelScore;
    
    // Economics (20% weight)
    if (segment.lifetimeValue && segment.acquisitionCost) {
      const ratio = segment.lifetimeValue / segment.acquisitionCost;
      if (ratio > 10) score += 20;
      else if (ratio > 5) score += 15;
      else if (ratio > 3) score += 10;
    }
    
    return Math.min(score, 100);
  },

  // Optimize budget allocation across channels
  optimizeBudgetAllocation: (channels: any[], totalBudget: number): Record<string, number> => {
    // Simple optimization based on historical performance
    const allocation: Record<string, number> = {};
    
    // Calculate performance scores
    const performanceScores = channels.map(channel => ({
      channel: channel.name,
      score: (channel.conversion_rate || 0.02) / (channel.cost_per_click || 1)
    }));
    
    // Sort by performance
    performanceScores.sort((a, b) => b.score - a.score);
    
    // Allocate budget (60% to top performers, 40% distributed)
    const topPerformerBudget = totalBudget * 0.6;
    const distributedBudget = totalBudget * 0.4;
    
    performanceScores.forEach((channel, index) => {
      if (index < 2) {
        // Top 2 performers get 30% each
        allocation[channel.channel] = topPerformerBudget / 2;
      } else {
        // Others share remaining budget
        allocation[channel.channel] = distributedBudget / (performanceScores.length - 2);
      }
    });
    
    return allocation;
  },

  // Generate campaign recommendations
  generateCampaignRecommendations: (segments: any[], objectives: CampaignObjective[]): string[] => {
    const recommendations: string[] = [];
    
    // Segment-based recommendations
    const highValueSegments = segments.filter(s => 
      MarketingUtils.calculateSegmentAttractiveness(s) > 70
    );
    
    if (highValueSegments.length > 0) {
      recommendations.push(`Focus campaigns on high-value segments: ${highValueSegments.map(s => s.name).join(', ')}`);
    }
    
    // Objective-based recommendations
    if (objectives.includes(CampaignObjective.AWARENESS)) {
      recommendations.push('Use broad-reach channels like social media and content marketing for awareness');
    }
    
    if (objectives.includes(CampaignObjective.CONVERSION)) {
      recommendations.push('Implement retargeting campaigns and optimize landing pages for conversion');
    }
    
    return recommendations;
  },

  // Validate campaign performance
  validateCampaignPerformance: (campaign: any, results: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (campaign.kpis && results) {
      campaign.kpis.forEach((kpi: KPI) => {
        const actualValue = results[kpi.name];
        if (actualValue !== undefined) {
          const performance = (actualValue / kpi.target) * 100;
          
          if (performance < 50) {
            errors.push(`${kpi.name} severely underperformed: ${performance.toFixed(1)}% of target`);
          } else if (performance < 80) {
            warnings.push(`${kpi.name} underperformed: ${performance.toFixed(1)}% of target`);
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
};