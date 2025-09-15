import "server-only";

import { neo4jClient, runQuery, runSingleQuery } from "@/lib/neo4j";

// Types for the Context Engine
export interface AgentContext {
  user: {
    id: string;
    email?: string;
    name?: string;
  };
  workspace: WorkspaceContext;
  currentNode: NodeContext;
  nodeType: NodeType;
  hierarchy: HierarchyContext;
  permissions: PermissionContext;
  recentActivity: ActivityContext[];
  metadata: {
    timestamp: Date;
    requestId: string;
  };
}

export interface WorkspaceContext {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  userRole: string;
}

export interface NodeContext {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export interface HierarchyContext {
  parents: NodeContext[];
  children: NodeContext[];
  dependencies: DependencyContext[];
  siblings: NodeContext[];
}

export interface DependencyContext {
  id: string;
  type: string;
  description?: string;
  target: NodeContext;
}

export interface PermissionContext {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManage: boolean;
  workspaceRole: string;
}

export interface ActivityContext {
  action: string;
  timestamp: Date;
  details?: string;
}

export type NodeType = 'WORKSPACE' | 'SUITE' | 'INITIATIVE' | 'TASK' | 'ACCEPTANCE_CRITERION';

// Simple in-memory cache for contexts (production should use Redis)
class ContextCache {
  private cache = new Map<string, { data: AgentContext; expires: number }>();

  set(key: string, value: AgentContext, ttlSeconds: number = 300): void {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data: value, expires });
  }

  get(key: string): AgentContext | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    this.cache.forEach((entry, key) => {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    });
  }
}

export class ContextEngine {
  private cache = new ContextCache();

  constructor() {
    // Clean cache every 5 minutes
    setInterval(() => this.cache.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Build comprehensive context for an agent interaction
   */
  async buildContext(
    nodeId: string,
    nodeType: NodeType,
    userId: string
  ): Promise<AgentContext> {
    // Check cache first
    const cacheKey = `context:${nodeId}:${userId}:${nodeType}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Build fresh context
    const [currentNode, workspace, hierarchy, permissions, recentActivity] = await Promise.all([
      this.getCurrentNode(nodeId, nodeType),
      this.getWorkspaceContext(nodeId, nodeType, userId),
      this.getHierarchyContext(nodeId, nodeType),
      this.getPermissions(userId, nodeId, nodeType),
      this.getRecentActivity(userId, nodeId)
    ]);

    const context: AgentContext = {
      user: await this.getUserContext(userId),
      workspace,
      currentNode,
      nodeType,
      hierarchy,
      permissions,
      recentActivity,
      metadata: {
        timestamp: new Date(),
        requestId: this.generateRequestId()
      }
    };

    // Cache for 5 minutes
    this.cache.set(cacheKey, context, 300);
    
    return context;
  }

  /**
   * Get the current node's details
   */
  private async getCurrentNode(nodeId: string, nodeType: NodeType): Promise<NodeContext> {
    const query = `
      MATCH (node:${nodeType} {id: $nodeId})
      RETURN node
    `;
    
    const result = await runSingleQuery(query, { nodeId });
    if (!result?.node) {
      throw new Error(`${nodeType} with id ${nodeId} not found`);
    }

    const node = result.node;
    return {
      id: node.id,
      type: nodeType,
      name: node.name || node.title,
      description: node.description,
      status: node.status,
      priority: node.priority,
      createdAt: new Date(node.createdAt),
      updatedAt: new Date(node.updatedAt),
      ...node
    };
  }

  /**
   * Get workspace context for the current node
   */
  private async getWorkspaceContext(
    nodeId: string,
    nodeType: NodeType,
    userId: string
  ): Promise<WorkspaceContext> {
    let query: string;
    
    if (nodeType === 'WORKSPACE') {
      query = `
        MATCH (workspace:WORKSPACE {id: $nodeId})
        MATCH (workspace)-[:HAS_MEMBER]->(member:WorkspaceMember)-[:BELONGS_TO]->(user:User {id: $userId})
        OPTIONAL MATCH (workspace)-[:HAS_MEMBER]->(allMembers:WorkspaceMember)
        RETURN workspace, member.role as userRole, count(allMembers) as memberCount
      `;
    } else {
      query = `
        MATCH (node:${nodeType} {id: $nodeId})
        MATCH (workspace:WORKSPACE)-[:CONTAINS*]->(node)
        MATCH (workspace)-[:HAS_MEMBER]->(member:WorkspaceMember)-[:BELONGS_TO]->(user:User {id: $userId})
        OPTIONAL MATCH (workspace)-[:HAS_MEMBER]->(allMembers:WorkspaceMember)
        RETURN workspace, member.role as userRole, count(allMembers) as memberCount
      `;
    }

    const result = await runSingleQuery(query, { nodeId, userId });
    if (!result?.workspace) {
      throw new Error(`Workspace not found for ${nodeType} ${nodeId}`);
    }

    const workspace = result.workspace;
    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      memberCount: result.memberCount || 0,
      userRole: result.userRole || 'MEMBER'
    };
  }

  /**
   * Get hierarchy context (parents, children, dependencies, siblings)
   */
  private async getHierarchyContext(nodeId: string, nodeType: NodeType): Promise<HierarchyContext> {
    const queries = this.getHierarchyQueries(nodeType);
    
    const [parents, children, dependencies, siblings] = await Promise.all([
      runQuery(queries.parents, { nodeId }),
      runQuery(queries.children, { nodeId }),
      runQuery(queries.dependencies, { nodeId }),
      runQuery(queries.siblings, { nodeId })
    ]);

    return {
      parents: parents.map(p => this.mapToNodeContext(p.parent, p.parentType)),
      children: children.map(c => this.mapToNodeContext(c.child, c.childType)),
      dependencies: dependencies.map(d => ({
        id: d.dep.id,
        type: d.depType || 'BLOCKS',
        description: d.dep.description,
        target: this.mapToNodeContext(d.target, d.targetType)
      })),
      siblings: siblings.map(s => this.mapToNodeContext(s.sibling, s.siblingType))
    };
  }

  /**
   * Get queries for different node types to fetch hierarchy
   */
  private getHierarchyQueries(nodeType: NodeType) {
    const baseQueries = {
      parents: '',
      children: '',
      dependencies: `
        MATCH (node:${nodeType} {id: $nodeId})
        OPTIONAL MATCH (node)-[dep:DEPENDS_ON]->(target)
        RETURN dep, target, labels(target)[0] as targetType
      `,
      siblings: ''
    };

    switch (nodeType) {
      case 'WORKSPACE':
        return {
          ...baseQueries,
          parents: `MATCH (node:${nodeType} {id: $nodeId}) RETURN null as parent, null as parentType LIMIT 0`,
          children: `
            MATCH (node:${nodeType} {id: $nodeId})
            OPTIONAL MATCH (node)-[:CONTAINS]->(child)
            WHERE child:SUITE OR child:INITIATIVE
            RETURN child, labels(child)[0] as childType
          `,
          siblings: `MATCH (node:${nodeType} {id: $nodeId}) RETURN null as sibling, null as siblingType LIMIT 0`
        };
      
      case 'SUITE':
        return {
          ...baseQueries,
          parents: `
            MATCH (node:${nodeType} {id: $nodeId})
            MATCH (parent:WORKSPACE)-[:CONTAINS]->(node)
            RETURN parent, 'WORKSPACE' as parentType
          `,
          children: `
            MATCH (node:${nodeType} {id: $nodeId})
            OPTIONAL MATCH (node)-[:CONTAINS]->(child:INITIATIVE)
            RETURN child, 'INITIATIVE' as childType
          `,
          siblings: `
            MATCH (node:${nodeType} {id: $nodeId})
            MATCH (workspace:WORKSPACE)-[:CONTAINS]->(node)
            MATCH (workspace)-[:CONTAINS]->(sibling:SUITE)
            WHERE sibling.id <> $nodeId
            RETURN sibling, 'SUITE' as siblingType
          `
        };
      
      case 'INITIATIVE':
        return {
          ...baseQueries,
          parents: `
            MATCH (node:${nodeType} {id: $nodeId})
            OPTIONAL MATCH (suite:SUITE)-[:CONTAINS]->(node)
            OPTIONAL MATCH (workspace:WORKSPACE)-[:CONTAINS]->(node)
            RETURN coalesce(suite, workspace) as parent, 
                   CASE WHEN suite IS NOT NULL THEN 'SUITE' ELSE 'WORKSPACE' END as parentType
          `,
          children: `
            MATCH (node:${nodeType} {id: $nodeId})
            OPTIONAL MATCH (node)-[:HAS]->(child:TASK)
            RETURN child, 'TASK' as childType
          `,
          siblings: `
            MATCH (node:${nodeType} {id: $nodeId})
            OPTIONAL MATCH (suite:SUITE)-[:CONTAINS]->(node)
            OPTIONAL MATCH (workspace:WORKSPACE)-[:CONTAINS]->(node)
            WITH coalesce(suite, workspace) as parent, node
            MATCH (parent)-[:CONTAINS|HAS]->(sibling:INITIATIVE)
            WHERE sibling.id <> $nodeId
            RETURN sibling, 'INITIATIVE' as siblingType
          `
        };
      
      case 'TASK':
        return {
          ...baseQueries,
          parents: `
            MATCH (node:${nodeType} {id: $nodeId})
            MATCH (parent:INITIATIVE)-[:HAS]->(node)
            RETURN parent, 'INITIATIVE' as parentType
          `,
          children: `
            MATCH (node:${nodeType} {id: $nodeId})
            OPTIONAL MATCH (node)-[:HAS]->(child:ACCEPTANCE_CRITERION)
            RETURN child, 'ACCEPTANCE_CRITERION' as childType
          `,
          siblings: `
            MATCH (node:${nodeType} {id: $nodeId})
            MATCH (initiative:INITIATIVE)-[:HAS]->(node)
            MATCH (initiative)-[:HAS]->(sibling:TASK)
            WHERE sibling.id <> $nodeId
            RETURN sibling, 'TASK' as siblingType
          `
        };
      
      case 'ACCEPTANCE_CRITERION':
        return {
          ...baseQueries,
          parents: `
            MATCH (node:${nodeType} {id: $nodeId})
            MATCH (parent:TASK)-[:HAS]->(node)
            RETURN parent, 'TASK' as parentType
          `,
          children: `MATCH (node:${nodeType} {id: $nodeId}) RETURN null as child, null as childType LIMIT 0`,
          siblings: `
            MATCH (node:${nodeType} {id: $nodeId})
            MATCH (task:TASK)-[:HAS]->(node)
            MATCH (task)-[:HAS]->(sibling:ACCEPTANCE_CRITERION)
            WHERE sibling.id <> $nodeId
            RETURN sibling, 'ACCEPTANCE_CRITERION' as siblingType
          `
        };
      
      default:
        return baseQueries;
    }
  }

  /**
   * Map Neo4j node to NodeContext
   */
  private mapToNodeContext(node: any, nodeType: string): NodeContext {
    if (!node) return {} as NodeContext;
    
    return {
      id: node.id,
      type: nodeType as NodeType,
      name: node.name || node.title,
      description: node.description,
      status: node.status,
      priority: node.priority,
      createdAt: new Date(node.createdAt || Date.now()),
      updatedAt: new Date(node.updatedAt || Date.now()),
      ...node
    };
  }

  /**
   * Get user permissions for the node
   */
  private async getPermissions(
    userId: string,
    nodeId: string,
    nodeType: NodeType
  ): Promise<PermissionContext> {
    // Get workspace role first
    const workspaceQuery = nodeType === 'WORKSPACE' 
      ? `
        MATCH (workspace:WORKSPACE {id: $nodeId})
        MATCH (workspace)-[:HAS_MEMBER]->(member:WorkspaceMember)-[:BELONGS_TO]->(user:User {id: $userId})
        RETURN member.role as role
      `
      : `
        MATCH (node:${nodeType} {id: $nodeId})
        MATCH (workspace:WORKSPACE)-[:CONTAINS*]->(node)
        MATCH (workspace)-[:HAS_MEMBER]->(member:WorkspaceMember)-[:BELONGS_TO]->(user:User {id: $userId})
        RETURN member.role as role
      `;

    const result = await runSingleQuery(workspaceQuery, { nodeId, userId });
    const role = result?.role || 'VIEWER';

    // Define permissions based on role
    const permissions: Record<string, PermissionContext> = {
      OWNER: { canRead: true, canWrite: true, canDelete: true, canManage: true, workspaceRole: 'OWNER' },
      ADMIN: { canRead: true, canWrite: true, canDelete: true, canManage: false, workspaceRole: 'ADMIN' },
      MEMBER: { canRead: true, canWrite: true, canDelete: false, canManage: false, workspaceRole: 'MEMBER' },
      VIEWER: { canRead: true, canWrite: false, canDelete: false, canManage: false, workspaceRole: 'VIEWER' }
    };

    return permissions[role] || permissions.VIEWER;
  }

  /**
   * Get recent user activity on this node
   */
  private async getRecentActivity(userId: string, nodeId: string): Promise<ActivityContext[]> {
    // For now, return empty array - this would be implemented with activity tracking
    // TODO: Implement activity tracking in the database
    return [];
  }

  /**
   * Get user context
   */
  private async getUserContext(userId: string): Promise<AgentContext['user']> {
    const query = `
      MATCH (user:User {id: $userId})
      RETURN user
    `;
    
    const result = await runSingleQuery(query, { userId });
    const user = result?.user;
    
    return {
      id: userId,
      email: user?.email,
      name: user?.name
    };
  }

  /**
   * Generate a unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const contextEngine = new ContextEngine();