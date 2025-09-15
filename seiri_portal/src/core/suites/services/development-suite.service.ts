// Development Suite Service
// Handles technical architecture, API design, and development processes

import { SuiteType, ValidationResult } from '../suite.model';
import { AbstractSuiteService, SuiteInsights, ProcessedDeliverable } from './base-suite.service';
import { DevelopmentUtils } from '../domain-ontologies/development.ontology';

export class DevelopmentSuiteService extends AbstractSuiteService {
  suiteType = SuiteType.DEVELOPMENT;

  async generateInsights(data: any): Promise<SuiteInsights> {
    const insights: SuiteInsights = {
      summary: '',
      keyMetrics: [],
      recommendations: [],
      warnings: [],
      opportunities: []
    };

    try {
      // Analyze API specifications
      if (data.apiSpec && data.apiSpec.endpoints) {
        const endpoints = data.apiSpec.endpoints;
        insights.keyMetrics.push(
          { name: 'Total API Endpoints', value: endpoints.length },
          { name: 'Secured Endpoints', value: endpoints.filter((e: any) => e.security && e.security.length > 0).length }
        );
        
        const validation = DevelopmentUtils.validateAPIConsistency(endpoints);
        if (validation.warnings.length > 0) {
          insights.warnings.push(...validation.warnings);
        }
      }

      // Analyze component architecture
      if (data.components) {
        const debtScore = DevelopmentUtils.calculateTechnicalDebtScore(data.components);
        insights.keyMetrics.push(
          { name: 'Total Components', value: data.components.length },
          { name: 'Technical Debt Score', value: Math.round(debtScore) }
        );
        
        if (debtScore < 70) {
          insights.warnings.push('Technical debt score indicates potential quality issues');
        }
      }

      // Generate architectural recommendations
      if (data.architecture) {
        const suggestions = DevelopmentUtils.suggestArchitectureImprovements(data.architecture);
        insights.recommendations.push(...suggestions);
      }

      insights.summary = `Development suite analysis: ${data.apiSpec?.endpoints?.length || 0} API endpoints, ${data.components?.length || 0} components defined.`;

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

    // API improvements
    if (data.apiSpec) {
      const unsecuredEndpoints = data.apiSpec.endpoints?.filter((e: any) => !e.security || e.security.length === 0) || [];
      if (unsecuredEndpoints.length > 0) {
        improvements.push({
          text: 'Implement security for all API endpoints',
          impact: 'high',
          effort: 'medium'
        });
      }
    }

    // Component improvements
    if (data.components) {
      const debtScore = DevelopmentUtils.calculateTechnicalDebtScore(data.components);
      if (debtScore < 70) {
        improvements.push({
          text: 'Address technical debt to improve code quality',
          impact: 'high',
          effort: 'high'
        });
      }
    }

    return this.prioritizeRecommendations(improvements);
  }

  async processDeliverable(deliverableType: string, content: any): Promise<ProcessedDeliverable> {
    const id = this.generateId();
    const validation = await this.validateData(content);
    const insights = await this.generateInsights(content);
    
    return {
      id,
      type: deliverableType,
      content,
      validation,
      insights,
      relatedItems: [],
      createdAt: new Date()
    };
  }

  protected async performCustomValidation(data: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Custom Development suite validation
    if (data.apiSpec && data.apiSpec.endpoints) {
      const validation = DevelopmentUtils.validateAPIConsistency(data.apiSpec.endpoints);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}