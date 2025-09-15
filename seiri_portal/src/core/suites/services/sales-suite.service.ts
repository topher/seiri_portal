// Sales Suite Service
// Handles sales strategy, lead qualification, and revenue optimization

import { SuiteType, ValidationResult } from '../suite.model';
import { AbstractSuiteService, SuiteInsights, ProcessedDeliverable } from './base-suite.service';
import { SalesUtils } from '../domain-ontologies/sales.ontology';

export class SalesSuiteService extends AbstractSuiteService {
  suiteType = SuiteType.SALES;

  async generateInsights(data: any): Promise<SuiteInsights> {
    const insights: SuiteInsights = {
      summary: 'Sales suite analysis focused on conversion optimization and revenue growth',
      keyMetrics: [],
      recommendations: [],
      warnings: [],
      opportunities: []
    };

    if (data.salesStrategy) {
      insights.keyMetrics.push(
        { name: 'Sales Channels', value: data.salesStrategy.salesChannels?.length || 0 },
        { name: 'Target Markets', value: data.salesStrategy.targetMarkets?.length || 0 }
      );
    }

    if (data.conversionData) {
      const conversionRate = SalesUtils.calculateConversionRate(
        data.conversionData.leads || 0, 
        data.conversionData.conversions || 0
      );
      insights.keyMetrics.push({ name: 'Conversion Rate', value: `${conversionRate.toFixed(1)}%` });
    }

    return insights;
  }

  async suggestImprovements(data: any): Promise<string[]> {
    return ['Implement lead scoring system', 'Optimize sales funnel conversion rates'];
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
}