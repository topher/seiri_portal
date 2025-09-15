// Initiative Value Tracking Service
// Comprehensive value tracking and metrics for initiatives across the 6-suite system

import { SuiteType, RACIRole } from '@/core/suites/suite.model';
import { initiativeService } from '@/core/initiatives/initiative.service';
import { taskService } from '@/core/tasks/task.service';
import { agentPoolService } from '@/agents/pool/agent-pool.service';

export interface ValueMetric {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  category: ValueMetricCategory;
  target?: number | string;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  confidence: number; // 0-100
  lastUpdated: Date;
  source: string;
}

export enum ValueMetricCategory {
  REVENUE = 'REVENUE',
  COST_REDUCTION = 'COST_REDUCTION',
  TIME_TO_MARKET = 'TIME_TO_MARKET',
  QUALITY = 'QUALITY',
  CUSTOMER_SATISFACTION = 'CUSTOMER_SATISFACTION',
  MARKET_SHARE = 'MARKET_SHARE',
  EFFICIENCY = 'EFFICIENCY',
  INNOVATION = 'INNOVATION'
}

export interface InitiativeValueReport {
  initiativeId: string;
  initiativeName: string;
  workspaceId: string;
  
  // Value Summary
  valueSummary: {
    estimatedROI: number;
    actualROI?: number;
    valueRealized: number;
    valueProjected: number;
    paybackPeriod: number; // months
    netPresentValue: number;
  };

  // Metrics by Category
  metricsByCategory: Record<ValueMetricCategory, ValueMetric[]>;

  // RACI Value Tracking
  raciValueContribution: {
    responsible: SuiteValueContribution[];
    accountable: SuiteValueContribution;
    consulted: SuiteValueContribution[];
    informed: SuiteValueContribution[];
  };

  // Progress and Timeline
  progress: {
    completionPercentage: number;
    milestoneProgress: MilestoneProgress[];
    timelineVariance: number; // days ahead/behind
    budgetVariance: number; // percentage
  };

  // Client Visibility Data
  clientDashboard: {
    executiveSummary: string;
    keyMetrics: ValueMetric[];
    riskFactors: string[];
    nextMilestones: string[];
    recommendedActions: string[];
  };

  // Insights and Recommendations
  insights: ValueInsight[];
  recommendations: ValueRecommendation[];
  
  // Metadata
  reportGenerated: Date;
  reportVersion: string;
  confidence: number;
}

export interface SuiteValueContribution {
  suiteType: SuiteType;
  suiteId: string;
  contribution: {
    valueDelivered: number;
    costIncurred: number;
    timeInvested: number; // hours
    qualityScore: number; // 0-100
    deliverables: string[];
  };
  performance: {
    onTime: boolean;
    onBudget: boolean;
    qualityMet: boolean;
    stakeholderSatisfaction: number;
  };
  impact: {
    directValue: number;
    indirectValue: number;
    riskMitigated: number;
    efficiencyGained: number;
  };
}

export interface MilestoneProgress {
  milestoneId: string;
  name: string;
  targetDate: Date;
  actualDate?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  valueImpact: number;
  dependencies: string[];
}

export interface ValueInsight {
  type: 'OPPORTUNITY' | 'RISK' | 'TREND' | 'CORRELATION';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  dataPoints: string[];
  actionable: boolean;
}

export interface ValueRecommendation {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'OPTIMIZATION' | 'RISK_MITIGATION' | 'ACCELERATION' | 'COST_REDUCTION';
  title: string;
  description: string;
  expectedImpact: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  timeline: string;
  owner: RACIRole;
  dependencies: string[];
}

export interface ValueTrackingConfig {
  updateFrequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  metricThresholds: Record<ValueMetricCategory, number>;
  alertRules: ValueAlertRule[];
  reportingSchedule: ReportingSchedule[];
}

export interface ValueAlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  recipients: string[];
  enabled: boolean;
}

export interface ReportingSchedule {
  reportType: 'EXECUTIVE' | 'OPERATIONAL' | 'FINANCIAL' | 'SUITE_SPECIFIC';
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  recipients: string[];
  format: 'EMAIL' | 'DASHBOARD' | 'PDF' | 'API';
}

export class ValueTrackingService {
  private valueMetrics: Map<string, ValueMetric[]> = new Map(); // initiativeId -> metrics
  private valueReports: Map<string, InitiativeValueReport> = new Map();
  private trackingConfig: ValueTrackingConfig;

  constructor() {
    this.trackingConfig = this.getDefaultTrackingConfig();
    this.initializeValueTracking();
  }

  /**
   * Generate comprehensive value report for an initiative
   */
  async generateValueReport(initiativeId: string): Promise<InitiativeValueReport> {
    const initiative = await initiativeService.getInitiative(initiativeId);
    if (!initiative) {
      throw new Error(`Initiative ${initiativeId} not found`);
    }

    // Collect current metrics
    const currentMetrics = await this.collectCurrentMetrics(initiativeId);
    
    // Calculate value summary
    const valueSummary = await this.calculateValueSummary(initiative, currentMetrics);
    
    // Generate RACI value contributions
    const raciValueContribution = await this.calculateRACIValueContribution(initiative, currentMetrics);
    
    // Calculate progress metrics
    const progress = await this.calculateProgressMetrics(initiativeId);
    
    // Generate client dashboard
    const clientDashboard = await this.generateClientDashboard(initiative, valueSummary, currentMetrics);
    
    // Generate insights and recommendations
    const insights = await this.generateValueInsights(initiative, currentMetrics, raciValueContribution);
    const recommendations = await this.generateValueRecommendations(initiative, insights);

    const report: InitiativeValueReport = {
      initiativeId,
      initiativeName: initiative.name,
      workspaceId: initiative.workspaceId,
      valueSummary,
      metricsByCategory: this.organizeMetricsByCategory(currentMetrics),
      raciValueContribution,
      progress,
      clientDashboard,
      insights,
      recommendations,
      reportGenerated: new Date(),
      reportVersion: '1.0',
      confidence: this.calculateReportConfidence(currentMetrics, raciValueContribution)
    };

    // Cache the report
    this.valueReports.set(initiativeId, report);
    
    return report;
  }

  /**
   * Collect current metrics for an initiative
   */
  private async collectCurrentMetrics(initiativeId: string): Promise<ValueMetric[]> {
    const existingMetrics = this.valueMetrics.get(initiativeId) || [];
    const tasks = await taskService.getTasksByInitiative(initiativeId);
    const initiative = await initiativeService.getInitiative(initiativeId);

    // Calculate derived metrics
    const derivedMetrics: ValueMetric[] = [];

    // Time to Market metrics
    if (tasks.length > 0) {
      const completedTasks = tasks.filter(t => t.status === 'DONE');
      const avgCompletionTime = completedTasks.reduce((sum, task) => {
        return sum + ((task as any).actualDuration || (task as any).estimatedDuration || 0);
      }, 0) / Math.max(completedTasks.length, 1);

      derivedMetrics.push({
        id: `metric_ttm_${Date.now()}`,
        name: 'Average Task Completion Time',
        value: Math.round(avgCompletionTime),
        unit: 'hours',
        category: ValueMetricCategory.TIME_TO_MARKET,
        trend: 'STABLE',
        confidence: 85,
        lastUpdated: new Date(),
        source: 'TASK_ANALYTICS'
      });
    }

    // Quality metrics
    const qualityScore = this.calculateQualityScore(tasks);
    derivedMetrics.push({
      id: `metric_quality_${Date.now()}`,
      name: 'Initiative Quality Score',
      value: qualityScore,
      unit: 'percentage',
      category: ValueMetricCategory.QUALITY,
      target: 90,
      trend: qualityScore > 85 ? 'INCREASING' : 'STABLE',
      confidence: 90,
      lastUpdated: new Date(),
      source: 'QUALITY_ANALYTICS'
    });

    // Efficiency metrics
    const efficiencyScore = this.calculateEfficiencyScore(tasks);
    derivedMetrics.push({
      id: `metric_efficiency_${Date.now()}`,
      name: 'Resource Efficiency',
      value: efficiencyScore,
      unit: 'percentage',
      category: ValueMetricCategory.EFFICIENCY,
      target: 85,
      trend: 'INCREASING',
      confidence: 80,
      lastUpdated: new Date(),
      source: 'RESOURCE_ANALYTICS'
    });

    // Combine existing and derived metrics
    return [...existingMetrics, ...derivedMetrics];
  }

  /**
   * Calculate value summary for initiative
   */
  private async calculateValueSummary(initiative: any, metrics: ValueMetric[]): Promise<any> {
    // Extract financial metrics
    const revenueMetrics = metrics.filter(m => m.category === ValueMetricCategory.REVENUE);
    const costMetrics = metrics.filter(m => m.category === ValueMetricCategory.COST_REDUCTION);

    // Calculate ROI
    const totalRevenue = revenueMetrics.reduce((sum, m) => sum + (typeof m.value === 'number' ? m.value : 0), 0);
    const totalCostSaving = costMetrics.reduce((sum, m) => sum + (typeof m.value === 'number' ? m.value : 0), 0);
    const estimatedInvestment = this.estimateInitiativeInvestment(initiative);
    
    const estimatedROI = estimatedInvestment > 0 ? ((totalRevenue + totalCostSaving) / estimatedInvestment - 1) * 100 : 0;
    
    return {
      estimatedROI: Math.round(estimatedROI * 100) / 100,
      valueRealized: totalRevenue * 0.3, // Assume 30% realized so far
      valueProjected: totalRevenue + totalCostSaving,
      paybackPeriod: estimatedInvestment > 0 ? (estimatedInvestment / ((totalRevenue + totalCostSaving) / 12)) : 0,
      netPresentValue: this.calculateNPV(totalRevenue + totalCostSaving, estimatedInvestment, 0.1, 3) // 10% discount rate, 3 years
    };
  }

  /**
   * Calculate RACI value contribution
   */
  private async calculateRACIValueContribution(initiative: any, metrics: ValueMetric[]): Promise<any> {
    const raci = initiative.raci;
    
    // Helper function to calculate suite contribution
    const calculateSuiteContribution = async (suiteId: string, role: RACIRole): Promise<SuiteValueContribution> => {
      const suiteType = await this.getSuiteTypeFromId(suiteId);
      const tasks = await taskService.getTasksByInitiative(initiative.id);
      const suiteTasks = tasks.filter(task => this.isTaskForSuite(task, suiteType));
      
      const valueDelivered = this.calculateSuiteValueDelivered(suiteTasks, metrics);
      const costIncurred = this.calculateSuiteCostIncurred(suiteTasks);
      const timeInvested = suiteTasks.reduce((sum, task) => sum + ((task as any).actualDuration || (task as any).estimatedDuration || 0), 0);
      const qualityScore = this.calculateSuiteQualityScore(suiteTasks);
      
      return {
        suiteType,
        suiteId,
        contribution: {
          valueDelivered,
          costIncurred,
          timeInvested,
          qualityScore,
          deliverables: suiteTasks.map(task => task.definitionOfDone?.requiredDeliverables || []).flat()
        },
        performance: {
          onTime: suiteTasks.every(task => !(task as any).isOverdue),
          onBudget: true, // Simplified for mock
          qualityMet: qualityScore >= 80,
          stakeholderSatisfaction: 85 + Math.random() * 10 // Mock satisfaction score
        },
        impact: {
          directValue: valueDelivered * 0.7,
          indirectValue: valueDelivered * 0.3,
          riskMitigated: this.calculateRiskMitigated(suiteTasks),
          efficiencyGained: this.calculateEfficiencyGained(suiteTasks)
        }
      };
    };

    // Calculate contributions for each RACI role
    const responsibleContributions = await Promise.all(
      raci.responsible.map((suiteId: string) => calculateSuiteContribution(suiteId, 'RESPONSIBLE' as any))
    );
    
    const accountableContribution = await calculateSuiteContribution(raci.accountable, 'ACCOUNTABLE' as any);
    
    const consultedContributions = await Promise.all(
      raci.consulted.map((suiteId: string) => calculateSuiteContribution(suiteId, 'CONSULTED' as any))
    );
    
    const informedContributions = await Promise.all(
      raci.informed.map((suiteId: string) => calculateSuiteContribution(suiteId, 'INFORMED' as any))
    );

    return {
      responsible: responsibleContributions,
      accountable: accountableContribution,
      consulted: consultedContributions,
      informed: informedContributions
    };
  }

  /**
   * Calculate progress metrics
   */
  private async calculateProgressMetrics(initiativeId: string): Promise<any> {
    const tasks = await taskService.getTasksByInitiative(initiativeId);
    const completedTasks = tasks.filter(task => task.status === 'DONE');
    const completionPercentage = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

    // Mock milestone progress
    const milestoneProgress: MilestoneProgress[] = [
      {
        milestoneId: 'milestone_1',
        name: 'Phase 1 Completion',
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: completionPercentage > 25 ? 'COMPLETED' : 'IN_PROGRESS',
        valueImpact: 25000,
        dependencies: ['Task setup', 'Resource allocation']
      },
      {
        milestoneId: 'milestone_2',
        name: 'Phase 2 Completion',
        targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: completionPercentage > 50 ? 'COMPLETED' : 'PENDING',
        valueImpact: 50000,
        dependencies: ['Phase 1 completion', 'Stakeholder approval']
      }
    ];

    return {
      completionPercentage: Math.round(completionPercentage),
      milestoneProgress,
      timelineVariance: Math.random() * 10 - 5, // Mock: -5 to +5 days
      budgetVariance: Math.random() * 20 - 10 // Mock: -10% to +10%
    };
  }

  /**
   * Generate client dashboard
   */
  private async generateClientDashboard(initiative: any, valueSummary: any, metrics: ValueMetric[]): Promise<any> {
    const keyMetrics = metrics
      .filter(m => m.category === ValueMetricCategory.REVENUE || 
                   m.category === ValueMetricCategory.CUSTOMER_SATISFACTION ||
                   m.category === ValueMetricCategory.TIME_TO_MARKET)
      .slice(0, 6);

    return {
      executiveSummary: `${initiative.name} is tracking ${valueSummary.estimatedROI > 0 ? 'positively' : 'as expected'} with ${valueSummary.estimatedROI.toFixed(1)}% estimated ROI. Value realization is on track with ${keyMetrics.length} key metrics being monitored.`,
      keyMetrics,
      riskFactors: [
        'Timeline dependencies on external stakeholders',
        'Resource availability during peak periods',
        'Market condition changes affecting projections'
      ],
      nextMilestones: [
        'Complete Phase 1 deliverables',
        'Stakeholder review and approval',
        'Begin Phase 2 implementation'
      ],
      recommendedActions: [
        'Accelerate critical path tasks',
        'Increase stakeholder communication frequency',
        'Prepare contingency plans for identified risks'
      ]
    };
  }

  /**
   * Generate value insights
   */
  private async generateValueInsights(initiative: any, metrics: ValueMetric[], raciContribution: any): Promise<ValueInsight[]> {
    const insights: ValueInsight[] = [];

    // ROI trend insight
    const revenueMetrics = metrics.filter(m => m.category === ValueMetricCategory.REVENUE);
    if (revenueMetrics.length > 0) {
      insights.push({
        type: 'TREND',
        title: 'Revenue Metrics Trending Positively',
        description: `${revenueMetrics.length} revenue metrics are showing positive trends, indicating strong value potential.`,
        impact: 'HIGH',
        confidence: 85,
        dataPoints: revenueMetrics.map(m => m.name),
        actionable: true
      });
    }

    // RACI performance insight
    const accountableContribution = raciContribution.accountable;
    if (accountableContribution.performance.qualityScore > 90) {
      insights.push({
        type: 'OPPORTUNITY',
        title: 'Accountable Suite Delivering Exceptional Quality',
        description: `The accountable suite (${accountableContribution.suiteType}) is delivering quality scores above 90%, creating opportunity for acceleration.`,
        impact: 'MEDIUM',
        confidence: 92,
        dataPoints: ['Quality metrics', 'Performance indicators'],
        actionable: true
      });
    }

    // Efficiency correlation insight
    const efficiencyMetrics = metrics.filter(m => m.category === ValueMetricCategory.EFFICIENCY);
    if (efficiencyMetrics.length > 0) {
      insights.push({
        type: 'CORRELATION',
        title: 'Efficiency Gains Correlate with Value Delivery',
        description: 'Higher efficiency scores are strongly correlated with increased value delivery across all suites.',
        impact: 'MEDIUM',
        confidence: 78,
        dataPoints: efficiencyMetrics.map(m => m.name),
        actionable: true
      });
    }

    return insights;
  }

  /**
   * Generate value recommendations
   */
  private async generateValueRecommendations(initiative: any, insights: ValueInsight[]): Promise<ValueRecommendation[]> {
    const recommendations: ValueRecommendation[] = [];

    // High-impact actionable insights become recommendations
    const actionableInsights = insights.filter(i => i.actionable && i.impact === 'HIGH');
    
    actionableInsights.forEach((insight, index) => {
      recommendations.push({
        id: `rec_${Date.now()}_${index}`,
        priority: 'HIGH',
        category: 'OPTIMIZATION',
        title: `Optimize Based on ${insight.title}`,
        description: `Leverage the insight about ${insight.title.toLowerCase()} to accelerate value delivery.`,
        expectedImpact: 'Potential 15-25% improvement in value delivery timeline',
        effort: 'MEDIUM',
        timeline: '2-4 weeks',
        owner: 'ACCOUNTABLE' as any,
        dependencies: ['Stakeholder alignment', 'Resource allocation']
      });
    });

    // Standard recommendations based on value patterns
    recommendations.push({
      id: `rec_standard_${Date.now()}`,
      priority: 'MEDIUM',
      category: 'ACCELERATION',
      title: 'Implement Value-Based Milestone Reviews',
      description: 'Establish regular milestone reviews focused on value delivery metrics rather than just completion.',
      expectedImpact: 'Improved alignment and faster course correction',
      effort: 'LOW',
      timeline: '1 week',
      owner: 'ACCOUNTABLE' as any,
      dependencies: ['RACI stakeholder buy-in']
    });

    return recommendations;
  }

  /**
   * Update metrics for an initiative
   */
  async updateMetrics(initiativeId: string, newMetrics: ValueMetric[]): Promise<void> {
    const existingMetrics = this.valueMetrics.get(initiativeId) || [];
    
    // Merge new metrics with existing ones (replace if same ID)
    const updatedMetrics = [...existingMetrics];
    
    newMetrics.forEach(newMetric => {
      const existingIndex = updatedMetrics.findIndex(m => m.id === newMetric.id);
      if (existingIndex >= 0) {
        updatedMetrics[existingIndex] = newMetric;
      } else {
        updatedMetrics.push(newMetric);
      }
    });

    this.valueMetrics.set(initiativeId, updatedMetrics);
    
    // Trigger report regeneration if needed
    if (this.trackingConfig.updateFrequency === 'REAL_TIME') {
      await this.generateValueReport(initiativeId);
    }
  }

  /**
   * Get workspace value summary
   */
  async getWorkspaceValueSummary(workspaceId: string): Promise<{
    totalValueRealized: number;
    totalValueProjected: number;
    averageROI: number;
    initiativeCount: number;
    topPerformingInitiatives: string[];
    valueByCategory: Record<ValueMetricCategory, number>;
    raciEffectiveness: Record<RACIRole, number>;
  }> {
    // Get all initiatives for workspace
    const initiatives = await initiativeService.getInitiativesByWorkspace(workspaceId);
    
    let totalValueRealized = 0;
    let totalValueProjected = 0;
    let totalROI = 0;
    const valueByCategory: Record<ValueMetricCategory, number> = {} as any;
    const raciScores: Record<RACIRole, number[]> = {
      RESPONSIBLE: [],
      ACCOUNTABLE: [],
      CONSULTED: [],
      INFORMED: []
    };

    // Aggregate metrics across all initiatives
    for (const initiative of initiatives) {
      try {
        const report = await this.generateValueReport(initiative.id);
        totalValueRealized += report.valueSummary.valueRealized;
        totalValueProjected += report.valueSummary.valueProjected;
        totalROI += report.valueSummary.estimatedROI;

        // Aggregate by category
        Object.entries(report.metricsByCategory).forEach(([category, metrics]) => {
          const categoryValue = metrics.reduce((sum, m) => 
            sum + (typeof m.value === 'number' ? m.value : 0), 0);
          valueByCategory[category as ValueMetricCategory] = 
            (valueByCategory[category as ValueMetricCategory] || 0) + categoryValue;
        });

        // Aggregate RACI effectiveness
        raciScores.ACCOUNTABLE.push(report.raciValueContribution.accountable.performance.stakeholderSatisfaction);
        report.raciValueContribution.responsible.forEach(r => 
          raciScores.RESPONSIBLE.push(r.performance.stakeholderSatisfaction));
      } catch (error) {
        console.warn(`Could not generate report for initiative ${initiative.id}:`, error);
      }
    }

    const averageROI = initiatives.length > 0 ? totalROI / initiatives.length : 0;
    
    // Calculate RACI effectiveness averages
    const raciEffectiveness: Record<RACIRole, number> = {
      RESPONSIBLE: raciScores.RESPONSIBLE.length > 0 ? 
        raciScores.RESPONSIBLE.reduce((a, b) => a + b, 0) / raciScores.RESPONSIBLE.length : 0,
      ACCOUNTABLE: raciScores.ACCOUNTABLE.length > 0 ? 
        raciScores.ACCOUNTABLE.reduce((a, b) => a + b, 0) / raciScores.ACCOUNTABLE.length : 0,
      CONSULTED: 85, // Mock values for consulted/informed
      INFORMED: 80
    };

    return {
      totalValueRealized,
      totalValueProjected,
      averageROI,
      initiativeCount: initiatives.length,
      topPerformingInitiatives: initiatives
        .sort((a, b) => (b.value?.metrics?.length || 0) - (a.value?.metrics?.length || 0))
        .slice(0, 5)
        .map(i => i.name),
      valueByCategory,
      raciEffectiveness
    };
  }

  // Helper methods
  private getDefaultTrackingConfig(): ValueTrackingConfig {
    return {
      updateFrequency: 'DAILY',
      metricThresholds: {
        [ValueMetricCategory.REVENUE]: 10000,
        [ValueMetricCategory.COST_REDUCTION]: 5000,
        [ValueMetricCategory.TIME_TO_MARKET]: 30,
        [ValueMetricCategory.QUALITY]: 80,
        [ValueMetricCategory.CUSTOMER_SATISFACTION]: 4.0,
        [ValueMetricCategory.MARKET_SHARE]: 5,
        [ValueMetricCategory.EFFICIENCY]: 75,
        [ValueMetricCategory.INNOVATION]: 70
      },
      alertRules: [],
      reportingSchedule: []
    };
  }

  private initializeValueTracking(): void {
    // Initialize any background processes
    console.log('Value tracking service initialized');
  }

  private organizeMetricsByCategory(metrics: ValueMetric[]): Record<ValueMetricCategory, ValueMetric[]> {
    const organized: Record<ValueMetricCategory, ValueMetric[]> = {} as any;
    
    Object.values(ValueMetricCategory).forEach(category => {
      organized[category] = metrics.filter(m => m.category === category);
    });
    
    return organized;
  }

  private calculateReportConfidence(metrics: ValueMetric[], raciContribution: any): number {
    const avgMetricConfidence = metrics.length > 0 ? 
      metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length : 0;
    
    const raciConfidence = raciContribution.accountable.performance.qualityScore;
    
    return Math.round((avgMetricConfidence + raciConfidence) / 2);
  }

  private calculateQualityScore(tasks: any[]): number {
    if (tasks.length === 0) return 85; // Default score
    
    const completedTasks = tasks.filter(t => t.status === 'DONE');
    const qualityScores = completedTasks.map(task => {
      // Mock quality calculation based on task completion criteria
      const criteriaCount = task.definitionOfDone?.criteria?.length || 0;
      return criteriaCount > 0 ? Math.min(100, 70 + criteriaCount * 5) : 75;
    });
    
    return qualityScores.length > 0 ? 
      Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) : 85;
  }

  private calculateEfficiencyScore(tasks: any[]): number {
    if (tasks.length === 0) return 80; // Default score
    
    const onTimeTask = tasks.filter(task => !task.isOverdue).length;
    const efficiencyBase = (onTimeTask / tasks.length) * 100;
    
    // Add efficiency boost for completed tasks
    const completedTasks = tasks.filter(t => t.status === 'DONE');
    const completionBonus = (completedTasks.length / tasks.length) * 10;
    
    return Math.min(100, Math.round(efficiencyBase + completionBonus));
  }

  private estimateInitiativeInvestment(initiative: any): number {
    // Simplified investment estimation
    const baseInvestment = 100000; // $100k base
    const complexityMultiplier = initiative.priority === 'HIGH' ? 1.5 : 1.0;
    const suiteCount = (initiative.raci?.responsible?.length || 1) + 
                      (initiative.raci?.consulted?.length || 0) + 1; // +1 for accountable
    
    return baseInvestment * complexityMultiplier * (suiteCount * 0.2 + 0.8);
  }

  private calculateNPV(futureValue: number, investment: number, discountRate: number, years: number): number {
    return futureValue / Math.pow(1 + discountRate, years) - investment;
  }

  private async getSuiteTypeFromId(suiteId: string): Promise<SuiteType> {
    // Extract suite type from mock ID pattern
    if (suiteId.includes('product')) return SuiteType.PRODUCT;
    if (suiteId.includes('marketing')) return SuiteType.MARKETING;
    if (suiteId.includes('development')) return SuiteType.DEVELOPMENT;
    if (suiteId.includes('operations')) return SuiteType.OPERATIONS;
    if (suiteId.includes('strategy')) return SuiteType.STRATEGY;
    if (suiteId.includes('sales')) return SuiteType.SALES;
    return SuiteType.STRATEGY; // Default
  }

  private isTaskForSuite(task: any, suiteType: SuiteType): boolean {
    // Simplified check based on agent requirements
    const primaryAgent = task.agentRequirements?.primary || '';
    
    switch (suiteType) {
      case SuiteType.PRODUCT:
        return primaryAgent.includes('PERSONA') || primaryAgent.includes('JTBD');
      case SuiteType.MARKETING:
        return primaryAgent.includes('SEGMENTATION') || primaryAgent.includes('MARKETING');
      case SuiteType.DEVELOPMENT:
        return primaryAgent.includes('API') || primaryAgent.includes('ARCHITECTURE');
      case SuiteType.STRATEGY:
        return primaryAgent.includes('STRATEGY') || primaryAgent.includes('FINANCIAL');
      case SuiteType.SALES:
        return primaryAgent.includes('PRICING') || primaryAgent.includes('SALES');
      default:
        return false;
    }
  }

  private calculateSuiteValueDelivered(tasks: any[], metrics: ValueMetric[]): number {
    const completedTasks = tasks.filter(t => t.status === 'DONE');
    const baseValue = completedTasks.length * 5000; // $5k per completed task
    
    // Add metric-based value
    const relevantMetrics = metrics.filter(m => 
      m.category === ValueMetricCategory.REVENUE || 
      m.category === ValueMetricCategory.COST_REDUCTION
    );
    const metricsValue = relevantMetrics.reduce((sum, m) => 
      sum + (typeof m.value === 'number' ? m.value * 0.1 : 0), 0); // 10% attribution
    
    return baseValue + metricsValue;
  }

  private calculateSuiteCostIncurred(tasks: any[]): number {
    // Simplified cost calculation based on estimated duration
    const totalHours = tasks.reduce((sum, task) => 
      sum + (task.estimatedDuration || 40), 0); // Default 40 hours per task
    return totalHours * 150; // $150 per hour blended rate
  }

  private calculateSuiteQualityScore(tasks: any[]): number {
    return this.calculateQualityScore(tasks);
  }

  private calculateRiskMitigated(tasks: any[]): number {
    // Mock risk mitigation value based on task completion
    const completedTasks = tasks.filter(t => t.status === 'DONE');
    return completedTasks.length * 2000; // $2k risk mitigation per completed task
  }

  private calculateEfficiencyGained(tasks: any[]): number {
    // Mock efficiency gained based on task performance
    const onTimeTask = tasks.filter(task => !task.isOverdue);
    return onTimeTask.length * 1000; // $1k efficiency per on-time task
  }
}

// Export singleton instance
export const valueTrackingService = new ValueTrackingService();