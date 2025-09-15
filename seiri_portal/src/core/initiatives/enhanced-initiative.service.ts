// Enhanced Initiative Service with AI RACI Recommendations
// Integrates AI-powered RACI assignments with initiative creation

import { generateId } from '@/lib/neo4j-schema';
import { runQuery } from '@/lib/neo4j';
import { aiRACIRecommendationService, RACIRecommendationRequest } from '@/core/ai/raci-recommendation.service';
import { Neo4jRACIService } from '@/core/database/neo4j-raci.service';
import { SuiteType } from '@/core/suites/suite.model';
import { Driver } from 'neo4j-driver';

export interface EnhancedCreateInitiativeInput {
  name: string;
  description: string;
  workspaceId: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedValue?: number;
  businessObjectives?: string[];
  initiativeType?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
  autoGenerateRACI?: boolean; // New option to auto-generate RACI
}

export interface EnhancedInitiativeResult {
  initiative: {
    id: string;
    name: string;
    description: string;
    workspaceId: string;
    priority: string;
    estimatedValue?: number;
    createdAt: string;
    updatedAt: string;
  };
  raciAssignment?: {
    responsible: SuiteType[];
    accountable: SuiteType;
    consulted: SuiteType[];
    informed: SuiteType[];
    reasoning: any;
    confidence: number;
    method: 'AI' | 'FALLBACK' | 'MANUAL';
  };
  valueMetrics?: any[];
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'ERROR';
  warnings?: string[];
  errors?: string[];
}

export class EnhancedInitiativeService {
  private neo4jRACIService: Neo4jRACIService;

  constructor(neo4jDriver: Driver) {
    this.neo4jRACIService = new Neo4jRACIService(neo4jDriver);
  }

  /**
   * Create initiative with automatic RACI assignment and value tracking
   */
  async createInitiativeWithAIRACI(
    input: EnhancedCreateInitiativeInput
  ): Promise<EnhancedInitiativeResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let raciAssignment: any = null;

    try {
      // 1. Create the basic initiative
      const initiativeId = generateId();
      const now = new Date().toISOString();

      console.log('Creating initiative:', { name: input.name, workspaceId: input.workspaceId });

      const initiative = await this.createBasicInitiative({
        id: initiativeId,
        name: input.name,
        description: input.description,
        workspaceId: input.workspaceId,
        priority: input.priority || 'MEDIUM',
        estimatedValue: input.estimatedValue,
        assigneeId: input.assigneeId,
        startDate: input.startDate,
        endDate: input.endDate,
        createdAt: now,
        updatedAt: now
      });

      // 2. Generate RACI recommendation if requested
      if (input.autoGenerateRACI !== false) { // Default to true
        try {
          console.log('Generating RACI recommendation...');
          
          const raciRequest: RACIRecommendationRequest = {
            initiativeName: input.name,
            description: input.description,
            initiativeType: input.initiativeType,
            businessObjectives: input.businessObjectives,
            estimatedValue: input.estimatedValue,
            priority: input.priority
          };

          const recommendation = await aiRACIRecommendationService.generateRACIRecommendation(raciRequest);
          
          console.log('RACI recommendation generated:', {
            responsible: recommendation.responsible,
            accountable: recommendation.accountable,
            confidence: recommendation.confidence
          });

          // 3. Convert suite types to suite IDs and apply RACI assignment
          const suiteIds = await this.getSuiteIdsBySlugs(input.workspaceId, {
            responsible: recommendation.responsible,
            accountable: recommendation.accountable,
            consulted: recommendation.consulted,
            informed: recommendation.informed
          });

          if (suiteIds) {
            await this.neo4jRACIService.createRACIAssignment(initiativeId, suiteIds);
            
            raciAssignment = {
              ...recommendation,
              method: recommendation.confidence > 60 ? 'AI' : 'FALLBACK'
            };

            console.log('RACI assignment applied successfully');
          } else {
            warnings.push('Could not find all required suites for RACI assignment');
          }

        } catch (raciError) {
          console.error('RACI generation failed:', raciError);
          errors.push(`RACI assignment failed: ${raciError instanceof Error ? raciError.message : 'Unknown error'}`);
        }
      }

      // 4. Create value metrics if estimated value is provided
      if (input.estimatedValue && input.estimatedValue > 0) {
        try {
          const valueMetrics = await this.createInitialValueMetrics(initiativeId, {
            estimatedValue: input.estimatedValue,
            initiativeType: input.initiativeType,
            priority: input.priority || 'MEDIUM'
          });
          
          console.log('Value metrics created:', valueMetrics.length, 'metrics');
        } catch (valueError) {
          console.error('Value metrics creation failed:', valueError);
          warnings.push('Value metrics could not be created');
        }
      }

      // 5. Update initiative with RACI and value tracking flags
      await this.updateInitiativeWithEnhancements(initiativeId, {
        raciEnabled: true,
        valueTrackingEnabled: input.estimatedValue ? true : false,
        initiativeType: input.initiativeType || 'CUSTOM'
      });

      return {
        initiative: {
          id: initiativeId,
          name: input.name,
          description: input.description,
          workspaceId: input.workspaceId,
          priority: input.priority || 'MEDIUM',
          estimatedValue: input.estimatedValue,
          createdAt: now,
          updatedAt: now
        },
        raciAssignment,
        status: errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
        warnings: warnings.length > 0 ? warnings : undefined,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('Enhanced initiative creation failed:', error);
      
      return {
        initiative: null as any,
        status: 'ERROR',
        errors: [error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error occurred']
      };
    }
  }

  /**
   * Create basic initiative in Neo4j without RACI
   */
  private async createBasicInitiative(initiative: any): Promise<any> {
    const result = await runQuery(`
      MATCH (w:Workspace {id: $workspaceId})
      CREATE (i:Initiative {
        id: $id,
        name: $name,
        description: $description,
        workspaceId: $workspaceId,
        priority: $priority,
        estimatedValue: $estimatedValue,
        assigneeId: $assigneeId,
        startDate: $startDate,
        endDate: $endDate,
        status: "PLANNING",
        progress: 0,
        createdAt: $createdAt,
        updatedAt: $updatedAt
      })
      CREATE (w)-[:CONTAINS]->(i)
      RETURN i
    `, {
      id: initiative.id,
      name: initiative.name,
      description: initiative.description || '',
      workspaceId: initiative.workspaceId,
      priority: initiative.priority,
      estimatedValue: initiative.estimatedValue || null,
      assigneeId: initiative.assigneeId || null,
      startDate: initiative.startDate || null,
      endDate: initiative.endDate || null,
      createdAt: initiative.createdAt,
      updatedAt: initiative.updatedAt
    });

    if (result.length === 0) {
      throw new Error('Failed to create initiative in database');
    }

    return result[0].i;
  }

  /**
   * Convert suite types to actual suite IDs for the workspace
   */
  private async getSuiteIdsBySlugs(
    workspaceId: string,
    raciSuites: {
      responsible: SuiteType[];
      accountable: SuiteType;
      consulted: SuiteType[];
      informed: SuiteType[];
    }
  ): Promise<{ responsible: string[]; accountable: string; consulted: string[]; informed: string[] } | null> {
    try {
      // Get all suites for the workspace
      const suitesResult = await runQuery(`
        MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(s:Suite)
        RETURN s.id as id, s.slug as slug, s.name as name
      `, { workspaceId });

      console.log('Available suites:', suitesResult.map(s => ({ slug: s.slug, name: s.name })));

      // Create mapping for both slug and name variations
      const suiteMap = new Map<string, string>();
      suitesResult.forEach(record => {
        // Map by slug (primary)
        suiteMap.set(record.slug.toLowerCase(), record.id);
        // Map by name for fallback
        suiteMap.set(record.name.toLowerCase(), record.id);
        
        // Map common AI variations
        if (record.slug === 'coding') {
          suiteMap.set('development', record.id);
          suiteMap.set('technical', record.id);
          suiteMap.set('engineering', record.id);
        }
        if (record.slug === 'ops') {
          suiteMap.set('operations', record.id);
        }
        if (record.slug === 'strategy') {
          suiteMap.set('strategic', record.id);
        }
      });

      console.log('Suite mapping keys:', Array.from(suiteMap.keys()));

      // Helper function to find suite ID with fallback mapping
      const findSuiteId = (suiteType: string): string | undefined => {
        const normalized = suiteType.toLowerCase();
        return suiteMap.get(normalized);
      };

      // Map suite types to IDs with logging
      const responsible = raciSuites.responsible
        .map(suite => {
          const id = findSuiteId(suite);
          console.log(`Mapping responsible ${suite} -> ${id}`);
          return id;
        })
        .filter(id => id) as string[];

      const accountable = findSuiteId(raciSuites.accountable);
      console.log(`Mapping accountable ${raciSuites.accountable} -> ${accountable}`);
      
      const consulted = raciSuites.consulted
        .map(suite => {
          const id = findSuiteId(suite);
          console.log(`Mapping consulted ${suite} -> ${id}`);
          return id;
        })
        .filter(id => id) as string[];

      const informed = raciSuites.informed
        .map(suite => {
          const id = findSuiteId(suite);
          console.log(`Mapping informed ${suite} -> ${id}`);
          return id;
        })
        .filter(id => id) as string[];

      if (!accountable || responsible.length === 0) {
        console.warn('Missing required suites for RACI assignment:', {
          accountable: !!accountable,
          responsibleCount: responsible.length,
          originalRaci: raciSuites
        });
        return null;
      }

      console.log('Successful RACI mapping:', { responsible, accountable, consulted, informed });
      return { responsible, accountable, consulted, informed };

    } catch (error) {
      console.error('Error mapping suites:', error);
      return null;
    }
  }

  /**
   * Create initial value metrics for the initiative
   */
  private async createInitialValueMetrics(
    initiativeId: string,
    config: {
      estimatedValue: number;
      initiativeType?: string;
      priority: string;
    }
  ): Promise<any[]> {
    const metrics = [];

    // Revenue metric based on estimated value
    if (config.estimatedValue > 0) {
      metrics.push({
        name: 'Revenue Impact',
        value: config.estimatedValue,
        unit: 'USD',
        category: 'REVENUE' as any,
        trend: 'INCREASING' as any,
        confidence: config.priority === 'HIGH' ? 85 : config.priority === 'MEDIUM' ? 75 : 65,
        target: config.estimatedValue * 1.2,
        source: 'AI_ESTIMATION'
      });
    }

    // ROI metric
    metrics.push({
      name: 'Expected ROI',
      value: config.priority === 'HIGH' ? 25 : config.priority === 'MEDIUM' ? 15 : 10,
      unit: 'percentage',
      category: 'REVENUE' as any,
      trend: 'INCREASING' as any,
      confidence: 80,
      target: config.priority === 'HIGH' ? 35 : config.priority === 'MEDIUM' ? 25 : 20,
      source: 'AI_ESTIMATION'
    });

    // Time to value metric
    const timeToValue = config.initiativeType?.toLowerCase().includes('mvp') ? 3 : 
                       config.initiativeType?.toLowerCase().includes('strategy') ? 6 : 4;
    
    metrics.push({
      name: 'Time to Value',
      value: timeToValue,
      unit: 'months',
      category: 'TIME_TO_MARKET' as any,
      trend: 'STABLE' as any,
      confidence: 90,
      target: Math.max(1, timeToValue - 1),
      source: 'AI_ESTIMATION'
    });

    return await this.neo4jRACIService.createValueMetrics(initiativeId, metrics);
  }

  /**
   * Update initiative with enhancement flags
   */
  private async updateInitiativeWithEnhancements(
    initiativeId: string,
    enhancements: {
      raciEnabled: boolean;
      valueTrackingEnabled: boolean;
      initiativeType: string;
    }
  ): Promise<void> {
    await runQuery(`
      MATCH (i:Initiative {id: $initiativeId})
      SET i.raciEnabled = $raciEnabled,
          i.valueTrackingEnabled = $valueTrackingEnabled,
          i.type = $initiativeType,
          i.enhancedAt = datetime(),
          i.updatedAt = $updatedAt
    `, {
      initiativeId,
      raciEnabled: enhancements.raciEnabled,
      valueTrackingEnabled: enhancements.valueTrackingEnabled,
      initiativeType: enhancements.initiativeType,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Get RACI recommendation without creating initiative
   */
  async previewRACIRecommendation(request: RACIRecommendationRequest): Promise<any> {
    return await aiRACIRecommendationService.generateRACIRecommendation(request);
  }
}

// Export singleton instance factory
let enhancedInitiativeService: EnhancedInitiativeService | null = null;

export function getEnhancedInitiativeService(neo4jDriver: Driver): EnhancedInitiativeService {
  if (!enhancedInitiativeService) {
    enhancedInitiativeService = new EnhancedInitiativeService(neo4jDriver);
  }
  return enhancedInitiativeService;
}