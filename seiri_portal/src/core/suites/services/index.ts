// Suite Services Index
// Central exports and registration for all suite-specific services

// Import all services
export { AbstractSuiteService, SuiteServiceFactory } from './base-suite.service';
export { ProductSuiteService } from './product-suite.service';
export { MarketingSuiteService } from './marketing-suite.service';
export { DevelopmentSuiteService } from './development-suite.service';
export { OperationsSuiteService } from './operations-suite.service';
export { StrategySuiteService } from './strategy-suite.service';
export { SalesSuiteService } from './sales-suite.service';

// Import types
export type { 
  BaseSuiteService, 
  SuiteInsights, 
  ProcessedDeliverable 
} from './base-suite.service';

import { SuiteType } from '../suite.model';
import { SuiteServiceFactory } from './base-suite.service';
import { ProductSuiteService } from './product-suite.service';
import { MarketingSuiteService } from './marketing-suite.service';
import { DevelopmentSuiteService } from './development-suite.service';
import { OperationsSuiteService } from './operations-suite.service';
import { StrategySuiteService } from './strategy-suite.service';
import { SalesSuiteService } from './sales-suite.service';

// Service instances
const productService = new ProductSuiteService();
const marketingService = new MarketingSuiteService();
const developmentService = new DevelopmentSuiteService();
const operationsService = new OperationsSuiteService();
const strategyService = new StrategySuiteService();
const salesService = new SalesSuiteService();

// Register all services with the factory
SuiteServiceFactory.registerService(SuiteType.PRODUCT, productService);
SuiteServiceFactory.registerService(SuiteType.MARKETING, marketingService);
SuiteServiceFactory.registerService(SuiteType.DEVELOPMENT, developmentService);
SuiteServiceFactory.registerService(SuiteType.OPERATIONS, operationsService);
SuiteServiceFactory.registerService(SuiteType.STRATEGY, strategyService);
SuiteServiceFactory.registerService(SuiteType.SALES, salesService);

// Export individual service instances for direct access
export const suiteServices = {
  product: productService,
  marketing: marketingService,
  development: developmentService,
  operations: operationsService,
  strategy: strategyService,
  sales: salesService
};

// Suite Service Manager - High-level orchestration
export class SuiteServiceManager {
  // Get service for a specific suite type
  static getService(suiteType: SuiteType) {
    return SuiteServiceFactory.getService(suiteType);
  }

  // Process deliverable through appropriate suite service
  static async processDeliverable(
    suiteType: SuiteType, 
    deliverableType: string, 
    content: any
  ) {
    const service = this.getService(suiteType);
    return await service.processDeliverable(deliverableType, content);
  }

  // Generate insights for a specific suite
  static async generateSuiteInsights(suiteType: SuiteType, data: any) {
    const service = this.getService(suiteType);
    return await service.generateInsights(data);
  }

  // Get improvement suggestions for a suite
  static async getSuiteImprovements(suiteType: SuiteType, data: any) {
    const service = this.getService(suiteType);
    return await service.suggestImprovements(data);
  }

  // Validate data for a specific suite
  static async validateSuiteData(suiteType: SuiteType, data: any) {
    const service = this.getService(suiteType);
    return await service.validateData(data);
  }

  // Cross-suite analysis
  static async performCrossSuiteAnalysis(workspaceData: Record<SuiteType, any>) {
    const results = await SuiteServiceFactory.validateAllSuites(workspaceData);
    
    const insights = await Promise.all(
      Object.entries(workspaceData).map(async ([suiteType, data]) => {
        const service = this.getService(suiteType as SuiteType);
        const suiteInsights = await service.generateInsights(data);
        return {
          suiteType: suiteType as SuiteType,
          insights: suiteInsights
        };
      })
    );

    const crossSuiteRecommendations = this.generateCrossSuiteRecommendations(insights);

    return {
      validation: results,
      insights,
      crossSuiteRecommendations
    };
  }

  // Generate recommendations that span multiple suites
  private static generateCrossSuiteRecommendations(
    insights: Array<{ suiteType: SuiteType; insights: any }>
  ): string[] {
    const recommendations: string[] = [];

    // Product-Marketing alignment
    const productInsights = insights.find(i => i.suiteType === SuiteType.PRODUCT)?.insights;
    const marketingInsights = insights.find(i => i.suiteType === SuiteType.MARKETING)?.insights;

    if (productInsights && marketingInsights) {
      const productPersonas = productInsights.keyMetrics.find((m: any) => m.name === 'Total Personas')?.value || 0;
      const marketingSegments = marketingInsights.keyMetrics.find((m: any) => m.name === 'Total Segments')?.value || 0;

      if (productPersonas > 0 && marketingSegments === 0) {
        recommendations.push('Align product personas with marketing customer segments');
      }

      if (marketingSegments > 0 && productPersonas === 0) {
        recommendations.push('Develop product personas based on marketing segments');
      }
    }

    // Development-Product alignment
    const developmentInsights = insights.find(i => i.suiteType === SuiteType.DEVELOPMENT)?.insights;
    
    if (productInsights && developmentInsights) {
      const apiEndpoints = developmentInsights.keyMetrics.find((m: any) => m.name === 'Total API Endpoints')?.value || 0;
      
      if (productInsights.opportunities.length > 0 && apiEndpoints === 0) {
        recommendations.push('Create technical specifications for identified product opportunities');
      }
    }

    // Strategy-Sales alignment
    const strategyInsights = insights.find(i => i.suiteType === SuiteType.STRATEGY)?.insights;
    const salesInsights = insights.find(i => i.suiteType === SuiteType.SALES)?.insights;

    if (strategyInsights && salesInsights) {
      const strategicObjectives = strategyInsights.keyMetrics.find((m: any) => m.name === 'Strategic Objectives')?.value || 0;
      const salesChannels = salesInsights.keyMetrics.find((m: any) => m.name === 'Sales Channels')?.value || 0;

      if (strategicObjectives > 0 && salesChannels === 0) {
        recommendations.push('Define sales channels to support strategic objectives');
      }
    }

    // General recommendations
    if (insights.length === 6) {
      recommendations.push('All suites are active - ensure regular cross-suite coordination');
    }

    return recommendations;
  }

  // Get comprehensive workspace health score
  static async getWorkspaceHealthScore(workspaceData: Record<SuiteType, any>): Promise<{
    overallScore: number;
    suiteScores: Record<SuiteType, number>;
    recommendations: string[];
  }> {
    const suiteScores: Record<SuiteType, number> = {} as any;
    let totalScore = 0;
    let suiteCount = 0;

    for (const [suiteType, data] of Object.entries(workspaceData)) {
      const service = this.getService(suiteType as SuiteType);
      const validation = await service.validateData(data);
      const insights = await service.generateInsights(data);
      
      // Calculate suite health score (0-100)
      let score = 70; // Base score
      
      // Add points for data completeness
      if (insights.keyMetrics.length > 0) score += 10;
      if (insights.opportunities.length > 0) score += 10;
      
      // Subtract points for issues
      if (validation.errors.length > 0) score -= 20;
      if (validation.warnings.length > 2) score -= 10;
      if (insights.warnings.length > 2) score -= 5;
      
      score = Math.max(0, Math.min(100, score));
      suiteScores[suiteType as SuiteType] = score;
      totalScore += score;
      suiteCount++;
    }

    const overallScore = suiteCount > 0 ? Math.round(totalScore / suiteCount) : 0;
    
    // Generate health recommendations
    const recommendations = [];
    
    const lowScoreSuites = Object.entries(suiteScores).filter(([_, score]) => score < 60);
    if (lowScoreSuites.length > 0) {
      recommendations.push(`Focus improvement efforts on: ${lowScoreSuites.map(([suite]) => suite).join(', ')}`);
    }

    if (overallScore > 80) {
      recommendations.push('Workspace health is excellent - maintain current quality standards');
    } else if (overallScore > 60) {
      recommendations.push('Good foundation - focus on identified improvement areas');
    } else {
      recommendations.push('Significant improvement needed - prioritize data quality and validation fixes');
    }

    return {
      overallScore,
      suiteScores,
      recommendations
    };
  }
}

// Export manager as default
export default SuiteServiceManager;