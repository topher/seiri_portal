// Suite GraphQL Resolver
// Handles GraphQL queries and mutations for Suite management

import { suiteService } from './suite.service';
import { Suite, SuiteType, CreateSuiteInput } from './suite.model';

// GraphQL Resolvers for Suite
export const suiteResolvers = {
  Query: {
    // Get a specific suite by ID
    suite: async (_: any, { id }: { id: string }): Promise<Suite | null> => {
      return await suiteService.getSuite(id);
    },
    
    // Get all suites for a workspace
    suites: async (_: any, { workspaceId }: { workspaceId: string }): Promise<Suite[]> => {
      return await suiteService.getSuitesByWorkspace(workspaceId);
    },
    
    // Get a specific suite by type within a workspace
    suiteByType: async (
      _: any, 
      { workspaceId, type }: { workspaceId: string; type: SuiteType }
    ): Promise<Suite | null> => {
      return await suiteService.getSuiteByType(workspaceId, type);
    }
  },
  
  Mutation: {
    // Create a new suite (typically not used as suites are auto-created)
    createSuite: async (_: any, { input }: { input: CreateSuiteInput }): Promise<Suite> => {
      // Validate that this won't create duplicate suite type
      const existingSuites = await suiteService.getSuitesByWorkspace(input.workspaceId);
      const existingTypes = existingSuites.map(s => s.type);
      
      if (existingTypes.includes(input.type)) {
        throw new Error(`Suite of type ${input.type} already exists in workspace`);
      }
      
      return await suiteService.createSuite(input);
    },
    
    // Update an existing suite
    updateSuite: async (
      _: any, 
      { id, input }: { id: string; input: Partial<Suite> }
    ): Promise<Suite> => {
      const existingSuite = await suiteService.getSuite(id);
      if (!existingSuite) {
        throw new Error(`Suite ${id} not found`);
      }
      
      return await suiteService.updateSuite(id, input);
    },
    
    // Ensure all 6 suites exist for a workspace
    ensureWorkspaceSuites: async (
      _: any, 
      { workspaceId }: { workspaceId: string }
    ): Promise<Suite[]> => {
      return await suiteService.ensureAllSuites(workspaceId);
    },
    
    // Validate domain-specific data against suite ontology
    validateSuiteData: async (
      _: any,
      { suiteType, data }: { suiteType: SuiteType; data: any }
    ) => {
      const result = await suiteService.validateDomainObject(suiteType, data);
      return {
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings
      };
    }
  },
  
  // Field Resolvers for Suite type
  Suite: {
    // Resolve workspace relationship
    workspace: async (suite: Suite) => {
      // This would typically fetch from workspace service
      // For now, return basic workspace info
      return {
        id: suite.workspaceId,
        // Additional workspace fields would be resolved by workspace resolver
      };
    },
    
    // Resolve initiatives related to this suite
    initiatives: async (suite: Suite) => {
      // This will be implemented when Initiative service is created
      return [];
    },
    
    // Resolve initiative roles for this suite
    initiativeRoles: async (suite: Suite) => {
      // Query for RACI roles this suite has in various initiatives
      return [];
    },
    
    // Resolve capabilities with rich data
    capabilities: (suite: Suite) => {
      return suite.capabilities.map(capability => ({
        ...capability,
        // Add computed fields if needed
        isActive: true,
        lastUsed: null
      }));
    }
  },
  
  // Capability field resolvers
  Capability: {
    // Resolve agents that provide this capability
    agents: async (capability: any) => {
      // This will be implemented when Agent service is created
      return [];
    }
  }
};

// Type definitions for GraphQL schema (to be merged with main schema)
export const suiteTypeDefs = `
  extend type Query {
    suite(id: ID!): Suite
    suites(workspaceId: ID!): [Suite!]!
    suiteByType(workspaceId: ID!, type: SuiteType!): Suite
  }
  
  extend type Mutation {
    createSuite(input: CreateSuiteInput!): Suite!
    updateSuite(id: ID!, input: UpdateSuiteInput!): Suite!
    ensureWorkspaceSuites(workspaceId: ID!): [Suite!]!
    validateSuiteData(suiteType: SuiteType!, data: JSON!): ValidationResult!
  }
  
  input CreateSuiteInput {
    name: String!
    type: SuiteType!
    description: String
    workspaceId: ID!
  }
  
  input UpdateSuiteInput {
    name: String
    description: String
  }
  
  type ValidationResult {
    isValid: Boolean!
    errors: [String!]!
    warnings: [String!]!
  }
`;

// Utility functions for resolvers

export const suiteUtils = {
  // Check if a workspace has all required suites
  async validateWorkspaceCompleteness(workspaceId: string): Promise<{
    isComplete: boolean;
    missingSuites: SuiteType[];
    totalSuites: number;
  }> {
    const suites = await suiteService.getSuitesByWorkspace(workspaceId);
    const existingTypes = new Set(suites.map(s => s.type));
    
    const missingSuites = [
      SuiteType.PRODUCT,
      SuiteType.MARKETING, 
      SuiteType.DEVELOPMENT,
      SuiteType.OPERATIONS,
      SuiteType.STRATEGY,
      SuiteType.SALES
    ].filter(type => !existingTypes.has(type));
    
    return {
      isComplete: missingSuites.length === 0,
      missingSuites,
      totalSuites: suites.length
    };
  },
  
  // Get suite by type with error handling
  async requireSuiteByType(workspaceId: string, type: SuiteType): Promise<Suite> {
    const suite = await suiteService.getSuiteByType(workspaceId, type);
    if (!suite) {
      throw new Error(`${type} suite not found in workspace ${workspaceId}`);
    }
    return suite;
  },
  
  // Batch get suites by types
  async getSuitesByTypes(workspaceId: string, types: SuiteType[]): Promise<Suite[]> {
    const allSuites = await suiteService.getSuitesByWorkspace(workspaceId);
    const typeSet = new Set(types);
    return allSuites.filter(suite => typeSet.has(suite.type));
  }
};