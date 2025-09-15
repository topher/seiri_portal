// Value Dashboard Service
// Client-facing dashboards and visualizations for initiative value tracking

import { valueTrackingService, ValueMetric, ValueMetricCategory, InitiativeValueReport } from './value-tracking.service';
import { SuiteType, RACIRole } from '@/core/suites/suite.model';
import { initiativeService } from '@/core/initiatives/initiative.service';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  data: any;
  visualization: VisualizationConfig;
  refreshRate: number; // seconds
  position: { x: number; y: number; width: number; height: number };
  permissions: string[];
}

export enum WidgetType {
  KPI_CARD = 'KPI_CARD',
  LINE_CHART = 'LINE_CHART',
  BAR_CHART = 'BAR_CHART',
  PIE_CHART = 'PIE_CHART',
  GAUGE = 'GAUGE',
  TABLE = 'TABLE',
  HEATMAP = 'HEATMAP',
  PROGRESS_BAR = 'PROGRESS_BAR',
  METRIC_COMPARISON = 'METRIC_COMPARISON',
  RACI_MATRIX = 'RACI_MATRIX'
}

export interface VisualizationConfig {
  chartType?: string;
  xAxis?: string;
  yAxis?: string;
  colorScheme?: string[];
  thresholds?: { value: number; color: string; label: string }[];
  formatters?: Record<string, string>;
  aggregation?: 'SUM' | 'AVERAGE' | 'COUNT' | 'MAX' | 'MIN';
}

export interface ValueDashboard {
  id: string;
  name: string;
  description: string;
  type: DashboardType;
  audience: DashboardAudience;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  filters: DashboardFilter[];
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  permissions: DashboardPermissions;
  createdAt: Date;
  lastModified: Date;
}

export enum DashboardType {
  EXECUTIVE = 'EXECUTIVE',
  OPERATIONAL = 'OPERATIONAL',
  FINANCIAL = 'FINANCIAL',
  SUITE_SPECIFIC = 'SUITE_SPECIFIC',
  CLIENT_FACING = 'CLIENT_FACING',
  INITIATIVE_SPECIFIC = 'INITIATIVE_SPECIFIC'
}

export enum DashboardAudience {
  EXECUTIVES = 'EXECUTIVES',
  CLIENTS = 'CLIENTS',
  PROJECT_MANAGERS = 'PROJECT_MANAGERS',
  SUITE_LEADS = 'SUITE_LEADS',
  STAKEHOLDERS = 'STAKEHOLDERS'
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  responsive: boolean;
  theme: 'LIGHT' | 'DARK' | 'AUTO';
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'DATE_RANGE' | 'INITIATIVE' | 'SUITE' | 'METRIC_CATEGORY' | 'CUSTOM';
  options: any[];
  defaultValue?: any;
  required: boolean;
}

export interface DashboardPermissions {
  viewers: string[];
  editors: string[];
  owners: string[];
  publicAccess: boolean;
  clientAccess: boolean;
}

export interface DashboardSnapshot {
  dashboardId: string;
  timestamp: Date;
  data: any;
  metrics: ValueMetric[];
  performance: {
    loadTime: number;
    dataPoints: number;
    accuracy: number;
  };
}

export class ValueDashboardService {
  private dashboards: Map<string, ValueDashboard> = new Map();
  private snapshots: Map<string, DashboardSnapshot[]> = new Map();
  private widgetCache: Map<string, any> = new Map();

  /**
   * Create executive dashboard for workspace overview
   */
  async createExecutiveDashboard(workspaceId: string): Promise<ValueDashboard> {
    const dashboardId = `exec_dash_${workspaceId}_${Date.now()}`;
    
    const widgets = await this.createExecutiveWidgets(workspaceId);
    
    const dashboard: ValueDashboard = {
      id: dashboardId,
      name: 'Executive Value Dashboard',
      description: 'High-level view of initiative value and ROI across the workspace',
      type: DashboardType.EXECUTIVE,
      audience: DashboardAudience.EXECUTIVES,
      widgets,
      layout: {
        columns: 4,
        rows: 3,
        responsive: true,
        theme: 'LIGHT'
      },
      filters: [
        {
          id: 'dateRange',
          name: 'Date Range',
          type: 'DATE_RANGE',
          options: ['Last 30 days', 'Last 90 days', 'Last year'],
          defaultValue: 'Last 90 days',
          required: false
        },
        {
          id: 'initiativeFilter',
          name: 'Initiatives',
          type: 'INITIATIVE',
          options: [], // Will be populated dynamically
          required: false
        }
      ],
      autoRefresh: true,
      refreshInterval: 300, // 5 minutes
      permissions: {
        viewers: ['executives', 'clients'],
        editors: ['executives'],
        owners: ['workspace_owner'],
        publicAccess: false,
        clientAccess: true
      },
      createdAt: new Date(),
      lastModified: new Date()
    };

    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  /**
   * Create client-facing dashboard for initiative transparency
   */
  async createClientDashboard(initiativeId: string): Promise<ValueDashboard> {
    const dashboardId = `client_dash_${initiativeId}_${Date.now()}`;
    const initiative = await initiativeService.getInitiative(initiativeId);
    
    const widgets = await this.createClientWidgets(initiativeId);
    
    const dashboard: ValueDashboard = {
      id: dashboardId,
      name: `Client Dashboard: ${initiative?.name || 'Initiative'}`,
      description: 'Client-focused view of initiative progress, value delivery, and key metrics',
      type: DashboardType.CLIENT_FACING,
      audience: DashboardAudience.CLIENTS,
      widgets,
      layout: {
        columns: 3,
        rows: 4,
        responsive: true,
        theme: 'LIGHT'
      },
      filters: [
        {
          id: 'metricCategory',
          name: 'Metric Category',
          type: 'METRIC_CATEGORY',
          options: Object.values(ValueMetricCategory),
          required: false
        }
      ],
      autoRefresh: true,
      refreshInterval: 600, // 10 minutes
      permissions: {
        viewers: ['clients', 'stakeholders'],
        editors: ['project_managers'],
        owners: ['initiative_lead'],
        publicAccess: false,
        clientAccess: true
      },
      createdAt: new Date(),
      lastModified: new Date()
    };

    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  /**
   * Create suite-specific operational dashboard
   */
  async createSuiteDashboard(workspaceId: string, suiteType: SuiteType): Promise<ValueDashboard> {
    const dashboardId = `suite_dash_${suiteType}_${workspaceId}_${Date.now()}`;
    
    const widgets = await this.createSuiteWidgets(workspaceId, suiteType);
    
    const dashboard: ValueDashboard = {
      id: dashboardId,
      name: `${suiteType} Suite Dashboard`,
      description: `Operational dashboard for ${suiteType} suite value contribution and performance`,
      type: DashboardType.SUITE_SPECIFIC,
      audience: DashboardAudience.SUITE_LEADS,
      widgets,
      layout: {
        columns: 3,
        rows: 3,
        responsive: true,
        theme: 'DARK'
      },
      filters: [
        {
          id: 'initiative',
          name: 'Initiative',
          type: 'INITIATIVE',
          options: [], // Populated dynamically
          required: false
        }
      ],
      autoRefresh: true,
      refreshInterval: 180, // 3 minutes
      permissions: {
        viewers: [`${suiteType.toLowerCase()}_team`, 'project_managers'],
        editors: [`${suiteType.toLowerCase()}_lead`],
        owners: [`${suiteType.toLowerCase()}_lead`],
        publicAccess: false,
        clientAccess: false
      },
      createdAt: new Date(),
      lastModified: new Date()
    };

    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  /**
   * Create executive widgets
   */
  private async createExecutiveWidgets(workspaceId: string): Promise<DashboardWidget[]> {
    const summary = await valueTrackingService.getWorkspaceValueSummary(workspaceId);
    
    return [
      // ROI Overview
      {
        id: 'widget_roi_overview',
        type: WidgetType.KPI_CARD,
        title: 'Average ROI',
        description: 'Weighted average ROI across all initiatives',
        data: {
          value: summary.averageROI,
          unit: '%',
          trend: summary.averageROI > 15 ? 'positive' : 'neutral',
          target: 20,
          comparison: 'vs 20% target'
        },
        visualization: {
          colorScheme: ['#4CAF50', '#FF9800', '#F44336'],
          thresholds: [
            { value: 20, color: '#4CAF50', label: 'Excellent' },
            { value: 10, color: '#FF9800', label: 'Good' },
            { value: 0, color: '#F44336', label: 'Needs Attention' }
          ]
        },
        refreshRate: 300,
        position: { x: 0, y: 0, width: 1, height: 1 },
        permissions: ['executives', 'clients']
      },
      
      // Value Realization
      {
        id: 'widget_value_realization',
        type: WidgetType.GAUGE,
        title: 'Value Realization',
        description: 'Percentage of projected value that has been realized',
        data: {
          current: summary.totalValueRealized,
          target: summary.totalValueProjected,
          percentage: summary.totalValueProjected > 0 ? 
            (summary.totalValueRealized / summary.totalValueProjected * 100) : 0
        },
        visualization: {
          colorScheme: ['#4CAF50', '#FF9800', '#F44336'],
          thresholds: [
            { value: 75, color: '#4CAF50', label: 'On Track' },
            { value: 50, color: '#FF9800', label: 'At Risk' },
            { value: 25, color: '#F44336', label: 'Behind' }
          ]
        },
        refreshRate: 300,
        position: { x: 1, y: 0, width: 1, height: 1 },
        permissions: ['executives', 'clients']
      },

      // Value by Category
      {
        id: 'widget_value_by_category',
        type: WidgetType.PIE_CHART,
        title: 'Value by Category',
        description: 'Distribution of value across different metric categories',
        data: {
          categories: Object.entries(summary.valueByCategory).map(([category, value]) => ({
            name: category.replace('_', ' '),
            value,
            percentage: summary.totalValueProjected > 0 ? 
              (value / summary.totalValueProjected * 100) : 0
          }))
        },
        visualization: {
          colorScheme: ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'],
          aggregation: 'SUM'
        },
        refreshRate: 600,
        position: { x: 2, y: 0, width: 2, height: 2 },
        permissions: ['executives', 'clients']
      },

      // Initiative Performance
      {
        id: 'widget_initiative_performance',
        type: WidgetType.BAR_CHART,
        title: 'Top Performing Initiatives',
        description: 'Initiatives ranked by value delivery performance',
        data: {
          initiatives: summary.topPerformingInitiatives.map((name, index) => ({
            name,
            score: 100 - index * 10, // Mock performance score
            value: Math.random() * 100000 + 50000 // Mock value
          }))
        },
        visualization: {
          xAxis: 'initiatives',
          yAxis: 'performance_score',
          colorScheme: ['#4CAF50', '#2196F3'],
          aggregation: 'MAX'
        },
        refreshRate: 600,
        position: { x: 0, y: 1, width: 2, height: 1 },
        permissions: ['executives', 'project_managers']
      },

      // RACI Effectiveness
      {
        id: 'widget_raci_effectiveness',
        type: WidgetType.RACI_MATRIX,
        title: 'RACI Effectiveness',
        description: 'Performance scores across RACI roles',
        data: {
          roles: Object.entries(summary.raciEffectiveness).map(([role, score]) => ({
            role,
            score,
            status: score > 85 ? 'excellent' : score > 70 ? 'good' : 'needs_improvement'
          }))
        },
        visualization: {
          colorScheme: ['#4CAF50', '#FF9800', '#F44336'],
          thresholds: [
            { value: 85, color: '#4CAF50', label: 'Excellent' },
            { value: 70, color: '#FF9800', label: 'Good' },
            { value: 50, color: '#F44336', label: 'Needs Improvement' }
          ]
        },
        refreshRate: 600,
        position: { x: 0, y: 2, width: 2, height: 1 },
        permissions: ['executives', 'suite_leads']
      },

      // Value Trend
      {
        id: 'widget_value_trend',
        type: WidgetType.LINE_CHART,
        title: 'Value Delivery Trend',
        description: 'Value realization over time across all initiatives',
        data: await this.generateValueTrendData(workspaceId),
        visualization: {
          xAxis: 'date',
          yAxis: 'cumulative_value',
          colorScheme: ['#2196F3', '#4CAF50'],
          aggregation: 'SUM'
        },
        refreshRate: 600,
        position: { x: 2, y: 2, width: 2, height: 1 },
        permissions: ['executives', 'clients']
      }
    ];
  }

  /**
   * Create client widgets for initiative transparency
   */
  private async createClientWidgets(initiativeId: string): Promise<DashboardWidget[]> {
    const valueReport = await valueTrackingService.generateValueReport(initiativeId);
    
    return [
      // Initiative Overview
      {
        id: 'widget_initiative_overview',
        type: WidgetType.KPI_CARD,
        title: 'Initiative ROI',
        description: 'Expected return on investment for this initiative',
        data: {
          value: valueReport.valueSummary.estimatedROI,
          unit: '%',
          trend: valueReport.valueSummary.estimatedROI > 0 ? 'positive' : 'neutral',
          subtitle: `$${valueReport.valueSummary.valueProjected.toLocaleString()} projected value`
        },
        visualization: {
          colorScheme: ['#4CAF50', '#FF9800', '#F44336'],
          thresholds: [
            { value: 15, color: '#4CAF50', label: 'Strong ROI' },
            { value: 5, color: '#FF9800', label: 'Moderate ROI' },
            { value: 0, color: '#F44336', label: 'Low ROI' }
          ]
        },
        refreshRate: 600,
        position: { x: 0, y: 0, width: 1, height: 1 },
        permissions: ['clients', 'stakeholders']
      },

      // Progress Indicator
      {
        id: 'widget_progress',
        type: WidgetType.PROGRESS_BAR,
        title: 'Initiative Progress',
        description: 'Overall completion percentage',
        data: {
          percentage: valueReport.progress.completionPercentage,
          milestones: valueReport.progress.milestoneProgress.map(m => ({
            name: m.name,
            status: m.status,
            date: m.targetDate
          }))
        },
        visualization: {
          colorScheme: ['#4CAF50', '#FF9800', '#F44336'],
          thresholds: [
            { value: 75, color: '#4CAF50', label: 'On Track' },
            { value: 50, color: '#FF9800', label: 'Monitor' },
            { value: 25, color: '#F44336', label: 'At Risk' }
          ]
        },
        refreshRate: 300,
        position: { x: 1, y: 0, width: 2, height: 1 },
        permissions: ['clients', 'stakeholders']
      },

      // Key Metrics
      {
        id: 'widget_key_metrics',
        type: WidgetType.TABLE,
        title: 'Key Performance Metrics',
        description: 'Critical metrics being tracked for this initiative',
        data: {
          metrics: valueReport.clientDashboard.keyMetrics.map(metric => ({
            name: metric.name,
            current: metric.value,
            target: metric.target || 'N/A',
            unit: metric.unit,
            status: this.getMetricStatus(metric)
          }))
        },
        visualization: {
          colorScheme: ['#4CAF50', '#FF9800', '#F44336'],
          formatters: {
            currency: '$#,##0',
            percentage: '#0%',
            number: '#,##0'
          }
        },
        refreshRate: 600,
        position: { x: 0, y: 1, width: 3, height: 2 },
        permissions: ['clients', 'stakeholders']
      },

      // Value Realization Timeline
      {
        id: 'widget_value_timeline',
        type: WidgetType.LINE_CHART,
        title: 'Value Realization Timeline',
        description: 'Projected vs actual value delivery over time',
        data: await this.generateInitiativeValueTimeline(initiativeId),
        visualization: {
          xAxis: 'date',
          yAxis: 'value',
          colorScheme: ['#2196F3', '#4CAF50'],
          aggregation: 'SUM'
        },
        refreshRate: 600,
        position: { x: 0, y: 3, width: 3, height: 1 },
        permissions: ['clients', 'stakeholders']
      }
    ];
  }

  /**
   * Create suite-specific widgets
   */
  private async createSuiteWidgets(workspaceId: string, suiteType: SuiteType): Promise<DashboardWidget[]> {
    const summary = await valueTrackingService.getWorkspaceValueSummary(workspaceId);
    
    return [
      // Suite Performance
      {
        id: `widget_${suiteType.toLowerCase()}_performance`,
        type: WidgetType.GAUGE,
        title: `${suiteType} Performance`,
        description: `Overall performance score for ${suiteType} suite`,
        data: {
          current: summary.raciEffectiveness.RESPONSIBLE || 80,
          target: 90,
          percentage: summary.raciEffectiveness.RESPONSIBLE || 80
        },
        visualization: {
          colorScheme: ['#4CAF50', '#FF9800', '#F44336'],
          thresholds: [
            { value: 85, color: '#4CAF50', label: 'Excellent' },
            { value: 70, color: '#FF9800', label: 'Good' },
            { value: 50, color: '#F44336', label: 'Needs Improvement' }
          ]
        },
        refreshRate: 300,
        position: { x: 0, y: 0, width: 1, height: 1 },
        permissions: [`${suiteType.toLowerCase()}_team`]
      },

      // Value Contribution
      {
        id: `widget_${suiteType.toLowerCase()}_contribution`,
        type: WidgetType.BAR_CHART,
        title: 'Value Contribution by Initiative',
        description: `${suiteType} suite's value contribution across initiatives`,
        data: await this.generateSuiteContributionData(workspaceId, suiteType),
        visualization: {
          xAxis: 'initiative',
          yAxis: 'value_contributed',
          colorScheme: ['#2196F3', '#4CAF50'],
          aggregation: 'SUM'
        },
        refreshRate: 600,
        position: { x: 1, y: 0, width: 2, height: 2 },
        permissions: [`${suiteType.toLowerCase()}_team`, 'project_managers']
      },

      // Task Efficiency
      {
        id: `widget_${suiteType.toLowerCase()}_efficiency`,
        type: WidgetType.HEATMAP,
        title: 'Task Efficiency Heatmap',
        description: 'Efficiency scores across different task types and time periods',
        data: await this.generateEfficiencyHeatmapData(workspaceId, suiteType),
        visualization: {
          colorScheme: ['#F44336', '#FF9800', '#4CAF50'],
          thresholds: [
            { value: 85, color: '#4CAF50', label: 'High Efficiency' },
            { value: 70, color: '#FF9800', label: 'Medium Efficiency' },
            { value: 50, color: '#F44336', label: 'Low Efficiency' }
          ]
        },
        refreshRate: 600,
        position: { x: 0, y: 1, width: 1, height: 2 },
        permissions: [`${suiteType.toLowerCase()}_team`, 'suite_leads']
      },

      // Upcoming Deliverables
      {
        id: `widget_${suiteType.toLowerCase()}_deliverables`,
        type: WidgetType.TABLE,
        title: 'Upcoming Deliverables',
        description: 'Tasks and deliverables due in the next 30 days',
        data: await this.generateUpcomingDeliverablesData(workspaceId, suiteType),
        visualization: {
          colorScheme: ['#4CAF50', '#FF9800', '#F44336'],
          formatters: {
            date: 'MM/DD/YYYY',
            priority: 'text'
          }
        },
        refreshRate: 300,
        position: { x: 1, y: 2, width: 2, height: 1 },
        permissions: [`${suiteType.toLowerCase()}_team`]
      }
    ];
  }

  /**
   * Get dashboard data in real-time
   */
  async getDashboardData(dashboardId: string, filters?: Record<string, any>): Promise<{
    dashboard: ValueDashboard;
    widgetData: Record<string, any>;
    lastUpdated: Date;
  }> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const widgetData: Record<string, any> = {};
    
    // Refresh widget data based on filters
    for (const widget of dashboard.widgets) {
      const cacheKey = `${widget.id}_${JSON.stringify(filters || {})}`;
      
      if (this.widgetCache.has(cacheKey)) {
        widgetData[widget.id] = this.widgetCache.get(cacheKey);
      } else {
        // Generate fresh data for widget
        const freshData = await this.generateWidgetData(widget, filters);
        this.widgetCache.set(cacheKey, freshData);
        widgetData[widget.id] = freshData;
        
        // Cache for widget refresh rate
        setTimeout(() => {
          this.widgetCache.delete(cacheKey);
        }, widget.refreshRate * 1000);
      }
    }

    return {
      dashboard,
      widgetData,
      lastUpdated: new Date()
    };
  }

  /**
   * Create dashboard snapshot for historical analysis
   */
  async createSnapshot(dashboardId: string): Promise<DashboardSnapshot> {
    const dashboardData = await this.getDashboardData(dashboardId);
    
    const snapshot: DashboardSnapshot = {
      dashboardId,
      timestamp: new Date(),
      data: dashboardData.widgetData,
      metrics: [], // Will be populated based on dashboard type
      performance: {
        loadTime: Math.random() * 2000 + 500, // Mock load time
        dataPoints: Object.keys(dashboardData.widgetData).length,
        accuracy: 95 + Math.random() * 5 // Mock accuracy
      }
    };

    // Store snapshot
    const snapshots = this.snapshots.get(dashboardId) || [];
    snapshots.push(snapshot);
    
    // Keep only last 100 snapshots
    if (snapshots.length > 100) {
      snapshots.shift();
    }
    
    this.snapshots.set(dashboardId, snapshots);
    
    return snapshot;
  }

  // Helper methods for data generation
  private async generateValueTrendData(workspaceId: string): Promise<any> {
    // Generate mock trend data
    const days = 30;
    const data = [];
    let cumulativeValue = 0;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      cumulativeValue += Math.random() * 10000 + 5000;
      
      data.push({
        date: date.toISOString().split('T')[0],
        cumulative_value: Math.round(cumulativeValue),
        daily_value: Math.round(Math.random() * 10000 + 5000)
      });
    }
    
    return { timeSeries: data };
  }

  private async generateInitiativeValueTimeline(initiativeId: string): Promise<any> {
    // Generate mock timeline data
    const weeks = 12;
    const data = [];
    let projectedValue = 0;
    let actualValue = 0;
    
    for (let i = 0; i < weeks; i++) {
      const date = new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000);
      projectedValue += Math.random() * 15000 + 10000;
      actualValue += Math.random() * 12000 + 8000;
      
      data.push({
        date: date.toISOString().split('T')[0],
        projected_value: Math.round(projectedValue),
        actual_value: Math.round(actualValue)
      });
    }
    
    return { timeSeries: data };
  }

  private async generateSuiteContributionData(workspaceId: string, suiteType: SuiteType): Promise<any> {
    // Mock suite contribution data
    const initiatives = ['Initiative A', 'Initiative B', 'Initiative C', 'Initiative D'];
    
    return {
      contributions: initiatives.map(initiative => ({
        initiative,
        value_contributed: Math.round(Math.random() * 50000 + 20000),
        hours_invested: Math.round(Math.random() * 200 + 100),
        tasks_completed: Math.round(Math.random() * 10 + 5)
      }))
    };
  }

  private async generateEfficiencyHeatmapData(workspaceId: string, suiteType: SuiteType): Promise<any> {
    const taskTypes = ['Analysis', 'Design', 'Implementation', 'Review'];
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    
    const heatmapData = [];
    
    for (const week of weeks) {
      for (const taskType of taskTypes) {
        heatmapData.push({
          week,
          task_type: taskType,
          efficiency_score: Math.round(Math.random() * 40 + 60) // 60-100 range
        });
      }
    }
    
    return { heatmap: heatmapData };
  }

  private async generateUpcomingDeliverablesData(workspaceId: string, suiteType: SuiteType): Promise<any> {
    // Mock upcoming deliverables
    const deliverables = [
      {
        name: 'User Persona Analysis',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        assignee: 'AI Agent Pool'
      },
      {
        name: 'Market Research Report',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        priority: 'MEDIUM',
        status: 'TODO',
        assignee: 'Research Agent'
      },
      {
        name: 'Competitive Analysis',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        priority: 'MEDIUM',
        status: 'TODO',
        assignee: 'Analysis Agent'
      }
    ];
    
    return { deliverables };
  }

  private async generateWidgetData(widget: DashboardWidget, filters?: Record<string, any>): Promise<any> {
    // Apply filters to widget data if needed
    let data = widget.data;
    
    if (filters) {
      // Apply date range filter
      if (filters.dateRange && widget.data.timeSeries) {
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        
        data = {
          ...data,
          timeSeries: data.timeSeries.filter((point: any) => {
            const pointDate = new Date(point.date);
            return pointDate >= startDate && pointDate <= endDate;
          })
        };
      }
      
      // Apply initiative filter
      if (filters.initiative && widget.data.initiatives) {
        data = {
          ...data,
          initiatives: data.initiatives.filter((init: any) => 
            filters.initiative.includes(init.name)
          )
        };
      }
    }
    
    return data;
  }

  private getMetricStatus(metric: ValueMetric): 'on_track' | 'at_risk' | 'behind' {
    if (!metric.target || typeof metric.value !== 'number' || typeof metric.target !== 'number') {
      return 'on_track';
    }
    
    const percentage = (metric.value / metric.target) * 100;
    
    if (percentage >= 90) return 'on_track';
    if (percentage >= 70) return 'at_risk';
    return 'behind';
  }

  /**
   * Get all dashboards for a workspace
   */
  getDashboards(workspaceId?: string): ValueDashboard[] {
    return Array.from(this.dashboards.values()).filter(dashboard => 
      !workspaceId || dashboard.name.includes(workspaceId)
    );
  }

  /**
   * Get dashboard by ID
   */
  getDashboard(dashboardId: string): ValueDashboard | null {
    return this.dashboards.get(dashboardId) || null;
  }

  /**
   * Update dashboard configuration
   */
  async updateDashboard(dashboardId: string, updates: Partial<ValueDashboard>): Promise<ValueDashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const updatedDashboard = {
      ...dashboard,
      ...updates,
      lastModified: new Date()
    };

    this.dashboards.set(dashboardId, updatedDashboard);
    return updatedDashboard;
  }
}

// Export singleton instance
export const valueDashboardService = new ValueDashboardService();