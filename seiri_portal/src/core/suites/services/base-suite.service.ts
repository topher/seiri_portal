// Base Suite Service
// Abstract base class for all suite-specific services

import { SuiteType, Suite, ValidationResult } from '../suite.model';
import { OntologyService } from '../domain-ontologies';

// Base interface for all suite services
export interface BaseSuiteService {
  suiteType: SuiteType;
  validateData(data: any): Promise<ValidationResult>;
  generateInsights(data: any): Promise<SuiteInsights>;
  suggestImprovements(data: any): Promise<string[]>;
  processDeliverable(deliverableType: string, content: any): Promise<ProcessedDeliverable>;
}

// Common types for suite services
export interface SuiteInsights {
  summary: string;
  keyMetrics: Array<{
    name: string;
    value: number | string;
    trend?: 'up' | 'down' | 'stable';
  }>;
  recommendations: string[];
  warnings: string[];
  opportunities: string[];
}

export interface ProcessedDeliverable {
  id: string;
  type: string;
  content: any;
  validation: ValidationResult;
  insights: SuiteInsights;
  relatedItems: string[];
  createdAt: Date;
}

// Abstract base class implementation
export abstract class AbstractSuiteService implements BaseSuiteService {
  abstract suiteType: SuiteType;

  async validateData(data: any): Promise<ValidationResult> {
    try {
      const ontologyResult = await OntologyService.validateData(this.suiteType, data);
      
      // Additional suite-specific validation
      const customValidation = await this.performCustomValidation(data);
      
      return {
        isValid: ontologyResult.isValid && customValidation.isValid,
        errors: [...ontologyResult.errors, ...customValidation.errors],
        warnings: [...ontologyResult.warnings, ...customValidation.warnings]
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  abstract generateInsights(data: any): Promise<SuiteInsights>;
  abstract suggestImprovements(data: any): Promise<string[]>;
  abstract processDeliverable(deliverableType: string, content: any): Promise<ProcessedDeliverable>;

  // Template method for custom validation - override in subclasses
  protected async performCustomValidation(data: any): Promise<ValidationResult> {
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  // Helper method to generate unique IDs
  protected generateId(): string {
    return `${this.suiteType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper method to calculate trend
  protected calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const threshold = 0.05; // 5% threshold
    const change = (current - previous) / previous;
    
    if (change > threshold) return 'up';
    if (change < -threshold) return 'down';
    return 'stable';
  }

  // Helper method to prioritize recommendations
  protected prioritizeRecommendations(recommendations: Array<{
    text: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
  }>): string[] {
    // Sort by impact/effort ratio (high impact, low effort first)
    const impactScore = { low: 1, medium: 2, high: 3 };
    const effortScore = { low: 3, medium: 2, high: 1 };
    
    return recommendations
      .sort((a, b) => {
        const scoreA = impactScore[a.impact] * effortScore[a.effort];
        const scoreB = impactScore[b.impact] * effortScore[b.effort];
        return scoreB - scoreA;
      })
      .map(r => r.text);
  }
}

// Suite Service Factory
export class SuiteServiceFactory {
  private static services: Map<SuiteType, BaseSuiteService> = new Map();

  static registerService(suiteType: SuiteType, service: BaseSuiteService): void {
    this.services.set(suiteType, service);
  }

  static getService(suiteType: SuiteType): BaseSuiteService {
    const service = this.services.get(suiteType);
    if (!service) {
      throw new Error(`No service registered for suite type: ${suiteType}`);
    }
    return service;
  }

  static getAllServices(): Map<SuiteType, BaseSuiteService> {
    return new Map(this.services);
  }

  static async validateAllSuites(suiteData: Record<SuiteType, any>): Promise<{
    isValid: boolean;
    results: Record<SuiteType, ValidationResult>;
    crossSuiteValidation: ValidationResult;
  }> {
    const results: Record<SuiteType, ValidationResult> = {} as any;
    let overallValid = true;

    // Validate each suite individually
    for (const [suiteType, data] of Object.entries(suiteData)) {
      const service = this.getService(suiteType as SuiteType);
      const result = await service.validateData(data);
      results[suiteType as SuiteType] = result;
      
      if (!result.isValid) {
        overallValid = false;
      }
    }

    // Cross-suite validation
    const crossSuiteValidation = await OntologyService.validateCrossSuiteConsistency(suiteData);
    if (!crossSuiteValidation.isValid) {
      overallValid = false;
    }

    return {
      isValid: overallValid,
      results,
      crossSuiteValidation
    };
  }
}