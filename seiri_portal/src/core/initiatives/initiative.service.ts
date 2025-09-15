// Initiative Service Implementation
// Manages cross-suite initiatives with RACI matrix coordination

import { runQuery } from '@/lib/neo4j';
import {
  Initiative,
  InitiativeService,
  CreateInitiativeInput,
  UpdateInitiativeInput,
  RACIInput,
  InitiativeValueInput,
  InitiativeValue,
  InitiativeStatus,
  Priority,
  VisibilityLevel,
  StageStatus,
  WorkflowStage,
  ValidationResult,
  RACI_VALIDATION_RULES,
  DEFAULT_INITIATIVE_STAGES,
  initiativeUtils
} from './initiative.model';
import { RACIRole } from '../suites/suite.model';

export class InitiativeServiceImpl implements InitiativeService {
  
  async createInitiative(input: CreateInitiativeInput): Promise<Initiative> {
    // Validate RACI matrix
    const raciValidation = await this.validateRACI(input.raci, input.workspaceId);
    if (!raciValidation.isValid) {
      throw new Error(`RACI validation failed: ${raciValidation.errors.join(', ')}`);
    }
    
    const id = this.generateId();
    const now = new Date();
    
    // Create default stages
    const stages = this.createDefaultStages();
    
    const initiative: Initiative = {
      id,
      name: input.name,
      description: input.description,
      workspaceId: input.workspaceId,
      status: InitiativeStatus.PLANNING,
      priority: input.priority || Priority.MEDIUM,
      progress: 0,
      createdAt: now,
      updatedAt: now,
      raci: input.raci,
      value: {
        ...input.value,
        clientVisibility: input.value.clientVisibility || VisibilityLevel.HIGH
      } as any,
      stages
    };
    
    // Create initiative in Neo4j
    await this.createInitiativeInDatabase(initiative);
    
    // Create RACI relationships
    await this.createRACIRelationships(initiative.id, input.raci);
    
    return initiative;
  }
  
  async getInitiative(id: string): Promise<Initiative | null> {
    const result = await runQuery(`
      MATCH (i:Initiative {id: $id})
      RETURN i
    `, { id });
    
    if (result.length === 0) return null;
    
    const initiative = this.mapNeo4jToInitiative(result[0].i);
    
    // Load RACI relationships
    initiative.raci = await this.loadRACIRelationships(id);
    
    return initiative;
  }
  
  async getInitiativesByWorkspace(workspaceId: string): Promise<Initiative[]> {
    const result = await runQuery(`
      MATCH (w:Workspace {id: $workspaceId})-[:HAS_INITIATIVE]->(i:Initiative)
      RETURN i
      ORDER BY i.priority DESC, i.createdAt DESC
    `, { workspaceId });
    
    const initiatives = result.map(record => this.mapNeo4jToInitiative(record.i));
    
    // Load RACI relationships for all initiatives
    for (const initiative of initiatives) {
      initiative.raci = await this.loadRACIRelationships(initiative.id);
    }
    
    return initiatives;
  }
  
  async updateInitiative(id: string, updates: UpdateInitiativeInput): Promise<Initiative> {
    const updateFields: string[] = [];
    const params: any = { id };
    
    if (updates.name) {
      updateFields.push('i.name = $name');
      params.name = updates.name;
    }
    
    if (updates.description) {
      updateFields.push('i.description = $description');
      params.description = updates.description;
    }
    
    if (updates.status) {
      updateFields.push('i.status = $status');
      params.status = updates.status;
      
      // Set completion date if status is COMPLETED
      if (updates.status === InitiativeStatus.COMPLETED) {
        updateFields.push('i.completedAt = datetime($completedAt)');
        params.completedAt = new Date().toISOString();
      }
    }
    
    if (updates.priority) {
      updateFields.push('i.priority = $priority');
      params.priority = updates.priority;
    }
    
    if (updates.progress !== undefined) {
      updateFields.push('i.progress = $progress');
      params.progress = Math.max(0, Math.min(1, updates.progress)); // Clamp between 0 and 1
    }
    
    updateFields.push('i.updatedAt = datetime($updatedAt)');
    params.updatedAt = new Date().toISOString();
    
    await runQuery(`
      MATCH (i:Initiative {id: $id})
      SET ${updateFields.join(', ')}
    `, params);
    
    const updated = await this.getInitiative(id);
    if (!updated) {
      throw new Error(`Initiative ${id} not found after update`);
    }
    
    return updated;
  }
  
  async deleteInitiative(id: string): Promise<boolean> {
    const result = await runQuery(`
      MATCH (i:Initiative {id: $id})
      DETACH DELETE i
      RETURN count(i) as deletedCount
    `, { id });
    
    return result[0]?.deletedCount > 0;
  }
  
  async updateRACI(initiativeId: string, raci: RACIInput): Promise<Initiative> {
    // Validate the new RACI matrix
    const validation = await this.validateRACI(raci, ''); // TODO: Get workspace ID
    if (!validation.isValid) {
      throw new Error(`RACI validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Delete existing RACI relationships
    await runQuery(`
      MATCH (i:Initiative {id: $initiativeId})-[r:RESPONSIBLE_SUITE|ACCOUNTABLE_SUITE|CONSULTED_SUITE|INFORMED_SUITE]->()
      DELETE r
    `, { initiativeId });
    
    // Create new RACI relationships
    await this.createRACIRelationships(initiativeId, raci);
    
    const updated = await this.getInitiative(initiativeId);
    if (!updated) {
      throw new Error(`Initiative ${initiativeId} not found after RACI update`);
    }
    
    return updated;
  }
  
  async updateValue(initiativeId: string, value: InitiativeValueInput): Promise<InitiativeValue> {
    // Update value in database (stored as JSON)
    await runQuery(`
      MATCH (i:Initiative {id: $initiativeId})
      SET i.value = $value, i.updatedAt = datetime($updatedAt)
    `, {
      initiativeId,
      value: JSON.stringify(value),
      updatedAt: new Date().toISOString()
    });
    
    return {
      ...value,
      clientVisibility: value.clientVisibility || VisibilityLevel.HIGH
    } as any;
  }
  
  async updateProgress(initiativeId: string, progress: number): Promise<Initiative> {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    
    await runQuery(`
      MATCH (i:Initiative {id: $initiativeId})
      SET i.progress = $progress, i.updatedAt = datetime($updatedAt)
    `, {
      initiativeId,
      progress: clampedProgress,
      updatedAt: new Date().toISOString()
    });
    
    const updated = await this.getInitiative(initiativeId);
    if (!updated) {
      throw new Error(`Initiative ${initiativeId} not found after progress update`);
    }
    
    return updated;
  }
  
  async getInitiativesBySuite(suiteId: string, role?: RACIRole): Promise<Initiative[]> {
    let relationshipType = '';
    if (role) {
      switch (role) {
        case RACIRole.RESPONSIBLE:
          relationshipType = ':RESPONSIBLE_SUITE';
          break;
        case RACIRole.ACCOUNTABLE:
          relationshipType = ':ACCOUNTABLE_SUITE';
          break;
        case RACIRole.CONSULTED:
          relationshipType = ':CONSULTED_SUITE';
          break;
        case RACIRole.INFORMED:
          relationshipType = ':INFORMED_SUITE';
          break;
      }
    }
    
    const query = `
      MATCH (s:Suite {id: $suiteId})<-[r${relationshipType}]-(i:Initiative)
      RETURN i
      ORDER BY i.priority DESC, i.createdAt DESC
    `;
    
    const result = await runQuery(query, { suiteId });
    
    const initiatives = result.map(record => this.mapNeo4jToInitiative(record.i));
    
    // Load RACI relationships for all initiatives
    for (const initiative of initiatives) {
      initiative.raci = await this.loadRACIRelationships(initiative.id);
    }
    
    return initiatives;
  }
  
  async validateRACI(raci: RACIInput, workspaceId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Run all validation rules
    const singleAccountableResult = RACI_VALIDATION_RULES.validateSingleAccountable(raci);
    const responsibleExistsResult = RACI_VALIDATION_RULES.validateResponsibleExists(raci);
    const noConflictsResult = RACI_VALIDATION_RULES.validateNoConflicts(raci);
    const suiteExistenceResult = await RACI_VALIDATION_RULES.validateSuiteExistence(raci, workspaceId);
    
    errors.push(...singleAccountableResult.errors);
    errors.push(...responsibleExistsResult.errors);
    errors.push(...noConflictsResult.errors);
    errors.push(...suiteExistenceResult.errors);
    
    warnings.push(...singleAccountableResult.warnings);
    warnings.push(...responsibleExistsResult.warnings);
    warnings.push(...noConflictsResult.warnings);
    warnings.push(...suiteExistenceResult.warnings);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  // Private helper methods
  
  private generateId(): string {
    return `initiative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async createInitiativeInDatabase(initiative: Initiative): Promise<void> {
    await runQuery(`
      CREATE (i:Initiative {
        id: $id,
        name: $name,
        description: $description,
        workspaceId: $workspaceId,
        status: $status,
        priority: $priority,
        progress: $progress,
        value: $value,
        stages: $stages,
        createdAt: datetime($createdAt),
        updatedAt: datetime($updatedAt)
      })
    `, {
      id: initiative.id,
      name: initiative.name,
      description: initiative.description || '',
      workspaceId: initiative.workspaceId,
      status: initiative.status,
      priority: initiative.priority,
      progress: initiative.progress,
      value: JSON.stringify(initiative.value),
      stages: JSON.stringify(initiative.stages),
      createdAt: initiative.createdAt.toISOString(),
      updatedAt: initiative.updatedAt.toISOString()
    });
    
    // Create relationship to workspace
    await runQuery(`
      MATCH (w:Workspace {id: $workspaceId})
      MATCH (i:Initiative {id: $initiativeId})
      CREATE (w)-[:HAS_INITIATIVE]->(i)
    `, {
      workspaceId: initiative.workspaceId,
      initiativeId: initiative.id
    });
  }
  
  private async createRACIRelationships(initiativeId: string, raci: RACIInput): Promise<void> {
    // Create RESPONSIBLE relationships
    for (const suiteId of raci.responsible) {
      await runQuery(`
        MATCH (i:Initiative {id: $initiativeId})
        MATCH (s:Suite {id: $suiteId})
        CREATE (i)-[:RESPONSIBLE_SUITE]->(s)
      `, { initiativeId, suiteId });
    }
    
    // Create ACCOUNTABLE relationship (exactly one)
    await runQuery(`
      MATCH (i:Initiative {id: $initiativeId})
      MATCH (s:Suite {id: $suiteId})
      CREATE (i)-[:ACCOUNTABLE_SUITE]->(s)
    `, { initiativeId, suiteId: raci.accountable });
    
    // Create CONSULTED relationships
    for (const suiteId of raci.consulted) {
      await runQuery(`
        MATCH (i:Initiative {id: $initiativeId})
        MATCH (s:Suite {id: $suiteId})
        CREATE (i)-[:CONSULTED_SUITE]->(s)
      `, { initiativeId, suiteId });
    }
    
    // Create INFORMED relationships
    for (const suiteId of raci.informed) {
      await runQuery(`
        MATCH (i:Initiative {id: $initiativeId})
        MATCH (s:Suite {id: $suiteId})
        CREATE (i)-[:INFORMED_SUITE]->(s)
      `, { initiativeId, suiteId });
    }
  }
  
  private async loadRACIRelationships(initiativeId: string): Promise<any> {
    const [responsible, accountable, consulted, informed] = await Promise.all([
      runQuery(`
        MATCH (i:Initiative {id: $initiativeId})-[:RESPONSIBLE_SUITE]->(s:Suite)
        RETURN s.id as suiteId
      `, { initiativeId }),
      runQuery(`
        MATCH (i:Initiative {id: $initiativeId})-[:ACCOUNTABLE_SUITE]->(s:Suite)
        RETURN s.id as suiteId
      `, { initiativeId }),
      runQuery(`
        MATCH (i:Initiative {id: $initiativeId})-[:CONSULTED_SUITE]->(s:Suite)
        RETURN s.id as suiteId
      `, { initiativeId }),
      runQuery(`
        MATCH (i:Initiative {id: $initiativeId})-[:INFORMED_SUITE]->(s:Suite)
        RETURN s.id as suiteId
      `, { initiativeId })
    ]);
    
    return {
      responsible: responsible.map(r => r.suiteId),
      accountable: accountable[0]?.suiteId || '',
      consulted: consulted.map(r => r.suiteId),
      informed: informed.map(r => r.suiteId)
    };
  }
  
  private mapNeo4jToInitiative(node: any): Initiative {
    return {
      id: node.id,
      name: node.name,
      description: node.description,
      workspaceId: node.workspaceId,
      status: node.status,
      priority: node.priority,
      progress: node.progress || 0,
      createdAt: new Date(node.createdAt),
      updatedAt: new Date(node.updatedAt),
      startedAt: node.startedAt ? new Date(node.startedAt) : undefined,
      completedAt: node.completedAt ? new Date(node.completedAt) : undefined,
      raci: { responsible: [], accountable: '', consulted: [], informed: [] }, // Will be loaded separately
      value: node.value ? JSON.parse(node.value) : { estimatedImpact: '', metrics: [], clientVisibility: VisibilityLevel.HIGH },
      stages: node.stages ? JSON.parse(node.stages) : this.createDefaultStages()
    };
  }
  
  private createDefaultStages(): WorkflowStage[] {
    return DEFAULT_INITIATIVE_STAGES.map((stage, index) => ({
      ...stage,
      id: `stage_${Date.now()}_${index}`
    }));
  }
}

// Export singleton instance
export const initiativeService = new InitiativeServiceImpl();