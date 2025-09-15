// Value Alerts Service
// Real-time alerting and notifications for value tracking metrics and thresholds

import { valueTrackingService, ValueMetric, ValueMetricCategory, InitiativeValueReport } from './value-tracking.service';
import { SuiteType, RACIRole } from '@/core/suites/suite.model';
import { initiativeService } from '@/core/initiatives/initiative.service';

export interface ValueAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  context: AlertContext;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  status: AlertStatus;
  actions: AlertAction[];
  recipients: string[];
  metadata: Record<string, any>;
}

export enum AlertType {
  METRIC_THRESHOLD = 'METRIC_THRESHOLD',
  ROI_DEVIATION = 'ROI_DEVIATION',
  TIMELINE_RISK = 'TIMELINE_RISK',
  BUDGET_VARIANCE = 'BUDGET_VARIANCE',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  RACI_PERFORMANCE = 'RACI_PERFORMANCE',
  VALUE_OPPORTUNITY = 'VALUE_OPPORTUNITY',
  MILESTONE_DELAY = 'MILESTONE_DELAY',
  EFFICIENCY_DROP = 'EFFICIENCY_DROP',
  CLIENT_RISK = 'CLIENT_RISK'
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  URGENT = 'URGENT'
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED'
}

export interface AlertContext {
  initiativeId?: string;
  initiativeName?: string;
  workspaceId: string;
  suiteType?: SuiteType;
  metricId?: string;
  metricName?: string;
  currentValue?: number | string;
  thresholdValue?: number | string;
  trend?: 'INCREASING' | 'DECREASING' | 'STABLE';
  affectedStakeholders?: string[];
}

export interface AlertAction {
  id: string;
  type: ActionType;
  label: string;
  description: string;
  automated: boolean;
  priority: number;
  estimatedImpact: string;
  owner: RACIRole;
  deadline?: Date;
}

export enum ActionType {
  INVESTIGATE = 'INVESTIGATE',
  ESCALATE = 'ESCALATE',
  REALLOCATE_RESOURCES = 'REALLOCATE_RESOURCES',
  ADJUST_TIMELINE = 'ADJUST_TIMELINE',
  COMMUNICATE_STAKEHOLDERS = 'COMMUNICATE_STAKEHOLDERS',
  UPDATE_METRICS = 'UPDATE_METRICS',
  SCHEDULE_REVIEW = 'SCHEDULE_REVIEW',
  MITIGATE_RISK = 'MITIGATE_RISK'
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertRuleAction[];
  recipients: AlertRecipient[];
  cooldownPeriod: number; // minutes
  escalationRules: EscalationRule[];
  metadata: Record<string, any>;
}

export interface AlertCondition {
  id: string;
  type: ConditionType;
  field: string;
  operator: ComparisonOperator;
  value: any;
  timeWindow?: number; // minutes
  consecutiveOccurrences?: number;
}

export enum ConditionType {
  METRIC_VALUE = 'METRIC_VALUE',
  METRIC_TREND = 'METRIC_TREND',
  PERCENTAGE_CHANGE = 'PERCENTAGE_CHANGE',
  TIME_BASED = 'TIME_BASED',
  COMPOSITE = 'COMPOSITE'
}

export enum ComparisonOperator {
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  CONTAINS = 'CONTAINS',
  IN_RANGE = 'IN_RANGE',
  OUT_OF_RANGE = 'OUT_OF_RANGE'
}

export interface AlertRuleAction {
  type: ActionType;
  automated: boolean;
  parameters: Record<string, any>;
  delay?: number; // minutes
}

export interface AlertRecipient {
  type: 'USER' | 'ROLE' | 'SUITE' | 'WEBHOOK' | 'EMAIL' | 'SLACK';
  identifier: string;
  preferences: NotificationPreferences;
}

export interface NotificationPreferences {
  channels: NotificationChannel[];
  frequency: 'IMMEDIATE' | 'BATCHED_HOURLY' | 'BATCHED_DAILY' | 'DIGEST';
  quietHours?: { start: string; end: string };
  severityFilter?: AlertSeverity[];
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  WEBHOOK = 'WEBHOOK',
  IN_APP = 'IN_APP',
  SMS = 'SMS',
  PUSH = 'PUSH'
}

export interface EscalationRule {
  id: string;
  triggerAfter: number; // minutes
  escalateTo: AlertRecipient[];
  actions: AlertRuleAction[];
  severity: AlertSeverity;
}

export interface AlertInsight {
  alertId: string;
  type: 'PATTERN' | 'CORRELATION' | 'PREDICTION' | 'RECOMMENDATION';
  title: string;
  description: string;
  confidence: number;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedActions: string[];
  relatedAlerts: string[];
}

export class ValueAlertsService {
  private alerts: Map<string, ValueAlert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private alertHistory: ValueAlert[] = [];
  private metricHistory: Map<string, ValueMetric[]> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultAlertRules();
    this.startPeriodicChecks();
  }

  /**
   * Process metrics and trigger alerts based on rules
   */
  async processMetrics(initiativeId: string, metrics: ValueMetric[]): Promise<ValueAlert[]> {
    const triggeredAlerts: ValueAlert[] = [];
    
    // Store metrics for trend analysis
    this.updateMetricHistory(metrics);
    
    // Check each alert rule
    for (const rule of Array.from(this.alertRules.values())) {
      if (!rule.enabled) continue;
      
      const matchingAlerts = await this.evaluateAlertRule(rule, initiativeId, metrics);
      triggeredAlerts.push(...matchingAlerts);
    }
    
    // Process triggered alerts
    for (const alert of triggeredAlerts) {
      await this.processAlert(alert);
    }
    
    return triggeredAlerts;
  }

  /**
   * Evaluate alert rule against current metrics
   */
  private async evaluateAlertRule(
    rule: AlertRule, 
    initiativeId: string, 
    metrics: ValueMetric[]
  ): Promise<ValueAlert[]> {
    const alerts: ValueAlert[] = [];
    
    for (const condition of rule.conditions) {
      const conditionMet = await this.evaluateCondition(condition, initiativeId, metrics);
      
      if (conditionMet) {
        // Check cooldown period
        const lastAlert = this.getLastAlertForRule(rule.id, initiativeId);
        if (lastAlert && this.isInCooldownPeriod(lastAlert, rule.cooldownPeriod)) {
          continue;
        }
        
        const alert = await this.createAlert(rule, condition, initiativeId, metrics);
        alerts.push(alert);
      }
    }
    
    return alerts;
  }

  /**
   * Evaluate individual condition
   */
  private async evaluateCondition(
    condition: AlertCondition,
    initiativeId: string,
    metrics: ValueMetric[]
  ): Promise<boolean> {
    switch (condition.type) {
      case ConditionType.METRIC_VALUE:
        return this.evaluateMetricValueCondition(condition, metrics);
      
      case ConditionType.METRIC_TREND:
        return this.evaluateMetricTrendCondition(condition, metrics);
      
      case ConditionType.PERCENTAGE_CHANGE:
        return this.evaluatePercentageChangeCondition(condition, metrics);
      
      case ConditionType.TIME_BASED:
        return this.evaluateTimeBasedCondition(condition, initiativeId);
      
      case ConditionType.COMPOSITE:
        return this.evaluateCompositeCondition(condition, initiativeId, metrics);
      
      default:
        return false;
    }
  }

  /**
   * Create alert from rule and condition
   */
  private async createAlert(
    rule: AlertRule,
    condition: AlertCondition,
    initiativeId: string,
    metrics: ValueMetric[]
  ): Promise<ValueAlert> {
    const initiative = await initiativeService.getInitiative(initiativeId);
    const relevantMetric = metrics.find(m => m.name === condition.field || m.id === condition.field);
    
    const alert: ValueAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: this.inferAlertType(condition, relevantMetric),
      severity: this.calculateSeverity(condition, relevantMetric),
      title: this.generateAlertTitle(rule, condition, relevantMetric),
      message: this.generateAlertMessage(rule, condition, relevantMetric, initiative),
      context: {
        initiativeId,
        initiativeName: initiative?.name,
        workspaceId: initiative?.workspaceId || '',
        metricId: relevantMetric?.id,
        metricName: relevantMetric?.name,
        currentValue: relevantMetric?.value,
        thresholdValue: condition.value,
        trend: relevantMetric?.trend,
        affectedStakeholders: this.identifyAffectedStakeholders(initiative, relevantMetric)
      },
      triggeredAt: new Date(),
      status: AlertStatus.ACTIVE,
      actions: this.generateAlertActions(rule, condition, relevantMetric),
      recipients: rule.recipients.map(r => r.identifier),
      metadata: {
        ruleId: rule.id,
        conditionId: condition.id,
        metric: relevantMetric
      }
    };

    // Store alert
    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    
    // Start escalation timer if needed
    this.scheduleEscalation(alert, rule);
    
    return alert;
  }

  /**
   * Process alert (notifications, actions, etc.)
   */
  private async processAlert(alert: ValueAlert): Promise<void> {
    // Send notifications
    await this.sendNotifications(alert);
    
    // Execute automated actions
    await this.executeAutomatedActions(alert);
    
    // Generate insights
    const insights = await this.generateAlertInsights(alert);
    alert.metadata.insights = insights;
    
    console.log(`Alert processed: ${alert.title} (${alert.severity})`);
  }

  /**
   * Send notifications for alert
   */
  private async sendNotifications(alert: ValueAlert): Promise<void> {
    for (const recipient of alert.recipients) {
      // Mock notification sending
      console.log(`Sending ${alert.severity} alert to ${recipient}: ${alert.title}`);
      
      // In real implementation, this would integrate with:
      // - Email service
      // - Slack API
      // - Webhook endpoints
      // - SMS service
      // - Push notification service
    }
  }

  /**
   * Execute automated actions for alert
   */
  private async executeAutomatedActions(alert: ValueAlert): Promise<void> {
    const automatedActions = alert.actions.filter(action => action.automated);
    
    for (const action of automatedActions) {
      try {
        await this.executeAction(action, alert);
        console.log(`Executed automated action: ${action.type} for alert ${alert.id}`);
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }

  /**
   * Execute specific action
   */
  private async executeAction(action: AlertAction, alert: ValueAlert): Promise<void> {
    switch (action.type) {
      case ActionType.INVESTIGATE:
        // Create investigation task
        await this.createInvestigationTask(alert);
        break;
      
      case ActionType.ESCALATE:
        // Escalate to higher authority
        await this.escalateAlert(alert);
        break;
      
      case ActionType.COMMUNICATE_STAKEHOLDERS:
        // Send stakeholder communication
        await this.communicateToStakeholders(alert);
        break;
      
      case ActionType.UPDATE_METRICS:
        // Trigger metric refresh
        await this.refreshMetrics(alert.context.initiativeId!);
        break;
      
      case ActionType.SCHEDULE_REVIEW:
        // Schedule review meeting
        await this.scheduleReviewMeeting(alert);
        break;
      
      default:
        console.log(`Action ${action.type} not implemented yet`);
    }
  }

  /**
   * Generate alert insights using pattern analysis
   */
  private async generateAlertInsights(alert: ValueAlert): Promise<AlertInsight[]> {
    const insights: AlertInsight[] = [];
    
    // Pattern analysis
    const similarAlerts = this.findSimilarAlerts(alert);
    if (similarAlerts.length > 2) {
      insights.push({
        alertId: alert.id,
        type: 'PATTERN',
        title: 'Recurring Pattern Detected',
        description: `Similar alerts have occurred ${similarAlerts.length} times in the past 30 days`,
        confidence: 85,
        impact: 'HIGH',
        suggestedActions: [
          'Investigate root cause',
          'Implement preventive measures',
          'Adjust monitoring thresholds'
        ],
        relatedAlerts: similarAlerts.map(a => a.id)
      });
    }
    
    // Correlation analysis
    const correlatedMetrics = await this.findCorrelatedMetrics(alert);
    if (correlatedMetrics.length > 0) {
      insights.push({
        alertId: alert.id,
        type: 'CORRELATION',
        title: 'Related Metrics Affected',
        description: `${correlatedMetrics.length} related metrics show similar patterns`,
        confidence: 75,
        impact: 'MEDIUM',
        suggestedActions: [
          'Review interconnected metrics',
          'Consider system-wide impact',
          'Coordinate response across suites'
        ],
        relatedAlerts: []
      });
    }
    
    // Predictive analysis
    if (alert.context.trend === 'DECREASING' && alert.type === AlertType.ROI_DEVIATION) {
      insights.push({
        alertId: alert.id,
        type: 'PREDICTION',
        title: 'ROI Trend Prediction',
        description: 'Current trend suggests ROI may drop below 10% in next 2 weeks',
        confidence: 70,
        impact: 'HIGH',
        suggestedActions: [
          'Implement immediate corrective measures',
          'Reassess initiative priorities',
          'Consider resource reallocation'
        ],
        relatedAlerts: []
      });
    }
    
    return insights;
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    // ROI Threshold Rule
    this.alertRules.set('rule_roi_threshold', {
      id: 'rule_roi_threshold',
      name: 'ROI Below Threshold',
      description: 'Alert when initiative ROI drops below 10%',
      enabled: true,
      conditions: [
        {
          id: 'condition_roi_low',
          type: ConditionType.METRIC_VALUE,
          field: 'estimatedROI',
          operator: ComparisonOperator.LESS_THAN,
          value: 10,
          consecutiveOccurrences: 2
        }
      ],
      actions: [
        {
          type: ActionType.INVESTIGATE,
          automated: true,
          parameters: { priority: 'HIGH' }
        },
        {
          type: ActionType.COMMUNICATE_STAKEHOLDERS,
          automated: true,
          parameters: { urgency: 'IMMEDIATE' }
        }
      ],
      recipients: [
        {
          type: 'ROLE',
          identifier: 'ACCOUNTABLE',
          preferences: {
            channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK],
            frequency: 'IMMEDIATE'
          }
        }
      ],
      cooldownPeriod: 60, // 1 hour
      escalationRules: [
        {
          id: 'escalation_roi_critical',
          triggerAfter: 120, // 2 hours
          escalateTo: [
            {
              type: 'ROLE',
              identifier: 'EXECUTIVE',
              preferences: {
                channels: [NotificationChannel.EMAIL],
                frequency: 'IMMEDIATE'
              }
            }
          ],
          actions: [
            {
              type: ActionType.SCHEDULE_REVIEW,
              automated: true,
              parameters: { urgency: 'CRITICAL' }
            }
          ],
          severity: AlertSeverity.CRITICAL
        }
      ],
      metadata: {}
    });

    // Quality Issue Rule
    this.alertRules.set('rule_quality_issue', {
      id: 'rule_quality_issue',
      name: 'Quality Score Drop',
      description: 'Alert when quality score drops below 80%',
      enabled: true,
      conditions: [
        {
          id: 'condition_quality_low',
          type: ConditionType.METRIC_VALUE,
          field: 'qualityScore',
          operator: ComparisonOperator.LESS_THAN,
          value: 80
        }
      ],
      actions: [
        {
          type: ActionType.INVESTIGATE,
          automated: true,
          parameters: { focus: 'quality_processes' }
        }
      ],
      recipients: [
        {
          type: 'ROLE',
          identifier: 'RESPONSIBLE',
          preferences: {
            channels: [NotificationChannel.IN_APP],
            frequency: 'IMMEDIATE'
          }
        }
      ],
      cooldownPeriod: 30,
      escalationRules: [],
      metadata: {}
    });

    // Timeline Risk Rule
    this.alertRules.set('rule_timeline_risk', {
      id: 'rule_timeline_risk',
      name: 'Timeline Variance Alert',
      description: 'Alert when timeline variance exceeds 15%',
      enabled: true,
      conditions: [
        {
          id: 'condition_timeline_variance',
          type: ConditionType.PERCENTAGE_CHANGE,
          field: 'timelineVariance',
          operator: ComparisonOperator.GREATER_THAN,
          value: 15
        }
      ],
      actions: [
        {
          type: ActionType.ADJUST_TIMELINE,
          automated: false,
          parameters: { suggest_alternatives: true }
        },
        {
          type: ActionType.REALLOCATE_RESOURCES,
          automated: false,
          parameters: { priority_focus: true }
        }
      ],
      recipients: [
        {
          type: 'ROLE',
          identifier: 'ACCOUNTABLE',
          preferences: {
            channels: [NotificationChannel.EMAIL, NotificationChannel.SLACK],
            frequency: 'IMMEDIATE'
          }
        }
      ],
      cooldownPeriod: 180, // 3 hours
      escalationRules: [],
      metadata: {}
    });
  }

  /**
   * Start periodic checks for time-based conditions
   */
  private startPeriodicChecks(): void {
    setInterval(() => {
      this.checkTimeBasedConditions();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Check time-based conditions
   */
  private async checkTimeBasedConditions(): Promise<void> {
    // Check for milestone delays, budget variances, etc.
    for (const [alertId, alert] of Array.from(this.alerts.entries())) {
      if (alert.status === AlertStatus.ACTIVE) {
        await this.checkAlertEscalation(alert);
      }
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<ValueAlert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    // Cancel escalation if acknowledged
    const escalationTimer = this.escalationTimers.get(alertId);
    if (escalationTimer) {
      clearTimeout(escalationTimer);
      this.escalationTimers.delete(alertId);
    }

    return alert;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, userId: string, resolution?: string): Promise<ValueAlert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.resolvedBy = userId;
    
    if (resolution) {
      alert.metadata.resolution = resolution;
    }

    return alert;
  }

  /**
   * Get alerts for initiative
   */
  getAlertsForInitiative(initiativeId: string): ValueAlert[] {
    return Array.from(this.alerts.values()).filter(
      alert => alert.context.initiativeId === initiativeId
    );
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): ValueAlert[] {
    return Array.from(this.alerts.values()).filter(
      alert => alert.status === AlertStatus.ACTIVE
    );
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    totalAlerts: number;
    activeAlerts: number;
    criticalAlerts: number;
    alertsByType: Record<AlertType, number>;
    alertsBySeverity: Record<AlertSeverity, number>;
    averageResolutionTime: number;
  } {
    const allAlerts = Array.from(this.alerts.values());
    const activeAlerts = allAlerts.filter(a => a.status === AlertStatus.ACTIVE);
    const criticalAlerts = allAlerts.filter(a => a.severity === AlertSeverity.CRITICAL);
    
    const alertsByType: Record<AlertType, number> = {} as any;
    const alertsBySeverity: Record<AlertSeverity, number> = {} as any;
    
    Object.values(AlertType).forEach(type => {
      alertsByType[type] = allAlerts.filter(a => a.type === type).length;
    });
    
    Object.values(AlertSeverity).forEach(severity => {
      alertsBySeverity[severity] = allAlerts.filter(a => a.severity === severity).length;
    });
    
    const resolvedAlerts = allAlerts.filter(a => a.status === AlertStatus.RESOLVED && a.resolvedAt);
    const avgResolutionTime = resolvedAlerts.length > 0 ? 
      resolvedAlerts.reduce((sum, alert) => {
        return sum + (alert.resolvedAt!.getTime() - alert.triggeredAt.getTime());
      }, 0) / resolvedAlerts.length / (1000 * 60) : 0; // in minutes
    
    return {
      totalAlerts: allAlerts.length,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      alertsByType,
      alertsBySeverity,
      averageResolutionTime: Math.round(avgResolutionTime)
    };
  }

  // Helper methods for condition evaluation
  private evaluateMetricValueCondition(condition: AlertCondition, metrics: ValueMetric[]): boolean {
    const metric = metrics.find(m => m.name === condition.field || m.id === condition.field);
    if (!metric || typeof metric.value !== 'number') return false;
    
    return this.compareValues(metric.value, condition.operator, condition.value);
  }

  private evaluateMetricTrendCondition(condition: AlertCondition, metrics: ValueMetric[]): boolean {
    const metric = metrics.find(m => m.name === condition.field || m.id === condition.field);
    if (!metric) return false;
    
    switch (condition.operator) {
      case ComparisonOperator.EQUALS:
        return metric.trend === condition.value;
      default:
        return false;
    }
  }

  private evaluatePercentageChangeCondition(condition: AlertCondition, metrics: ValueMetric[]): boolean {
    const metric = metrics.find(m => m.name === condition.field || m.id === condition.field);
    if (!metric) return false;
    
    const historicalValues = this.metricHistory.get(metric.id) || [];
    if (historicalValues.length < 2) return false;
    
    const currentValue = typeof metric.value === 'number' ? metric.value : 0;
    const previousValue = typeof historicalValues[historicalValues.length - 2].value === 'number' ? 
      historicalValues[historicalValues.length - 2].value as number : 0;
    
    if (previousValue === 0) return false;
    
    const percentageChange = ((currentValue - previousValue) / previousValue) * 100;
    return this.compareValues(Math.abs(percentageChange), condition.operator, condition.value);
  }

  private evaluateTimeBasedCondition(condition: AlertCondition, initiativeId: string): boolean {
    // Mock time-based evaluation
    return Math.random() > 0.9; // 10% chance of triggering
  }

  private evaluateCompositeCondition(condition: AlertCondition, initiativeId: string, metrics: ValueMetric[]): boolean {
    // Mock composite evaluation
    return Math.random() > 0.95; // 5% chance of triggering
  }

  private compareValues(actual: number, operator: ComparisonOperator, expected: number): boolean {
    switch (operator) {
      case ComparisonOperator.GREATER_THAN:
        return actual > expected;
      case ComparisonOperator.LESS_THAN:
        return actual < expected;
      case ComparisonOperator.EQUALS:
        return actual === expected;
      case ComparisonOperator.GREATER_THAN_OR_EQUAL:
        return actual >= expected;
      case ComparisonOperator.LESS_THAN_OR_EQUAL:
        return actual <= expected;
      default:
        return false;
    }
  }

  private updateMetricHistory(metrics: ValueMetric[]): void {
    metrics.forEach(metric => {
      const history = this.metricHistory.get(metric.id) || [];
      history.push(metric);
      
      // Keep only last 100 values
      if (history.length > 100) {
        history.shift();
      }
      
      this.metricHistory.set(metric.id, history);
    });
  }

  private getLastAlertForRule(ruleId: string, initiativeId: string): ValueAlert | null {
    const ruleAlerts = Array.from(this.alerts.values())
      .filter(alert => 
        alert.metadata.ruleId === ruleId && 
        alert.context.initiativeId === initiativeId
      )
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
    
    return ruleAlerts[0] || null;
  }

  private isInCooldownPeriod(alert: ValueAlert, cooldownMinutes: number): boolean {
    const cooldownMs = cooldownMinutes * 60 * 1000;
    return (Date.now() - alert.triggeredAt.getTime()) < cooldownMs;
  }

  private inferAlertType(condition: AlertCondition, metric?: ValueMetric): AlertType {
    if (condition.field.includes('ROI') || condition.field.includes('roi')) {
      return AlertType.ROI_DEVIATION;
    }
    if (condition.field.includes('quality')) {
      return AlertType.QUALITY_ISSUE;
    }
    if (condition.field.includes('timeline') || condition.field.includes('time')) {
      return AlertType.TIMELINE_RISK;
    }
    if (condition.field.includes('budget') || condition.field.includes('cost')) {
      return AlertType.BUDGET_VARIANCE;
    }
    if (condition.field.includes('efficiency')) {
      return AlertType.EFFICIENCY_DROP;
    }
    
    return AlertType.METRIC_THRESHOLD;
  }

  private calculateSeverity(condition: AlertCondition, metric?: ValueMetric): AlertSeverity {
    if (!metric) return AlertSeverity.INFO;
    
    // Base severity on deviation from target/threshold
    if (typeof metric.value === 'number' && typeof condition.value === 'number') {
      const deviation = Math.abs(metric.value - condition.value) / condition.value;
      
      if (deviation > 0.5) return AlertSeverity.CRITICAL;
      if (deviation > 0.3) return AlertSeverity.WARNING;
      if (deviation > 0.1) return AlertSeverity.INFO;
    }
    
    return AlertSeverity.INFO;
  }

  private generateAlertTitle(rule: AlertRule, condition: AlertCondition, metric?: ValueMetric): string {
    if (metric) {
      return `${metric.name} ${condition.operator.replace('_', ' ').toLowerCase()} ${condition.value}`;
    }
    return rule.name;
  }

  private generateAlertMessage(rule: AlertRule, condition: AlertCondition, metric?: ValueMetric, initiative?: any): string {
    const baseMessage = rule.description;
    
    if (metric && initiative) {
      return `${baseMessage} for initiative "${initiative.name}". Current ${metric.name}: ${metric.value} ${metric.unit}`;
    }
    
    return baseMessage;
  }

  private identifyAffectedStakeholders(initiative?: any, metric?: ValueMetric): string[] {
    if (!initiative) return [];
    
    const stakeholders: string[] = [];
    
    // Add RACI stakeholders
    if (initiative.raci) {
      stakeholders.push(initiative.raci.accountable);
      stakeholders.push(...(initiative.raci.responsible || []));
      
      // Add consulted for critical metrics
      if (metric && metric.category === ValueMetricCategory.REVENUE) {
        stakeholders.push(...(initiative.raci.consulted || []));
      }
    }
    
    return stakeholders;
  }

  private generateAlertActions(rule: AlertRule, condition: AlertCondition, metric?: ValueMetric): AlertAction[] {
    return rule.actions.map((ruleAction, index) => ({
      id: `action_${Date.now()}_${index}`,
      type: ruleAction.type,
      label: this.getActionLabel(ruleAction.type),
      description: this.getActionDescription(ruleAction.type, metric),
      automated: ruleAction.automated,
      priority: ruleAction.automated ? 1 : 2,
      estimatedImpact: this.getActionImpact(ruleAction.type),
      owner: 'RESPONSIBLE' as any,
      deadline: ruleAction.delay ? new Date(Date.now() + ruleAction.delay * 60000) : undefined
    }));
  }

  private getActionLabel(actionType: ActionType): string {
    const labels: Record<ActionType, string> = {
      [ActionType.INVESTIGATE]: 'Investigate Issue',
      [ActionType.ESCALATE]: 'Escalate to Management',
      [ActionType.REALLOCATE_RESOURCES]: 'Reallocate Resources',
      [ActionType.ADJUST_TIMELINE]: 'Adjust Timeline',
      [ActionType.COMMUNICATE_STAKEHOLDERS]: 'Notify Stakeholders',
      [ActionType.UPDATE_METRICS]: 'Refresh Metrics',
      [ActionType.SCHEDULE_REVIEW]: 'Schedule Review',
      [ActionType.MITIGATE_RISK]: 'Mitigate Risk'
    };
    
    return labels[actionType] || actionType;
  }

  private getActionDescription(actionType: ActionType, metric?: ValueMetric): string {
    switch (actionType) {
      case ActionType.INVESTIGATE:
        return `Investigate the root cause of ${metric?.name || 'metric'} deviation`;
      case ActionType.ESCALATE:
        return 'Escalate issue to higher management for immediate attention';
      case ActionType.COMMUNICATE_STAKEHOLDERS:
        return 'Inform all stakeholders about the current situation';
      default:
        return `Execute ${actionType.toLowerCase().replace('_', ' ')} action`;
    }
  }

  private getActionImpact(actionType: ActionType): string {
    const impacts: Record<ActionType, string> = {
      [ActionType.INVESTIGATE]: 'High - Identifies root cause',
      [ActionType.ESCALATE]: 'Critical - Ensures leadership awareness',
      [ActionType.REALLOCATE_RESOURCES]: 'High - Improves resource efficiency',
      [ActionType.ADJUST_TIMELINE]: 'Medium - Manages expectations',
      [ActionType.COMMUNICATE_STAKEHOLDERS]: 'Medium - Maintains transparency',
      [ActionType.UPDATE_METRICS]: 'Low - Ensures data accuracy',
      [ActionType.SCHEDULE_REVIEW]: 'Medium - Facilitates decision making',
      [ActionType.MITIGATE_RISK]: 'High - Reduces potential negative impact'
    };
    
    return impacts[actionType] || 'Medium impact';
  }

  private scheduleEscalation(alert: ValueAlert, rule: AlertRule): void {
    rule.escalationRules.forEach(escalationRule => {
      const timer = setTimeout(async () => {
        if (alert.status === AlertStatus.ACTIVE) {
          await this.executeEscalation(alert, escalationRule);
        }
      }, escalationRule.triggerAfter * 60 * 1000);
      
      this.escalationTimers.set(`${alert.id}_${escalationRule.id}`, timer);
    });
  }

  private async executeEscalation(alert: ValueAlert, escalationRule: EscalationRule): Promise<void> {
    // Update alert severity
    alert.severity = escalationRule.severity;
    
    // Send escalation notifications
    for (const recipient of escalationRule.escalateTo) {
      console.log(`Escalating alert ${alert.id} to ${recipient.identifier}`);
    }
    
    // Execute escalation actions
    for (const action of escalationRule.actions) {
      console.log(`Executing escalation action: ${action.type}`);
    }
  }

  private findSimilarAlerts(alert: ValueAlert): ValueAlert[] {
    return this.alertHistory.filter(historicalAlert => 
      historicalAlert.id !== alert.id &&
      historicalAlert.type === alert.type &&
      historicalAlert.context.initiativeId === alert.context.initiativeId &&
      historicalAlert.triggeredAt.getTime() > (Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    );
  }

  private async findCorrelatedMetrics(alert: ValueAlert): Promise<ValueMetric[]> {
    // Mock correlation analysis
    return [];
  }

  private async checkAlertEscalation(alert: ValueAlert): Promise<void> {
    // Check if alert needs escalation based on time
    const alertAge = Date.now() - alert.triggeredAt.getTime();
    const twoHours = 2 * 60 * 60 * 1000;
    
    if (alertAge > twoHours && alert.severity !== AlertSeverity.CRITICAL) {
      alert.severity = AlertSeverity.CRITICAL;
      console.log(`Escalated alert ${alert.id} to CRITICAL due to time`);
    }
  }

  // Mock implementations for action execution
  private async createInvestigationTask(alert: ValueAlert): Promise<void> {
    console.log(`Created investigation task for alert: ${alert.title}`);
  }

  private async escalateAlert(alert: ValueAlert): Promise<void> {
    console.log(`Escalated alert: ${alert.title}`);
  }

  private async communicateToStakeholders(alert: ValueAlert): Promise<void> {
    console.log(`Communicated alert to stakeholders: ${alert.title}`);
  }

  private async refreshMetrics(initiativeId: string): Promise<void> {
    console.log(`Refreshing metrics for initiative: ${initiativeId}`);
  }

  private async scheduleReviewMeeting(alert: ValueAlert): Promise<void> {
    console.log(`Scheduled review meeting for alert: ${alert.title}`);
  }
}

// Export singleton instance
export const valueAlertsService = new ValueAlertsService();