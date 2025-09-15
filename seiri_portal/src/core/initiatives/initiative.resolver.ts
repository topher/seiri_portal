// Initiative GraphQL Resolver
// Handles GraphQL queries and mutations for Initiative management with RACI

import { initiativeService } from './initiative.service';
import { suiteService } from '../suites/suite.service';
import {
  Initiative,
  CreateInitiativeInput,
  UpdateInitiativeInput,
  RACIInput,
  InitiativeValueInput,
  InitiativeStatus,
  Priority,
  ValidationResult
} from './initiative.model';
import { RACIRole } from '../suites/suite.model';

// GraphQL Resolvers for Initiative
export const initiativeResolvers = {
  Query: {
    // Get a specific initiative by ID
    initiative: async (_: any, { id }: { id: string }): Promise<Initiative | null> => {
      return await initiativeService.getInitiative(id);
    },
    
    // Get all initiatives for a workspace
    initiatives: async (_: any, { workspaceId }: { workspaceId: string }): Promise<Initiative[]> => {
      return await initiativeService.getInitiativesByWorkspace(workspaceId);
    },
    
    // Get initiatives by suite and optional RACI role
    initiativesBySuite: async (
      _: any,
      { suiteId, role }: { suiteId: string; role?: RACIRole }
    ): Promise<Initiative[]> => {
      return await initiativeService.getInitiativesBySuite(suiteId, role);
    }
  },
  
  Mutation: {
    // Create a new initiative
    createInitiative: async (_: any, { input }: { input: CreateInitiativeInput }): Promise<Initiative> => {
      return await initiativeService.createInitiative(input);
    },
    
    // Update an existing initiative
    updateInitiative: async (
      _: any,
      { id, input }: { id: string; input: UpdateInitiativeInput }
    ): Promise<Initiative> => {
      const existingInitiative = await initiativeService.getInitiative(id);
      if (!existingInitiative) {
        throw new Error(`Initiative ${id} not found`);
      }
      
      return await initiativeService.updateInitiative(id, input);
    },
    
    // Delete an initiative
    deleteInitiative: async (_: any, { id }: { id: string }): Promise<boolean> => {
      return await initiativeService.deleteInitiative(id);
    },
    
    // Update RACI matrix for an initiative
    updateInitiativeRACI: async (
      _: any,
      { initiativeId, raci }: { initiativeId: string; raci: RACIInput }
    ): Promise<Initiative> => {
      return await initiativeService.updateRACI(initiativeId, raci);
    },
    
    // Update initiative value metrics
    updateInitiativeValue: async (
      _: any,
      { initiativeId, value }: { initiativeId: string; value: InitiativeValueInput }
    ) => {
      return await initiativeService.updateValue(initiativeId, value);
    },
    
    // Update initiative progress
    updateInitiativeProgress: async (
      _: any,
      { id, progress }: { id: string; progress: number }
    ): Promise<Initiative> => {
      return await initiativeService.updateProgress(id, progress);
    },
    
    // Validate RACI matrix
    validateRACI: async (
      _: any,
      { raci, workspaceId }: { raci: RACIInput; workspaceId: string }
    ): Promise<ValidationResult> => {
      return await initiativeService.validateRACI(raci, workspaceId);
    }
  },
  
  // Field Resolvers for Initiative type
  Initiative: {
    // Resolve workspace relationship
    workspace: async (initiative: Initiative) => {
      // This would typically fetch from workspace service
      return {
        id: initiative.workspaceId,
        // Additional workspace fields would be resolved by workspace resolver
      };
    },
    
    // Resolve suites through RACI relationships
    suites: async (initiative: Initiative) => {
      const allSuiteIds = [
        initiative.raci.accountable,
        ...initiative.raci.responsible,
        ...initiative.raci.consulted,
        ...initiative.raci.informed
      ].filter((id, index, arr) => id && arr.indexOf(id) === index); // Remove duplicates and empty IDs
      
      const suites = await Promise.all(
        allSuiteIds.map(id => suiteService.getSuite(id))
      );
      
      return suites.filter(suite => suite !== null);
    },
    
    // Resolve tasks for this initiative
    tasks: async (initiative: Initiative) => {
      // This will be implemented when Task service is created
      return [];
    },
    
    // Resolve RACI with suite details
    raci: async (initiative: Initiative) => {
      const [responsibleSuites, accountableSuite, consultedSuites, informedSuites] = await Promise.all([
        Promise.all(initiative.raci.responsible.map(id => suiteService.getSuite(id))),
        suiteService.getSuite(initiative.raci.accountable),
        Promise.all(initiative.raci.consulted.map(id => suiteService.getSuite(id))),
        Promise.all(initiative.raci.informed.map(id => suiteService.getSuite(id)))
      ]);
      
      return {
        responsible: responsibleSuites.filter(s => s !== null),
        accountable: accountableSuite,
        consulted: consultedSuites.filter(s => s !== null),
        informed: informedSuites.filter(s => s !== null)
      };
    },
    
    // Resolve value with computed fields
    value: (initiative: Initiative) => {
      return {
        ...initiative.value,
        // Add computed fields if needed
        isHighValue: initiative.value.estimatedImpact.includes('$') && 
                    parseFloat(initiative.value.estimatedImpact.replace(/[^0-9.]/g, '')) > 100000,
        metricsCount: initiative.value.metrics.length
      };
    },
    
    // Resolve stages with computed progress
    stages: (initiative: Initiative) => {
      return initiative.stages.map(stage => ({
        ...stage,
        // Add computed fields
        isActive: stage.status === 'IN_PROGRESS',
        isCompleted: stage.status === 'COMPLETED',
        duration: stage.completedAt && stage.startedAt ? 
          stage.completedAt.getTime() - stage.startedAt.getTime() : null
      }));
    }
  },
  
  // RACI field resolver
  RACI: {
    // Get all participating suites
    allSuites: async (raci: any) => {
      const allSuiteIds = [
        ...(raci.responsible || []).map((s: any) => s.id || s),
        raci.accountable?.id || raci.accountable,
        ...(raci.consulted || []).map((s: any) => s.id || s),
        ...(raci.informed || []).map((s: any) => s.id || s)
      ].filter((id, index, arr) => id && arr.indexOf(id) === index);
      
      const suites = await Promise.all(
        allSuiteIds.map(id => suiteService.getSuite(id))
      );
      
      return suites.filter(suite => suite !== null);
    }
  },
  
  // Value Metric field resolver
  ValueMetric: {
    // Calculate progress percentage if possible
    progressPercentage: (metric: any) => {
      if (!metric.current || !metric.target) return null;
      
      const current = parseFloat(metric.current.replace(/[^0-9.-]/g, ''));
      const target = parseFloat(metric.target.replace(/[^0-9.-]/g, ''));
      
      if (isNaN(current) || isNaN(target) || target === 0) return null;
      
      return Math.min(100, Math.max(0, (current / target) * 100));
    },
    
    // Determine if metric is on track
    isOnTrack: (metric: any) => {
      const progress = metric.progressPercentage;
      return progress !== null && progress >= 75;
    }
  }
};

// Type definitions for GraphQL schema (to be merged with main schema)
export const initiativeTypeDefs = `
  extend type Query {
    initiative(id: ID!): Initiative
    initiatives(workspaceId: ID!): [Initiative!]!
    initiativesBySuite(suiteId: ID!, role: RACIRole): [Initiative!]!
  }
  
  extend type Mutation {
    createInitiative(input: CreateInitiativeInput!): Initiative!
    updateInitiative(id: ID!, input: UpdateInitiativeInput!): Initiative!
    deleteInitiative(id: ID!): Boolean!
    updateInitiativeRACI(initiativeId: ID!, raci: RACIInput!): Initiative!
    updateInitiativeValue(initiativeId: ID!, value: InitiativeValueInput!): InitiativeValue!
    updateInitiativeProgress(id: ID!, progress: Float!): Initiative!
    validateRACI(raci: RACIInput!, workspaceId: ID!): ValidationResult!
  }
  
  enum RACIRole {
    RESPONSIBLE
    ACCOUNTABLE
    CONSULTED
    INFORMED
  }
`;

// Utility functions for resolvers
export const initiativeUtils = {
  // Get initiative statistics for a workspace
  async getInitiativeStats(workspaceId: string): Promise<{
    total: number;
    byStatus: Record<InitiativeStatus, number>;
    byPriority: Record<Priority, number>;
    averageProgress: number;
  }> {
    const initiatives = await initiativeService.getInitiativesByWorkspace(workspaceId);
    
    const byStatus = initiatives.reduce((acc, init) => {
      acc[init.status] = (acc[init.status] || 0) + 1;
      return acc;
    }, {} as Record<InitiativeStatus, number>);
    
    const byPriority = initiatives.reduce((acc, init) => {
      acc[init.priority] = (acc[init.priority] || 0) + 1;
      return acc;
    }, {} as Record<Priority, number>);
    
    const averageProgress = initiatives.length > 0 
      ? initiatives.reduce((sum, init) => sum + init.progress, 0) / initiatives.length
      : 0;
    
    return {
      total: initiatives.length,
      byStatus,
      byPriority,
      averageProgress
    };
  },
  
  // Get suite workload (number of initiatives by RACI role)
  async getSuiteWorkload(suiteId: string): Promise<{
    responsible: number;
    accountable: number;
    consulted: number;
    informed: number;
    total: number;
  }> {
    const [responsible, accountable, consulted, informed] = await Promise.all([
      initiativeService.getInitiativesBySuite(suiteId, RACIRole.RESPONSIBLE),
      initiativeService.getInitiativesBySuite(suiteId, RACIRole.ACCOUNTABLE),
      initiativeService.getInitiativesBySuite(suiteId, RACIRole.CONSULTED),
      initiativeService.getInitiativesBySuite(suiteId, RACIRole.INFORMED)
    ]);
    
    return {
      responsible: responsible.length,
      accountable: accountable.length,
      consulted: consulted.length,
      informed: informed.length,
      total: responsible.length + accountable.length + consulted.length + informed.length
    };
  },
  
  // Find initiatives that need attention
  async getInitiativesNeedingAttention(workspaceId: string): Promise<Initiative[]> {
    const initiatives = await initiativeService.getInitiativesByWorkspace(workspaceId);
    
    return initiatives.filter(initiative => {
      // Initiative needs attention if:
      // 1. In progress but no progress in 30 days
      // 2. High priority but low progress
      // 3. Past due date (if tasks had due dates)
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      return (
        (initiative.status === InitiativeStatus.IN_PROGRESS && 
         initiative.updatedAt < thirtyDaysAgo) ||
        (initiative.priority === Priority.HIGH && initiative.progress < 0.3) ||
        (initiative.priority === Priority.URGENT && initiative.progress < 0.5)
      );
    });
  }
};