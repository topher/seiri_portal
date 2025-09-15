// Suite Service Implementation
// Handles creation, management, and validation of the 6 mandatory suites

import { runQuery } from "@/lib/neo4j";;
import { 
  Suite, 
  SuiteService, 
  CreateSuiteInput, 
  SuiteType,
  REQUIRED_SUITES,
  DEFAULT_SUITE_CONFIGS,
  SUITE_VALIDATION_RULES,
  ValidationResult,
  Capability
} from './suite.model';

export class SuiteServiceImpl implements SuiteService {
  
  async createSuite(input: CreateSuiteInput): Promise<Suite> {
    const id = this.generateId();
    const now = new Date();
    
    // Get default configuration for this suite type
    const defaultConfig = DEFAULT_SUITE_CONFIGS[input.type];
    
    const suite: Suite = {
      id,
      name: input.name || defaultConfig.name,
      type: input.type,
      description: input.description || defaultConfig.description,
      workspaceId: input.workspaceId,
      capabilities: this.createDefaultCapabilities(input.type),
      createdAt: now,
      updatedAt: now
    };
    
    // Create suite in Neo4j
    await runQuery(`
      CREATE (s:Suite {
        id: $id,
        name: $name,
        type: $type,
        description: $description,
        workspaceId: $workspaceId,
        createdAt: datetime($createdAt),
        updatedAt: datetime($updatedAt)
      })
    `, {
      id: suite.id,
      name: suite.name,
      type: suite.type,
      description: suite.description,
      workspaceId: suite.workspaceId,
      createdAt: suite.createdAt.toISOString(),
      updatedAt: suite.updatedAt.toISOString()
    });
    
    // Create relationship to workspace
    await runQuery(`
      MATCH (w:Workspace {id: $workspaceId})
      MATCH (s:Suite {id: $suiteId})
      CREATE (w)-[:HAS_SUITE]->(s)
    `, {
      workspaceId: suite.workspaceId,
      suiteId: suite.id
    });
    
    return suite;
  }
  
  async getSuite(id: string): Promise<Suite | null> {
    const result = await runQuery(`
      MATCH (s:Suite {id: $id})
      RETURN s
    `, { id });
    
    if (result.length === 0) return null;
    
    return this.mapNeo4jToSuite(result[0].s);
  }
  
  async getSuitesByWorkspace(workspaceId: string): Promise<Suite[]> {
    const result = await runQuery(`
      MATCH (w:Workspace {id: $workspaceId})-[:HAS_SUITE]->(s:Suite)
      RETURN s
      ORDER BY s.type
    `, { workspaceId });
    
    return result.map(record => this.mapNeo4jToSuite(record.s));
  }
  
  async getSuiteByType(workspaceId: string, type: SuiteType): Promise<Suite | null> {
    const result = await runQuery(`
      MATCH (w:Workspace {id: $workspaceId})-[:HAS_SUITE]->(s:Suite {type: $type})
      RETURN s
    `, { workspaceId, type });
    
    if (result.length === 0) return null;
    
    return this.mapNeo4jToSuite(result[0].s);
  }
  
  async updateSuite(id: string, updates: Partial<Suite>): Promise<Suite> {
    const updateFields: string[] = [];
    const params: any = { id };
    
    if (updates.name) {
      updateFields.push('s.name = $name');
      params.name = updates.name;
    }
    
    if (updates.description) {
      updateFields.push('s.description = $description');
      params.description = updates.description;
    }
    
    updateFields.push('s.updatedAt = datetime($updatedAt)');
    params.updatedAt = new Date().toISOString();
    
    await runQuery(`
      MATCH (s:Suite {id: $id})
      SET ${updateFields.join(', ')}
      RETURN s
    `, params);
    
    const updated = await this.getSuite(id);
    if (!updated) {
      throw new Error(`Suite ${id} not found after update`);
    }
    
    return updated;
  }
  
  async deleteSuite(id: string): Promise<boolean> {
    const result = await runQuery(`
      MATCH (s:Suite {id: $id})
      DETACH DELETE s
      RETURN count(s) as deletedCount
    `, { id });
    
    return result[0]?.deletedCount > 0;
  }
  
  /**
   * Ensures all 6 required suites exist for a workspace
   * Creates missing suites with default configurations
   */
  async ensureAllSuites(workspaceId: string): Promise<Suite[]> {
    const existingSuites = await this.getSuitesByWorkspace(workspaceId);
    const existingTypes = new Set(existingSuites.map(s => s.type));
    
    // Create missing suites
    const missingSuites: Suite[] = [];
    for (const requiredType of REQUIRED_SUITES) {
      if (!existingTypes.has(requiredType)) {
        const newSuite = await this.createSuite({
          name: DEFAULT_SUITE_CONFIGS[requiredType].name,
          type: requiredType,
          description: DEFAULT_SUITE_CONFIGS[requiredType].description,
          workspaceId
        });
        missingSuites.push(newSuite);
      }
    }
    
    // Return all suites (existing + newly created)
    const allSuites = [...existingSuites, ...missingSuites];
    
    // Validate that we now have exactly 6 suites
    const validation = SUITE_VALIDATION_RULES.validateWorkspaceSuites(allSuites);
    if (!validation.isValid) {
      throw new Error(`Suite validation failed: ${validation.errors.join(', ')}`);
    }
    
    return allSuites.sort((a, b) => a.type.localeCompare(b.type));
  }
  
  async validateDomainObject(suiteType: SuiteType, data: any): Promise<ValidationResult> {
    // Basic validation - in future prompts this will use domain ontologies
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!data || typeof data !== 'object') {
      errors.push('Data must be a valid object');
    }
    
    // Suite-specific validation rules
    switch (suiteType) {
      case SuiteType.PRODUCT:
        if (data.personas && Array.isArray(data.personas)) {
          data.personas.forEach((persona: any, index: number) => {
            if (!persona.name) {
              errors.push(`Persona ${index + 1}: name is required`);
            }
            if (!persona.goals || !Array.isArray(persona.goals) || persona.goals.length === 0) {
              errors.push(`Persona ${index + 1}: at least one goal is required`);
            }
            if (!persona.painPoints || !Array.isArray(persona.painPoints) || persona.painPoints.length < 2) {
              errors.push(`Persona ${index + 1}: at least 2 pain points are required`);
            }
            if (!persona.jobsToBeDone || !Array.isArray(persona.jobsToBeDone) || 
                persona.jobsToBeDone.length < 3 || persona.jobsToBeDone.length > 10) {
              errors.push(`Persona ${index + 1}: must have 3-10 jobs to be done`);
            }
          });
        }
        break;
        
      case SuiteType.DEVELOPMENT:
        if (data.apiEndpoints && Array.isArray(data.apiEndpoints)) {
          data.apiEndpoints.forEach((endpoint: any, index: number) => {
            if (!endpoint.method || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(endpoint.method)) {
              errors.push(`API Endpoint ${index + 1}: valid HTTP method is required`);
            }
            if (!endpoint.path || !endpoint.path.startsWith('/')) {
              errors.push(`API Endpoint ${index + 1}: valid path starting with '/' is required`);
            }
          });
        }
        break;
        
      default:
        // Generic validation for other suites
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  // Private helper methods
  
  private generateId(): string {
    return `suite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private mapNeo4jToSuite(node: any): Suite {
    return {
      id: node.id,
      name: node.name,
      type: node.type as SuiteType,
      description: node.description,
      workspaceId: node.workspaceId,
      capabilities: this.createDefaultCapabilities(node.type as SuiteType),
      createdAt: new Date(node.createdAt),
      updatedAt: new Date(node.updatedAt)
    };
  }
  
  private createDefaultCapabilities(suiteType: SuiteType): Capability[] {
    const defaultCapabilities = DEFAULT_SUITE_CONFIGS[suiteType].capabilities;
    
    return defaultCapabilities.map((name, index) => ({
      id: `cap_${suiteType.toLowerCase()}_${index + 1}`,
      name,
      description: `${name} capability for ${suiteType} suite`,
      ontologyClass: `${suiteType}:${name.replace(/\s+/g, '')}`,
      agentTypes: this.getAgentTypesForCapability(suiteType, name)
    }));
  }
  
  private getAgentTypesForCapability(suiteType: SuiteType, capabilityName: string): string[] {
    // Map capability names to agent types
    const capabilityAgentMap: Record<string, string[]> = {
      'Persona Development': ['PERSONA_AGENT'],
      'Jobs-to-be-Done Analysis': ['JTBD_AGENT'], 
      'Market Research': ['RESEARCH_AGENT'],
      'Customer Segmentation': ['SEGMENTATION_AGENT'],
      'Architecture Design': ['ARCHITECTURE_AGENT'],
      'API Specification': ['API_SPEC_AGENT'],
      'Component Development': ['COMPONENT_AGENT'],
      'Strategic Planning': ['STRATEGY_AGENT'],
      'Financial Modeling': ['FINANCIAL_MODELING_AGENT'],
      'Sales Strategy': ['RESEARCH_AGENT', 'ANALYSIS_AGENT'],
      'Process Design': ['OPTIMIZATION_AGENT'],
      'Default': ['ANALYSIS_AGENT']
    };
    
    return capabilityAgentMap[capabilityName] || capabilityAgentMap['Default'];
  }
}

// Export singleton instance
export const suiteService = new SuiteServiceImpl();