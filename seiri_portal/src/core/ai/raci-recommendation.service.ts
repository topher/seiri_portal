// AI RACI Recommendation Service
// Uses OpenAI GPT-3.5-turbo to automatically recommend RACI assignments for initiatives

import OpenAI from 'openai';
import { SuiteType } from '@/core/suites/suite.model';

export interface RACIRecommendationRequest {
  initiativeName: string;
  description: string;
  initiativeType?: string;
  businessObjectives?: string[];
  estimatedValue?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RACIRecommendation {
  responsible: SuiteType[];
  accountable: SuiteType;
  consulted: SuiteType[];
  informed: SuiteType[];
  reasoning: {
    responsible: string;
    accountable: string;
    consulted: string;
    informed: string;
  };
  confidence: number; // 0-100
  alternativeOptions?: {
    responsible?: SuiteType[];
    accountable?: SuiteType;
    consulted?: SuiteType[];
    informed?: SuiteType[];
  };
}

export class AIRACIRecommendationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate RACI recommendations for an initiative using AI
   */
  async generateRACIRecommendation(
    request: RACIRecommendationRequest
  ): Promise<RACIRecommendation> {
    const prompt = this.buildRACIPrompt(request);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent recommendations
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      const recommendation = JSON.parse(responseContent) as RACIRecommendation;
      
      // Validate and sanitize the recommendation
      return this.validateAndSanitizeRecommendation(recommendation);

    } catch (error) {
      console.error('Error generating RACI recommendation:', error);
      
      // Fallback to rule-based recommendation
      return this.getFallbackRecommendation(request);
    }
  }

  /**
   * Get system prompt that explains RACI methodology and suites
   */
  private getSystemPrompt(): string {
    return `You are an expert business analyst specializing in RACI matrix assignments for cross-functional initiatives. 

SUITE DEFINITIONS:
- MARKETING: Product strategy, user research, personas, feature planning, roadmaps, market fit
- MARKETING: Brand, messaging, campaigns, lead generation, market analysis, customer acquisition  
- DEVELOPMENT: Technical implementation, architecture, coding, testing, infrastructure, deployment (also known as CODING)
- OPERATIONS: Business operations, processes, efficiency, resource management, compliance, scaling (also known as OPS)
- STRATEGY: Business strategy, planning, competitive analysis, partnerships, long-term vision
- SALES: Revenue generation, client relationships, deals, pricing, sales processes, customer success

IMPORTANT: When returning suite names, use these exact names: MARKETING, MARKETING, DEVELOPMENT, OPERATIONS, STRATEGY, SALES

RACI METHODOLOGY:
- RESPONSIBLE (R): Does the work to achieve the task. Can have multiple.
- ACCOUNTABLE (A): Ultimately answerable for completion. Only ONE per initiative.
- CONSULTED (C): Provides input and expertise. Two-way communication.
- INFORMED (I): Kept up-to-date on progress. One-way communication.

ASSIGNMENT PRINCIPLES:
1. Every initiative MUST have exactly ONE Accountable suite
2. At least one suite must be Responsible
3. Consider expertise overlap - don't overload suites
4. Higher value/priority initiatives need more coordination
5. Technical initiatives lean toward DEVELOPMENT
6. Customer-facing initiatives lean toward MARKETING/MARKETING
7. Revenue initiatives involve SALES heavily
8. Operational improvements center on OPERATIONS
9. Strategic initiatives center on STRATEGY

Return ONLY valid JSON with this exact structure:
{
  "responsible": ["SUITE1", "SUITE2"],
  "accountable": "SUITE1",
  "consulted": ["SUITE3"],
  "informed": ["SUITE4", "SUITE5"],
  "reasoning": {
    "responsible": "Why these suites do the work",
    "accountable": "Why this suite is ultimately answerable", 
    "consulted": "Why these suites provide expertise",
    "informed": "Why these suites need updates"
  },
  "confidence": 85
}`;
  }

  /**
   * Build the user prompt with initiative details
   */
  private buildRACIPrompt(request: RACIRecommendationRequest): string {
    return `Analyze this initiative and recommend RACI assignments:

INITIATIVE DETAILS:
Name: "${request.initiativeName}"
Description: "${request.description}"
Type: ${request.initiativeType || 'Not specified'}
Priority: ${request.priority || 'Not specified'}
Estimated Value: ${request.estimatedValue ? `$${request.estimatedValue.toLocaleString()}` : 'Not specified'}
Business Objectives: ${request.businessObjectives?.join(', ') || 'Not specified'}

Based on the initiative details above, recommend which of the 6 suites (MARKETING, MARKETING, DEVELOPMENT, OPERATIONS, STRATEGY, SALES) should be assigned to each RACI role.

Consider:
1. What type of work needs to be done?
2. Which suite has the primary expertise?
3. What level of coordination is needed?
4. Who are the key stakeholders?
5. What's the business impact?

Provide your recommendation as JSON with clear reasoning for each assignment.`;
  }

  /**
   * Validate and sanitize AI recommendation
   */
  private validateAndSanitizeRecommendation(
    recommendation: any
  ): RACIRecommendation {
    const validSuites: string[] = ['CUSTOM', 'DESIGN', 'ENGINEERING', 'MARKETING', 'OPERATIONS', 'SALES'];
    
    // Validate responsible array
    const responsible = Array.isArray(recommendation.responsible) 
      ? recommendation.responsible.filter((suite: string) => validSuites.includes(suite))
      : ['MARKETING']; // Default fallback

    // Validate accountable (must be single suite)
    const accountable = validSuites.includes(recommendation.accountable) 
      ? recommendation.accountable 
      : responsible[0] || 'MARKETING'; // Default to first responsible or MARKETING

    // Validate consulted array
    const consulted = Array.isArray(recommendation.consulted)
      ? recommendation.consulted.filter((suite: string) => validSuites.includes(suite))
      : [];

    // Validate informed array  
    const informed = Array.isArray(recommendation.informed)
      ? recommendation.informed.filter((suite: string) => validSuites.includes(suite))
      : [];

    // Ensure accountable is not in other arrays
    const cleanResponsible = responsible.filter((suite: SuiteType) => suite !== accountable);
    const cleanConsulted = consulted.filter((suite: SuiteType) => suite !== accountable && !cleanResponsible.includes(suite));
    const cleanInformed = informed.filter((suite: SuiteType) => 
      suite !== accountable && !cleanResponsible.includes(suite) && !cleanConsulted.includes(suite)
    );

    return {
      responsible: cleanResponsible.length > 0 ? cleanResponsible : [accountable],
      accountable: accountable as SuiteType,
      consulted: cleanConsulted as SuiteType[],
      informed: cleanInformed as SuiteType[],
      reasoning: {
        responsible: recommendation.reasoning?.responsible || 'Primary work execution',
        accountable: recommendation.reasoning?.accountable || 'Ultimate ownership and decision making',
        consulted: recommendation.reasoning?.consulted || 'Domain expertise and input',
        informed: recommendation.reasoning?.informed || 'Progress updates and coordination'
      },
      confidence: Math.min(100, Math.max(0, recommendation.confidence || 75))
    };
  }

  /**
   * Fallback rule-based recommendation when AI fails
   */
  private getFallbackRecommendation(
    request: RACIRecommendationRequest
  ): RACIRecommendation {
    const name = request.initiativeName.toLowerCase();
    const description = request.description.toLowerCase();
    const text = `${name} ${description}`;

    // Rule-based assignment based on keywords
    let responsible: string[] = [];
    let accountable: string = 'MARKETING';
    let consulted: string[] = [];
    let informed: string[] = [];

    // Technical initiatives
    if (text.includes('technical') || text.includes('development') || text.includes('code') || 
        text.includes('api') || text.includes('software') || text.includes('system')) {
      responsible = ['DEVELOPMENT'];
      accountable = 'DEVELOPMENT';
      consulted = ['MARKETING', 'OPERATIONS'];
      informed = ['STRATEGY'];
    }
    // Product initiatives  
    else if (text.includes('product') || text.includes('feature') || text.includes('user') ||
             text.includes('mvp') || text.includes('launch')) {
      responsible = ['MARKETING'];
      accountable = 'MARKETING';
      consulted = ['DEVELOPMENT', 'MARKETING'];
      informed = ['STRATEGY', 'SALES'];
    }
    // Marketing initiatives
    else if (text.includes('marketing') || text.includes('campaign') || text.includes('brand') ||
             text.includes('content') || text.includes('social')) {
      responsible = ['MARKETING'];
      accountable = 'MARKETING';
      consulted = ['MARKETING', 'SALES'];
      informed = ['STRATEGY'];
    }
    // Sales initiatives
    else if (text.includes('sales') || text.includes('revenue') || text.includes('client') ||
             text.includes('deal') || text.includes('customer')) {
      responsible = ['SALES'];
      accountable = 'SALES';
      consulted = ['MARKETING', 'MARKETING'];
      informed = ['STRATEGY', 'OPERATIONS'];
    }
    // Strategy initiatives
    else if (text.includes('strategy') || text.includes('business model') || text.includes('planning') ||
             text.includes('competitive') || text.includes('vision')) {
      responsible = ['STRATEGY'];
      accountable = 'STRATEGY';
      consulted = ['MARKETING', 'MARKETING', 'SALES'];
      informed = ['OPERATIONS', 'DEVELOPMENT'];
    }
    // Operations initiatives
    else if (text.includes('operations') || text.includes('process') || text.includes('efficiency') ||
             text.includes('workflow') || text.includes('optimization')) {
      responsible = ['OPERATIONS'];
      accountable = 'OPERATIONS';
      consulted = ['STRATEGY'];
      informed = ['MARKETING', 'DEVELOPMENT'];
    }
    // Default to product-led
    else {
      responsible = ['MARKETING'];
      accountable = 'MARKETING';
      consulted = ['STRATEGY'];
      informed = ['MARKETING', 'SALES'];
    }

    return {
      responsible: responsible as SuiteType[],
      accountable: accountable as SuiteType,
      consulted: consulted as SuiteType[],
      informed: informed as SuiteType[],
      reasoning: {
        responsible: 'Rule-based assignment based on initiative keywords',
        accountable: 'Default accountable suite for this type of initiative',
        consulted: 'Standard consultation pattern for this initiative type',
        informed: 'Standard information sharing for this initiative type'
      },
      confidence: 60 // Lower confidence for rule-based
    };
  }

  /**
   * Validate OpenAI API configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not configured - will use fallback recommendations');
        return false;
      }

      // Test API connectivity with a minimal request
      const test = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      });

      return !!test.choices[0]?.message;
    } catch (error) {
      console.warn('OpenAI API validation failed - will use fallback recommendations:', error);
      return false;
    }
  }
}

// Export singleton instance
export const aiRACIRecommendationService = new AIRACIRecommendationService();
export default aiRACIRecommendationService;