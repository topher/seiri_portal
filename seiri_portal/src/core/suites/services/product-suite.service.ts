// Product Suite Service
// Handles product management, persona development, and requirements analysis

import { SuiteType, ValidationResult } from '../suite.model';
import { AbstractSuiteService, SuiteInsights, ProcessedDeliverable } from './base-suite.service';
import { ProductUtils } from '../domain-ontologies/product.ontology';

export class ProductSuiteService extends AbstractSuiteService {
  suiteType = SuiteType.PRODUCT;

  async generateInsights(data: any): Promise<SuiteInsights> {
    const insights: SuiteInsights = {
      summary: '',
      keyMetrics: [],
      recommendations: [],
      warnings: [],
      opportunities: []
    };

    try {
      // Analyze personas
      if (data.personas && Array.isArray(data.personas)) {
        const personaInsights = ProductUtils.generatePersonaInsights(data.personas);
        
        insights.keyMetrics.push(
          { name: 'Total Personas', value: data.personas.length },
          { name: 'High-Severity Pain Points', value: personaInsights.primaryPainPoints.length },
          { name: 'Top Opportunities', value: personaInsights.topOpportunities.length }
        );
        
        insights.recommendations.push(...personaInsights.recommendations);
        
        // Validate persona set completeness
        const personaValidation = ProductUtils.validatePersonaSet(data.personas);
        if (!personaValidation.isValid) {
          insights.warnings.push(...personaValidation.errors);
        }
        insights.warnings.push(...personaValidation.warnings);
      }

      // Analyze jobs-to-be-done
      if (data.jobs && Array.isArray(data.jobs)) {
        const rankedJobs = ProductUtils.rankJobsByOpportunity(data.jobs);
        const highOpportunityJobs = rankedJobs.filter(job => job.opportunity > 12);
        
        insights.keyMetrics.push(
          { name: 'Total Jobs Identified', value: data.jobs.length },
          { name: 'High Opportunity Jobs', value: highOpportunityJobs.length },
          { name: 'Average Opportunity Score', value: Math.round(rankedJobs.reduce((sum, job) => sum + job.opportunity, 0) / rankedJobs.length) }
        );
        
        if (highOpportunityJobs.length > 0) {
          insights.opportunities.push(`${highOpportunityJobs.length} high-opportunity jobs identified for immediate focus`);
          insights.recommendations.push(`Prioritize features addressing: ${highOpportunityJobs.slice(0, 3).map(j => j.description.substring(0, 50) + '...').join(', ')}`);
        }
      }

      // Analyze requirements
      if (data.requirements && Array.isArray(data.requirements)) {
        const mustHaveRequirements = data.requirements.filter((r: any) => r.priority === 'MUST_HAVE');
        const shouldHaveRequirements = data.requirements.filter((r: any) => r.priority === 'SHOULD_HAVE');
        
        insights.keyMetrics.push(
          { name: 'Total Requirements', value: data.requirements.length },
          { name: 'Must-Have Requirements', value: mustHaveRequirements.length },
          { name: 'Should-Have Requirements', value: shouldHaveRequirements.length }
        );
        
        if (mustHaveRequirements.length > shouldHaveRequirements.length) {
          insights.warnings.push('High ratio of must-have requirements may indicate scope creep');
        }
      }

      // Generate summary
      const personaCount = data.personas?.length || 0;
      const jobCount = data.jobs?.length || 0;
      const requirementCount = data.requirements?.length || 0;
      
      insights.summary = `Product suite analysis: ${personaCount} personas, ${jobCount} jobs-to-be-done, ${requirementCount} requirements. ${insights.opportunities.length} opportunities identified.`;
      
      // Add gap analysis
      const gaps = ProductUtils.findPersonaGaps(data.personas || []);
      if (gaps.length > 0) {
        insights.warnings.push(...gaps);
        insights.recommendations.push('Address persona coverage gaps for more comprehensive market understanding');
      }

    } catch (error) {
      insights.warnings.push(`Error generating insights: ${error instanceof Error ? error.message : String(error)}`);
    }

    return insights;
  }

  async suggestImprovements(data: any): Promise<string[]> {
    const improvements: Array<{
      text: string;
      impact: 'low' | 'medium' | 'high';
      effort: 'low' | 'medium' | 'high';
    }> = [];

    // Persona improvements
    if (data.personas) {
      const personaValidation = ProductUtils.validatePersonaSet(data.personas);
      if (data.personas.length < 3) {
        improvements.push({
          text: 'Develop additional personas for better market coverage',
          impact: 'high',
          effort: 'medium'
        });
      }
      
      if (personaValidation.warnings.length > 0) {
        improvements.push({
          text: 'Address persona coverage gaps identified in analysis',
          impact: 'medium',
          effort: 'low'
        });
      }
    }

    // Jobs-to-be-done improvements
    if (data.jobs) {
      const rankedJobs = ProductUtils.rankJobsByOpportunity(data.jobs);
      const lowOpportunityJobs = rankedJobs.filter(job => job.opportunity < 6);
      
      if (lowOpportunityJobs.length > rankedJobs.length * 0.5) {
        improvements.push({
          text: 'Focus research on higher-impact jobs-to-be-done',
          impact: 'high',
          effort: 'medium'
        });
      }
    }

    // Requirements improvements
    if (data.requirements) {
      const requirementsWithoutPersonas = data.requirements.filter((r: any) => !r.personas || r.personas.length === 0);
      if (requirementsWithoutPersonas.length > 0) {
        improvements.push({
          text: 'Link all requirements to specific personas for better traceability',
          impact: 'medium',
          effort: 'low'
        });
      }
    }

    // Data quality improvements
    if (!data.personas || data.personas.length === 0) {
      improvements.push({
        text: 'Conduct user research to develop detailed personas',
        impact: 'high',
        effort: 'high'
      });
    }

    if (!data.jobs || data.jobs.length === 0) {
      improvements.push({
        text: 'Perform jobs-to-be-done analysis to understand user needs',
        impact: 'high',
        effort: 'medium'
      });
    }

    return this.prioritizeRecommendations(improvements);
  }

  async processDeliverable(deliverableType: string, content: any): Promise<ProcessedDeliverable> {
    const id = this.generateId();
    const validation = await this.validateData(content);
    const insights = await this.generateInsights(content);
    
    let relatedItems: string[] = [];
    
    switch (deliverableType) {
      case 'PERSONA_SET':
        relatedItems = this.findRelatedPersonaItems(content);
        break;
      case 'JOB_MAP':
        relatedItems = this.findRelatedJobItems(content);
        break;
      case 'PRD_DOCUMENT':
        relatedItems = this.findRelatedPRDItems(content);
        break;
    }

    return {
      id,
      type: deliverableType,
      content,
      validation,
      insights,
      relatedItems,
      createdAt: new Date()
    };
  }

  // Persona-specific methods
  async generatePersonas(inputs: {
    researchData?: any;
    interviewNotes?: string[];
    surveyResults?: any;
    userAnalytics?: any;
  }): Promise<any[]> {
    // Mock persona generation - in real implementation this would use AI agents
    const basePersonas = [
      {
        name: 'Tech-Savvy Professional',
        demographics: {
          ageRange: '28-45',
          occupation: 'Software Developer',
          income: '$70K-120K',
          location: 'Urban',
          education: 'Bachelor\'s Degree'
        },
        goals: [
          {
            description: 'Streamline daily workflow and increase productivity',
            priority: 'HIGH',
            frequency: 'DAILY',
            successCriteria: 'Save 2+ hours per day on routine tasks'
          }
        ],
        painPoints: [
          {
            description: 'Context switching between multiple tools disrupts focus',
            severity: 8,
            frequency: 'DAILY',
            category: 'EFFICIENCY',
            impact: 'HIGH'
          }
        ],
        jobsToBeDone: [
          {
            description: 'Quickly access relevant information when making decisions',
            jobType: 'FUNCTIONAL',
            frequency: 'DAILY',
            importance: 9,
            satisfaction: 4,
            opportunity: 14,
            desiredOutcome: 'Have all necessary context available immediately'
          }
        ]
      }
    ];
    
    // Apply research data to enhance personas if provided
    return basePersonas;
  }

  async analyzeJobOpportunities(jobs: any[]): Promise<{
    rankedJobs: any[];
    topOpportunities: any[];
    recommendations: string[];
  }> {
    const rankedJobs = ProductUtils.rankJobsByOpportunity(jobs);
    const topOpportunities = rankedJobs.slice(0, 5);
    
    const recommendations = [
      `Focus development on top ${Math.min(3, topOpportunities.length)} opportunity jobs`,
      'Validate job importance scores through additional user research',
      'Consider jobs with high importance but low satisfaction for quick wins'
    ];
    
    return {
      rankedJobs,
      topOpportunities,
      recommendations
    };
  }

  async generateProductRequirements(personas: any[], jobs: any[]): Promise<any[]> {
    // Mock requirement generation based on personas and jobs
    const requirements: any[] = [];
    
    personas.forEach(persona => {
      persona.jobsToBeDone?.forEach((job: any) => {
        if (job.opportunity > 10) {
          requirements.push({
            title: `Enable ${job.description.toLowerCase()}`,
            description: `Feature to address ${persona.name}'s need to ${job.description.toLowerCase()}`,
            priority: 'MUST_HAVE',
            personas: [persona.name],
            jobs: [job.description],
            acceptanceCriteria: [
              `User can ${job.desiredOutcome.toLowerCase()}`,
              'Feature improves satisfaction score by 3+ points',
              'Implementation supports high frequency usage'
            ],
            businessValue: `Addresses high-opportunity job (score: ${job.opportunity}) for ${persona.name} segment`
          });
        }
      });
    });
    
    return requirements;
  }

  // Helper methods
  private findRelatedPersonaItems(content: any): string[] {
    const related: string[] = [];
    
    if (content.personas) {
      content.personas.forEach((persona: any) => {
        if (persona.goals) {
          related.push(`Goals for ${persona.name}`);
        }
        if (persona.painPoints) {
          related.push(`Pain points for ${persona.name}`);
        }
        if (persona.jobsToBeDone) {
          related.push(`Jobs for ${persona.name}`);
        }
      });
    }
    
    return related;
  }

  private findRelatedJobItems(content: any): string[] {
    const related: string[] = [];
    
    if (content.jobs) {
      const highOpportunityJobs = content.jobs.filter((job: any) => job.opportunity > 12);
      related.push(`${highOpportunityJobs.length} high-opportunity jobs identified`);
    }
    
    return related;
  }

  private findRelatedPRDItems(content: any): string[] {
    const related: string[] = [];
    
    if (content.requirements) {
      const mustHaveCount = content.requirements.filter((r: any) => r.priority === 'MUST_HAVE').length;
      related.push(`${mustHaveCount} must-have requirements`);
    }
    
    if (content.personas) {
      related.push(`Serves ${content.personas.length} personas`);
    }
    
    return related;
  }

  protected async performCustomValidation(data: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Custom Product suite validation beyond ontology
    if (data.personas) {
      const personaValidation = ProductUtils.validatePersonaSet(data.personas);
      errors.push(...personaValidation.errors);
      warnings.push(...personaValidation.warnings);
    }

    // Validate persona-job alignment
    if (data.personas && data.jobs) {
      const totalJobs = data.jobs.length;
      const totalPersonas = data.personas.length;
      
      if (totalJobs < totalPersonas * 2) {
        warnings.push('Consider identifying more jobs-to-be-done per persona for comprehensive coverage');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}