// Marketing Suite Service
// Handles customer segmentation, campaign management, and brand strategy

import { SuiteType, ValidationResult } from '../suite.model';
import { AbstractSuiteService, SuiteInsights, ProcessedDeliverable } from './base-suite.service';
import { MarketingUtils } from '../domain-ontologies/marketing.ontology';

export class MarketingSuiteService extends AbstractSuiteService {
  suiteType = SuiteType.MARKETING;

  async generateInsights(data: any): Promise<SuiteInsights> {
    const insights: SuiteInsights = {
      summary: '',
      keyMetrics: [],
      recommendations: [],
      warnings: [],
      opportunities: []
    };

    try {
      // Analyze customer segments
      if (data.segments && Array.isArray(data.segments)) {
        const highValueSegments = data.segments.filter((segment: any) => 
          MarketingUtils.calculateSegmentAttractiveness(segment) > 70
        );
        
        insights.keyMetrics.push(
          { name: 'Total Segments', value: data.segments.length },
          { name: 'High-Value Segments', value: highValueSegments.length },
          { name: 'Total Addressable Market', value: data.segments.reduce((sum: number, s: any) => sum + (s.size || 0), 0) }
        );
        
        if (highValueSegments.length > 0) {
          insights.opportunities.push(`${highValueSegments.length} high-value segments identified for priority targeting`);
        }
        
        // Check LTV:CAC ratios
        const segmentsWithEconomics = data.segments.filter((s: any) => s.lifetimeValue && s.acquisitionCost);
        if (segmentsWithEconomics.length > 0) {
          const avgLTVCAC = segmentsWithEconomics.reduce((sum: number, s: any) => 
            sum + (s.lifetimeValue / s.acquisitionCost), 0) / segmentsWithEconomics.length;
          
          insights.keyMetrics.push({ name: 'Average LTV:CAC Ratio', value: Math.round(avgLTVCAC * 10) / 10 });
          
          if (avgLTVCAC < 3) {
            insights.warnings.push('Average LTV:CAC ratio below recommended 3:1 threshold');
          }
        }
      }

      // Analyze marketing campaigns
      if (data.campaigns && Array.isArray(data.campaigns)) {
        const activeCampaigns = data.campaigns.filter((c: any) => c.status === 'ACTIVE');
        const totalBudget = data.campaigns.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
        
        insights.keyMetrics.push(
          { name: 'Total Campaigns', value: data.campaigns.length },
          { name: 'Active Campaigns', value: activeCampaigns.length },
          { name: 'Total Campaign Budget', value: `$${totalBudget.toLocaleString()}` }
        );
        
        // Analyze channel distribution
        const channelUsage = new Map();
        data.campaigns.forEach((campaign: any) => {
          campaign.channels?.forEach((channel: string) => {
            channelUsage.set(channel, (channelUsage.get(channel) || 0) + 1);
          });
        });
        
        if (channelUsage.size < 3) {
          insights.warnings.push('Limited channel diversity may restrict reach');
          insights.recommendations.push('Consider expanding to additional marketing channels');
        }
      }

      // Analyze brand strategy
      if (data.brandStrategy) {
        const brand = data.brandStrategy;
        
        if (brand.brandPersonality && brand.brandPersonality.length >= 3) {
          insights.keyMetrics.push({ name: 'Brand Personality Traits', value: brand.brandPersonality.length });
        }
        
        if (!brand.competitivePositioning || brand.competitivePositioning.length < 50) {
          insights.warnings.push('Competitive positioning needs more development');
        }
      }

      // Analyze content strategy
      if (data.contentStrategy) {
        const content = data.contentStrategy;
        
        if (content.contentPillars) {
          insights.keyMetrics.push({ name: 'Content Pillars', value: content.contentPillars.length });
          
          if (content.contentPillars.length < 3) {
            insights.warnings.push('Consider developing more content pillars for varied messaging');
          }
        }
        
        if (content.distributionChannels && content.distributionChannels.length > 5) {
          insights.opportunities.push('Strong multi-channel content distribution strategy in place');
        }
      }

      // Generate summary
      const segmentCount = data.segments?.length || 0;
      const campaignCount = data.campaigns?.length || 0;
      
      insights.summary = `Marketing suite analysis: ${segmentCount} customer segments, ${campaignCount} campaigns planned/active. ${insights.opportunities.length} growth opportunities identified.`;

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

    // Segment improvements
    if (data.segments) {
      const lowValueSegments = data.segments.filter((segment: any) => 
        MarketingUtils.calculateSegmentAttractiveness(segment) < 40
      );
      
      if (lowValueSegments.length > 0) {
        improvements.push({
          text: `Re-evaluate ${lowValueSegments.length} low-attractiveness segments`,
          impact: 'medium',
          effort: 'low'
        });
      }
      
      const segmentsWithoutEconomics = data.segments.filter((s: any) => !s.lifetimeValue || !s.acquisitionCost);
      if (segmentsWithoutEconomics.length > 0) {
        improvements.push({
          text: 'Calculate LTV and CAC for all customer segments',
          impact: 'high',
          effort: 'medium'
        });
      }
    }

    // Campaign improvements
    if (data.campaigns) {
      const campaignsWithoutTargets = data.campaigns.filter((c: any) => !c.kpis || c.kpis.length === 0);
      if (campaignsWithoutTargets.length > 0) {
        improvements.push({
          text: 'Define clear KPIs for all marketing campaigns',
          impact: 'high',
          effort: 'low'
        });
      }
      
      const singleChannelCampaigns = data.campaigns.filter((c: any) => !c.channels || c.channels.length === 1);
      if (singleChannelCampaigns.length > data.campaigns.length * 0.7) {
        improvements.push({
          text: 'Implement multi-channel approach for broader reach',
          impact: 'medium',
          effort: 'medium'
        });
      }
    }

    // Brand improvements
    if (!data.brandStrategy) {
      improvements.push({
        text: 'Develop comprehensive brand strategy and positioning',
        impact: 'high',
        effort: 'high'
      });
    } else {
      if (!data.brandStrategy.competitivePositioning || data.brandStrategy.competitivePositioning.length < 50) {
        improvements.push({
          text: 'Strengthen competitive positioning statement',
          impact: 'medium',
          effort: 'low'
        });
      }
    }

    // Content improvements
    if (!data.contentStrategy) {
      improvements.push({
        text: 'Create structured content strategy with defined pillars',
        impact: 'medium',
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
      case 'MARKET_ANALYSIS':
        relatedItems = this.findRelatedMarketItems(content);
        break;
      case 'BUSINESS_MODEL':
        relatedItems = this.findRelatedBusinessModelItems(content);
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

  // Marketing-specific methods
  async optimizeBudgetAllocation(campaigns: any[], totalBudget: number): Promise<{
    allocations: Record<string, number>;
    recommendations: string[];
  }> {
    const channels = this.extractChannelsFromCampaigns(campaigns);
    const allocations = MarketingUtils.optimizeBudgetAllocation(channels, totalBudget);
    
    const recommendations = [
      'Monitor performance closely in first 30 days',
      'Adjust allocation based on early performance indicators',
      'Reserve 20% of budget for testing new channels'
    ];
    
    return { allocations, recommendations };
  }

  async generateCampaignRecommendations(segments: any[], objectives: string[]): Promise<string[]> {
    return MarketingUtils.generateCampaignRecommendations(segments, objectives as any);
  }

  async analyzeCompetitiveLandscape(competitors: any[]): Promise<{
    opportunities: string[];
    threats: string[];
    positioning: string;
  }> {
    const opportunities = [
      'Gap in competitor pricing for mid-market segment',
      'Limited competitor presence in emerging channels',
      'Opportunity for superior customer experience'
    ];
    
    const threats = [
      'Competitor A increasing marketing spend by 40%',
      'New entrant with disruptive pricing model',
      'Market leader expanding into adjacent segments'
    ];
    
    const positioning = 'Position as premium but accessible solution with superior customer support';
    
    return { opportunities, threats, positioning };
  }

  async segmentCustomers(customerData: any[]): Promise<{
    segments: any[];
    insights: string[];
    recommendations: string[];
  }> {
    // Mock segmentation based on customer data
    const segments = [
      {
        name: 'Enterprise Leaders',
        size: 15000,
        growthRate: 12,
        characteristics: ['High budget', 'Complex needs', 'Long sales cycle'],
        channels: ['DIRECT_SALES', 'EVENTS', 'CONTENT_MARKETING']
      },
      {
        name: 'Growing Companies',
        size: 45000,
        growthRate: 25,
        characteristics: ['Budget conscious', 'Quick decisions', 'Digital-first'],
        channels: ['PAID_SEARCH', 'SOCIAL_MEDIA', 'EMAIL']
      }
    ];
    
    const insights = [
      'Growing Companies segment shows highest growth rate',
      'Enterprise Leaders have longer decision cycles but higher value',
      'Digital channels most effective for majority of segments'
    ];
    
    const recommendations = [
      'Prioritize Growing Companies for short-term growth',
      'Develop specialized enterprise sales process',
      'Increase digital marketing investment'
    ];
    
    return { segments, insights, recommendations };
  }

  // Helper methods
  private extractChannelsFromCampaigns(campaigns: any[]): any[] {
    const channelMap = new Map();
    
    campaigns.forEach(campaign => {
      campaign.channels?.forEach((channel: string) => {
        if (!channelMap.has(channel)) {
          channelMap.set(channel, {
            name: channel,
            conversion_rate: 0.02 + Math.random() * 0.03, // Mock data
            cost_per_click: 1 + Math.random() * 5 // Mock data
          });
        }
      });
    });
    
    return Array.from(channelMap.values());
  }

  private findRelatedMarketItems(content: any): string[] {
    const related: string[] = [];
    
    if (content.marketAnalysis) {
      const analysis = content.marketAnalysis;
      if (analysis.competitorAnalysis) {
        related.push(`${analysis.competitorAnalysis.length} competitors analyzed`);
      }
      if (analysis.trends) {
        related.push(`${analysis.trends.length} market trends identified`);
      }
    }
    
    return related;
  }

  private findRelatedBusinessModelItems(content: any): string[] {
    const related: string[] = [];
    
    if (content.businessModel) {
      const model = content.businessModel;
      if (model.revenueStreams) {
        related.push(`${model.revenueStreams.length} revenue streams defined`);
      }
      if (model.customerSegments) {
        related.push(`Serves ${model.customerSegments.length} customer segments`);
      }
    }
    
    return related;
  }

  protected async performCustomValidation(data: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Custom Marketing suite validation
    if (data.segments) {
      data.segments.forEach((segment: any, index: number) => {
        const attractiveness = MarketingUtils.calculateSegmentAttractiveness(segment);
        if (attractiveness < 20) {
          warnings.push(`Segment ${index + 1} has very low attractiveness score (${attractiveness})`);
        }
      });
    }

    // Validate campaign budget allocation
    if (data.campaigns) {
      const totalBudget = data.campaigns.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
      if (totalBudget === 0) {
        warnings.push('No campaign budgets specified - difficult to assess resource allocation');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}