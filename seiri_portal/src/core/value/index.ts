// Value Tracking Module Index
// Comprehensive value tracking, dashboards, and alerting for the Suite-Initiative architecture

// Core Value Tracking
export { 
  ValueTrackingService,
  valueTrackingService
} from './value-tracking.service';

export type {
  ValueMetric,
  ValueMetricCategory,
  InitiativeValueReport,
  SuiteValueContribution,
  ValueInsight,
  ValueRecommendation,
  ValueTrackingConfig
} from './value-tracking.service';

// Dashboard Services
export {
  ValueDashboardService,
  valueDashboardService
} from './value-dashboard.service';

export type {
  DashboardWidget,
  WidgetType,
  ValueDashboard,
  DashboardType,
  DashboardAudience,
  VisualizationConfig,
  DashboardSnapshot
} from './value-dashboard.service';

// Alert Services
export {
  ValueAlertsService,
  valueAlertsService
} from './value-alerts.service';

export type {
  ValueAlert,
  AlertType,
  AlertSeverity,
  AlertStatus,
  AlertRule,
  AlertCondition,
  AlertInsight,
  NotificationChannel
} from './value-alerts.service';

// Import services and types for ValueManager
import { valueTrackingService, ValueMetric, ValueMetricCategory, InitiativeValueReport, SuiteValueContribution, ValueInsight, ValueRecommendation } from './value-tracking.service';
import { valueDashboardService, ValueDashboard } from './value-dashboard.service';
import { valueAlertsService, ValueAlert } from './value-alerts.service';

// Centralized Value Management
export class ValueManager {
  private static trackingService = valueTrackingService;
  private static dashboardService = valueDashboardService;
  private static alertsService = valueAlertsService;

  /**
   * Initialize value tracking for a new initiative
   */
  static async initializeInitiativeTracking(initiativeId: string): Promise<{
    valueReport: InitiativeValueReport;
    clientDashboard: ValueDashboard;
    alertRules: string[];
  }> {
    // Generate initial value report
    const valueReport = await this.trackingService.generateValueReport(initiativeId);
    
    // Create client dashboard
    const clientDashboard = await this.dashboardService.createClientDashboard(initiativeId);
    
    // Initialize alert monitoring
    await this.alertsService.processMetrics(
      initiativeId, 
      Object.values(valueReport.metricsByCategory).flat()
    );
    
    return {
      valueReport,
      clientDashboard,
      alertRules: ['rule_roi_threshold', 'rule_quality_issue', 'rule_timeline_risk']
    };
  }

  /**
   * Initialize workspace-level value tracking
   */
  static async initializeWorkspaceTracking(workspaceId: string): Promise<{
    executiveDashboard: ValueDashboard;
    suiteDashboards: ValueDashboard[];
    workspaceSummary: any;
  }> {
    // Create executive dashboard
    const executiveDashboard = await this.dashboardService.createExecutiveDashboard(workspaceId);
    
    // Create suite-specific dashboards
    const suiteTypes = ['PRODUCT', 'MARKETING', 'DEVELOPMENT', 'OPERATIONS', 'STRATEGY', 'SALES'];
    const suiteDashboards = [];
    
    for (const suiteType of suiteTypes) {
      const dashboard = await this.dashboardService.createSuiteDashboard(
        workspaceId, 
        suiteType as any
      );
      suiteDashboards.push(dashboard);
    }
    
    // Generate workspace summary
    const workspaceSummary = await this.trackingService.getWorkspaceValueSummary(workspaceId);
    
    return {
      executiveDashboard,
      suiteDashboards,
      workspaceSummary
    };
  }

  /**
   * Update initiative metrics and trigger analysis
   */
  static async updateInitiativeMetrics(
    initiativeId: string, 
    newMetrics: ValueMetric[]
  ): Promise<{
    updatedReport: InitiativeValueReport;
    triggeredAlerts: ValueAlert[];
    insights: ValueInsight[];
  }> {
    // Update metrics
    await this.trackingService.updateMetrics(initiativeId, newMetrics);
    
    // Process alerts
    const triggeredAlerts = await this.alertsService.processMetrics(initiativeId, newMetrics);
    
    // Generate updated report
    const updatedReport = await this.trackingService.generateValueReport(initiativeId);
    
    return {
      updatedReport,
      triggeredAlerts,
      insights: updatedReport.insights
    };
  }

  /**
   * Get comprehensive value overview for client presentation
   */
  static async getClientValueOverview(initiativeId: string): Promise<{
    executiveSummary: string;
    keyMetrics: ValueMetric[];
    progressIndicators: any;
    riskFactors: string[];
    nextMilestones: string[];
    recommendedActions: string[];
    dashboardUrl: string;
  }> {
    const valueReport = await this.trackingService.generateValueReport(initiativeId);
    
    return {
      executiveSummary: valueReport.clientDashboard.executiveSummary,
      keyMetrics: valueReport.clientDashboard.keyMetrics,
      progressIndicators: {
        completion: valueReport.progress.completionPercentage,
        timeline: valueReport.progress.timelineVariance,
        budget: valueReport.progress.budgetVariance,
        quality: valueReport.metricsByCategory[ValueMetricCategory.QUALITY]?.[0]?.value || 0
      },
      riskFactors: valueReport.clientDashboard.riskFactors,
      nextMilestones: valueReport.clientDashboard.nextMilestones,
      recommendedActions: valueReport.clientDashboard.recommendedActions,
      dashboardUrl: `/dashboard/client/${initiativeId}`
    };
  }

  /**
   * Get RACI value performance summary
   */
  static async getRACIValuePerformance(initiativeId: string): Promise<{
    raciEffectiveness: Record<string, number>;
    valueContribution: any;
    performanceInsights: ValueInsight[];
    recommendations: ValueRecommendation[];
  }> {
    const valueReport = await this.trackingService.generateValueReport(initiativeId);
    
    const raciEffectiveness = {
      'Responsible Suites': this.calculateAverageContribution(valueReport.raciValueContribution.responsible),
      'Accountable Suite': valueReport.raciValueContribution.accountable.performance.stakeholderSatisfaction,
      'Consulted Suites': this.calculateAverageContribution(valueReport.raciValueContribution.consulted),
      'Informed Suites': this.calculateAverageContribution(valueReport.raciValueContribution.informed)
    };
    
    const performanceInsights = valueReport.insights.filter(insight => 
      insight.title.toLowerCase().includes('raci') || 
      insight.title.toLowerCase().includes('suite')
    );
    
    const recommendations = valueReport.recommendations.filter(rec =>
      rec.category === 'OPTIMIZATION' && rec.owner !== 'RESPONSIBLE'
    );
    
    return {
      raciEffectiveness,
      valueContribution: valueReport.raciValueContribution,
      performanceInsights,
      recommendations
    };
  }

  /**
   * Generate value trending analysis
   */
  static async generateValueTrending(
    workspaceId: string, 
    timeRange: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'
  ): Promise<{
    trendAnalysis: any;
    projections: any;
    recommendations: string[];
    alertTrends: any;
  }> {
    // Mock trending analysis - in real implementation this would analyze historical data
    const workspaceSummary = await this.trackingService.getWorkspaceValueSummary(workspaceId);
    const alertStats = this.alertsService.getAlertStatistics();
    
    return {
      trendAnalysis: {
        roi_trend: 'INCREASING',
        value_realization_rate: workspaceSummary.totalValueRealized / workspaceSummary.totalValueProjected,
        efficiency_trend: 'STABLE',
        quality_trend: 'INCREASING'
      },
      projections: {
        projected_roi_12_months: workspaceSummary.averageROI * 1.15,
        projected_value_realization: workspaceSummary.totalValueProjected * 0.85,
        risk_factors: ['Resource constraints', 'Market volatility', 'Technology dependencies']
      },
      recommendations: [
        'Focus on high-ROI initiatives for maximum impact',
        'Improve cross-suite coordination to reduce timeline risks',
        'Implement proactive quality measures to maintain trends',
        'Establish regular value review cycles'
      ],
      alertTrends: {
        alert_frequency: alertStats.totalAlerts,
        resolution_efficiency: alertStats.averageResolutionTime,
        critical_alert_ratio: alertStats.criticalAlerts / alertStats.totalAlerts,
        most_common_alert_type: this.getMostCommonAlertType(alertStats.alertsByType)
      }
    };
  }

  /**
   * Export value data for external systems
   */
  static async exportValueData(
    workspaceId: string,
    format: 'JSON' | 'CSV' | 'PDF' | 'EXCEL'
  ): Promise<{
    data: any;
    metadata: any;
    downloadUrl: string;
  }> {
    const workspaceSummary = await this.trackingService.getWorkspaceValueSummary(workspaceId);
    const alertStats = this.alertsService.getAlertStatistics();
    
    const exportData = {
      workspace_id: workspaceId,
      generated_at: new Date().toISOString(),
      summary: workspaceSummary,
      alert_statistics: alertStats,
      dashboards: this.dashboardService.getDashboards(workspaceId).map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        audience: d.audience
      }))
    };
    
    return {
      data: exportData,
      metadata: {
        format,
        generated_at: new Date(),
        record_count: Object.keys(exportData).length,
        file_size: JSON.stringify(exportData).length
      },
      downloadUrl: `/api/export/value/${workspaceId}?format=${format.toLowerCase()}`
    };
  }

  // Helper methods
  private static calculateAverageContribution(contributions: SuiteValueContribution[]): number {
    if (contributions.length === 0) return 0;
    
    const total = contributions.reduce((sum, contrib) => 
      sum + contrib.performance.stakeholderSatisfaction, 0);
    
    return Math.round(total / contributions.length);
  }

  private static getMostCommonAlertType(alertsByType: Record<string, number>): string {
    let maxCount = 0;
    let mostCommonType = 'NONE';
    
    Object.entries(alertsByType).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonType = type;
      }
    });
    
    return mostCommonType;
  }

  /**
   * Health check for value tracking system
   */
  static async healthCheck(): Promise<{
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    services: Record<string, boolean>;
    metrics: any;
    recommendations: string[];
  }> {
    const services = {
      value_tracking: true, // Mock service health
      dashboards: true,
      alerts: true,
      notifications: true
    };
    
    const allServicesHealthy = Object.values(services).every(status => status);
    const alertStats = this.alertsService.getAlertStatistics();
    
    const status = allServicesHealthy ? 
      (alertStats.criticalAlerts > 10 ? 'DEGRADED' : 'HEALTHY') : 
      'UNHEALTHY';
    
    return {
      status,
      services,
      metrics: {
        active_alerts: alertStats.activeAlerts,
        critical_alerts: alertStats.criticalAlerts,
        average_resolution_time: alertStats.averageResolutionTime,
        system_uptime: '99.9%'
      },
      recommendations: status === 'HEALTHY' ? 
        ['System operating normally'] : 
        ['Review critical alerts', 'Check service dependencies', 'Consider scaling resources']
    };
  }
}

// Export the centralized manager
export default ValueManager;