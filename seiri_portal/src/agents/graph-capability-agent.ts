import "server-only";

import { BaseAgent, AgentCapabilities, AgentType, AgentResponse, AgentOperationConfig } from './base-agent';
import { AgentContext, NodeType } from './context-engine';
import { LLMService } from './llm-service';
import { CacheService } from './cache-service';
import { runQuery, runSingleQuery } from '@/lib/neo4j';
import { v4 as uuidv4 } from 'uuid';

// Graph-based capability representation
export interface GraphCapability {
  id: string;
  name: string;
  description: string;
  domain: string;
  type: 'meta' | 'cognitive' | 'operational';
  requiredInputs: string[];
  outputSchema: string;
  validationRules: string[];
  ontologyClasses: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentTemplate {
  id: string;
  category: string;
  version: string;
  name: string;
  description: string;
  capabilities: GraphCapability[];
  requiredResources: string[];
  ontologyExpertise: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentInstance {
  id: string;
  templateId: string;
  workspaceId: string;
  suiteId?: string;
  status: 'active' | 'inactive' | 'suspended';
  subgraphId?: string;
  healthScore: number;
  lastHeartbeat: Date;
  performanceMetrics: {
    operationsCount: number;
    avgResponseTime: number;
    successRate: number;
    cacheHitRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OntologyClass {
  id: string;
  name: string;
  description: string;
  domain: string;
  properties: string[];
  validationRules: string[];
  relationships: string[];
  createdAt: Date;
}

/**
 * Enhanced BaseAgent with graph-based capabilities
 * Replaces string-based capabilities with Neo4j graph relationships
 */
export abstract class GraphCapabilityAgent extends BaseAgent {
  protected template: AgentTemplate | null = null;
  protected instance: AgentInstance | null = null;
  protected graphCapabilities: GraphCapability[] = [];
  protected ontologyClasses: OntologyClass[] = [];

  constructor(
    llmService: LLMService, 
    cacheService: CacheService,
    protected instanceId?: string
  ) {
    super(llmService, cacheService);
  }

  /**
   * Initialize agent with template and create instance
   */
  async initialize(templateId: string, workspaceId: string, suiteId?: string): Promise<void> {
    // Load template from Neo4j
    this.template = await this.loadTemplate(templateId);
    if (!this.template) {
      throw new Error(`Agent template not found: ${templateId}`);
    }

    // Load capabilities from graph
    this.graphCapabilities = await this.loadCapabilities(templateId);
    
    // Load ontology expertise
    this.ontologyClasses = await this.loadOntologyClasses(templateId);

    // Create or load instance
    if (this.instanceId) {
      this.instance = await this.loadInstance(this.instanceId);
    } else {
      this.instance = await this.createInstance(templateId, workspaceId, suiteId);
    }

    // Update health status
    await this.updateHealthStatus();
  }

  /**
   * Check if agent can handle operation based on graph capabilities
   */
  canHandleOperation(operation: string, context: AgentContext): boolean {
    if (!this.graphCapabilities.length) return false;
    
    // Simple capability name matching for synchronous operation
    return this.graphCapabilities.some(c => c.name === operation);
  }

  // Removed async version - using sync version below

  /**
   * Execute operation with capability validation
   */
  async executeCapabilityOperation<T>(
    operation: string,
    context: AgentContext,
    input: any,
    config: AgentOperationConfig = {}
  ): Promise<AgentResponse<T>> {
    // Validate capability
    const canHandle = this.canHandleOperation(operation, context);
    if (!canHandle) {
      throw new Error(`Agent does not have capability for operation: ${operation}`);
    }

    // Get capability details
    const capability = await this.getCapabilityDetails(operation);
    if (!capability) {
      throw new Error(`Capability not found: ${operation}`);
    }

    // Validate inputs against capability requirements
    await this.validateInputs(input, capability);

    // Validate against ontology if specified
    if (capability.ontologyClasses.length > 0) {
      await this.validateAgainstOntology(input, capability.ontologyClasses);
    }

    // Execute operation with enhanced handler
    return this.executeOperation(
      operation,
      context,
      input,
      async (ctx, inp) => this.handleCapabilityOperation(operation, ctx, inp, capability),
      config
    );
  }

  /**
   * Abstract method for handling capability-specific operations
   */
  protected abstract handleCapabilityOperation<T>(
    operation: string,
    context: AgentContext,
    input: any,
    capability: GraphCapability
  ): Promise<T>;

  /**
   * Load agent template from Neo4j
   */
  private async loadTemplate(templateId: string): Promise<AgentTemplate | null> {
    const query = `
      MATCH (at:AgentTemplate {id: $templateId})
      RETURN at {
        .*,
        capabilities: [(at)-[:HAS_CAPABILITY]->(c:Capability) | c {.*}],
        ontologyExpertise: [(at)-[:EXPERT_IN]->(oc:OntologyClass) | oc.id]
      }
    `;

    const result = await runSingleQuery(query, { templateId });
    return result ? this.mapTemplate(result) : null;
  }

  /**
   * Load capabilities from Neo4j graph
   */
  private async loadCapabilities(templateId: string): Promise<GraphCapability[]> {
    const query = `
      MATCH (at:AgentTemplate {id: $templateId})-[:HAS_CAPABILITY]->(c:Capability)
      OPTIONAL MATCH (c)-[:VALIDATES_AGAINST]->(oc:OntologyClass)
      RETURN c {
        .*,
        ontologyClasses: collect(oc.id)
      }
    `;

    const results = await runQuery(query, { templateId });
    return results.map(r => this.mapCapability(r.c));
  }

  /**
   * Load ontology classes for agent expertise
   */
  private async loadOntologyClasses(templateId: string): Promise<OntologyClass[]> {
    const query = `
      MATCH (at:AgentTemplate {id: $templateId})-[:EXPERT_IN]->(oc:OntologyClass)
      RETURN oc {.*}
    `;

    const results = await runQuery(query, { templateId });
    return results.map(r => this.mapOntologyClass(r.oc));
  }

  /**
   * Create new agent instance
   */
  private async createInstance(
    templateId: string, 
    workspaceId: string, 
    suiteId?: string
  ): Promise<AgentInstance> {
    const instanceId = uuidv4();
    const now = new Date();

    const query = `
      MATCH (w:Workspace {id: $workspaceId})
      MATCH (at:AgentTemplate {id: $templateId})
      OPTIONAL MATCH (s:Suite {id: $suiteId})
      
      CREATE (a:Agent {
        id: $instanceId,
        templateId: $templateId,
        workspaceId: $workspaceId,
        suiteId: $suiteId,
        status: 'active',
        healthScore: 1.0,
        lastHeartbeat: $now,
        performanceMetrics: $metrics,
        createdAt: $now,
        updatedAt: $now
      })
      
      CREATE (w)-[:HAS_AGENT]->(a)
      CREATE (a)-[:INSTANTIATED_FROM]->(at)
      WITH a, s
      WHERE s IS NOT NULL
      CREATE (s)-[:HAS_AGENT]->(a)
      
      RETURN a {.*}
    `;

    const result = await runSingleQuery(query, {
      instanceId,
      templateId,
      workspaceId,
      suiteId: suiteId || null,
      now: now.toISOString(),
      metrics: JSON.stringify({
        operationsCount: 0,
        avgResponseTime: 0,
        successRate: 1.0,
        cacheHitRate: 0
      })
    });

    return this.mapInstance(result);
  }

  /**
   * Load existing agent instance
   */
  private async loadInstance(instanceId: string): Promise<AgentInstance | null> {
    const query = `
      MATCH (a:Agent {id: $instanceId})
      RETURN a {.*}
    `;

    const result = await runSingleQuery(query, { instanceId });
    return result ? this.mapInstance(result) : null;
  }

  /**
   * Update agent health status
   */
  private async updateHealthStatus(): Promise<void> {
    if (!this.instance) return;

    const now = new Date();
    const healthScore = await this.calculateHealthScore();

    const query = `
      MATCH (a:Agent {id: $instanceId})
      SET a.healthScore = $healthScore,
          a.lastHeartbeat = $now,
          a.updatedAt = $now
    `;

    await runQuery(query, {
      instanceId: this.instance.id,
      healthScore,
      now: now.toISOString()
    });

    this.instance.healthScore = healthScore;
    this.instance.lastHeartbeat = now;
    this.instance.updatedAt = now;
  }

  /**
   * Calculate agent health score based on performance metrics
   */
  private async calculateHealthScore(): Promise<number> {
    if (!this.instance) return 0;

    const metricsQuery = `
      MATCH (a:Agent {id: $instanceId})
      OPTIONAL MATCH (a)-[:HAS_INTERACTION]->(i:AgentInteraction)
      WHERE datetime(i.startTime) >= datetime($since)
      RETURN 
        count(i) as totalInteractions,
        avg(i.duration) as avgDuration,
        sum(CASE WHEN i.status = 'completed' THEN 1 ELSE 0 END) as successCount,
        sum(CASE WHEN i.metadata.cacheHit THEN 1 ELSE 0 END) as cacheHits
    `;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const metrics = await runSingleQuery(metricsQuery, {
      instanceId: this.instance.id,
      since: since.toISOString()
    });

    if (!metrics || metrics.totalInteractions === 0) {
      return 1.0; // Perfect health for new agents
    }

    const successRate = metrics.successCount / metrics.totalInteractions;
    const responseTimeFactor = Math.max(0, 1 - (metrics.avgDuration || 0) / 30000); // Penalize slow responses
    const cacheHitRate = metrics.cacheHits / metrics.totalInteractions;

    // Weighted health score
    const healthScore = (
      successRate * 0.5 +
      responseTimeFactor * 0.3 +
      cacheHitRate * 0.2
    );

    return Math.max(0, Math.min(1, healthScore));
  }

  /**
   * Get capability details
   */
  private async getCapabilityDetails(operation: string): Promise<GraphCapability | null> {
    return this.graphCapabilities.find(c => c.name === operation) || null;
  }

  /**
   * Validate inputs against capability requirements
   */
  private async validateInputs(input: any, capability: GraphCapability): Promise<void> {
    const missingInputs = capability.requiredInputs.filter(
      required => !(required in input)
    );

    if (missingInputs.length > 0) {
      throw new Error(`Missing required inputs: ${missingInputs.join(', ')}`);
    }
  }

  /**
   * Validate against ontology classes
   */
  private async validateAgainstOntology(
    input: any, 
    ontologyClassIds: string[]
  ): Promise<void> {
    for (const classId of ontologyClassIds) {
      const ontologyClass = this.ontologyClasses.find(oc => oc.id === classId);
      if (!ontologyClass) continue;

      // Apply validation rules
      for (const rule of ontologyClass.validationRules) {
        await this.applyValidationRule(input, rule, ontologyClass);
      }
    }
  }

  /**
   * Apply validation rule to input
   */
  private async applyValidationRule(
    input: any, 
    rule: string, 
    ontologyClass: OntologyClass
  ): Promise<void> {
    // Parse rule format: "property:condition:value"
    const [property, condition, value] = rule.split(':');
    
    switch (condition) {
      case 'required':
        if (!(property in input)) {
          throw new Error(`Required property missing: ${property}`);
        }
        break;
      case 'min':
        if (input[property] < parseInt(value)) {
          throw new Error(`Property ${property} must be at least ${value}`);
        }
        break;
      case 'max':
        if (input[property] > parseInt(value)) {
          throw new Error(`Property ${property} must be at most ${value}`);
        }
        break;
      case 'pattern':
        const regex = new RegExp(value);
        if (!regex.test(input[property])) {
          throw new Error(`Property ${property} does not match pattern ${value}`);
        }
        break;
      default:
        console.warn(`Unknown validation rule condition: ${condition}`);
    }
  }

  // Mapping functions
  private mapTemplate(data: any): AgentTemplate {
    return {
      id: data.id,
      category: data.category,
      version: data.version,
      name: data.name,
      description: data.description,
      capabilities: data.capabilities || [],
      requiredResources: data.requiredResources || [],
      ontologyExpertise: data.ontologyExpertise || [],
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }

  private mapCapability(data: any): GraphCapability {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      domain: data.domain,
      type: data.type,
      requiredInputs: data.requiredInputs || [],
      outputSchema: data.outputSchema,
      validationRules: data.validationRules || [],
      ontologyClasses: data.ontologyClasses || [],
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }

  private mapOntologyClass(data: any): OntologyClass {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      domain: data.domain,
      properties: data.properties || [],
      validationRules: data.validationRules || [],
      relationships: data.relationships || [],
      createdAt: new Date(data.createdAt)
    };
  }

  private mapInstance(data: any): AgentInstance {
    return {
      id: data.id,
      templateId: data.templateId,
      workspaceId: data.workspaceId,
      suiteId: data.suiteId,
      status: data.status,
      subgraphId: data.subgraphId,
      healthScore: data.healthScore,
      lastHeartbeat: new Date(data.lastHeartbeat),
      performanceMetrics: typeof data.performanceMetrics === 'string' 
        ? JSON.parse(data.performanceMetrics) 
        : data.performanceMetrics,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }

  // Legacy compatibility removed - using async version only

  getAvailableOperations(context: AgentContext): string[] {
    return this.graphCapabilities.map(c => c.name);
  }

  // Getters for compatibility
  get capabilities(): AgentCapabilities {
    // Map graph capabilities to legacy format
    const graphCaps = this.graphCapabilities;
    return {
      canAnalyze: graphCaps.some(c => c.domain === 'analysis'),
      canGenerate: graphCaps.some(c => c.domain === 'generation'),
      canOptimize: graphCaps.some(c => c.domain === 'optimization'),
      canSuggest: graphCaps.some(c => c.domain === 'suggestion'),
      canAutomate: graphCaps.some(c => c.domain === 'automation')
    };
  }

  get name(): string {
    return this.template?.name || 'Unknown Agent';
  }

  get type(): AgentType {
    return this.template?.category?.toUpperCase() as AgentType || 'GENERAL';
  }

  get version(): string {
    return this.template?.version || '1.0.0';
  }
}