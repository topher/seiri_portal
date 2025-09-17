import "server-only";

import { runQuery, runSingleQuery } from "@/lib/neo4j";
import { contextEngine } from "@/agents/context-engine";

// GraphQL resolver context
export interface GraphQLContext {
  userId?: string;
  user?: any;
}

// Date scalar resolver
const DateTimeResolver = {
  serialize: (date: Date) => date.toISOString(),
  parseValue: (value: string) => new Date(value),
  parseLiteral: (ast: any) => new Date(ast.value)
};

// JSON scalar resolver
const JSONResolver = {
  serialize: (value: any) => value,
  parseValue: (value: any) => value,
  parseLiteral: (ast: any) => ast.value
};

export const resolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,

  Query: {
    me: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.userId) {
        throw new Error('Not authenticated');
      }

      const query = `
        MATCH (user:User {id: $userId})
        RETURN user
      `;
      
      const result = await runSingleQuery(query, { userId: context.userId });
      return result?.user;
    },

    workspaces: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.userId) {
        throw new Error('Not authenticated');
      }

      const query = `
        MATCH (user:User {clerkId: $userId})-[:MEMBER_OF]->(workspace:Workspace)
        RETURN workspace
        ORDER BY workspace.createdAt DESC
      `;
      
      const results = await runQuery(query, { userId: context.userId });
      return results.map(r => r.workspace);
    },

    workspace: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new Error('Not authenticated');
      }

      const query = `
        MATCH (user:User {clerkId: $userId})-[:MEMBER_OF]->(workspace:Workspace {id: $id})
        RETURN workspace
      `;
      
      const result = await runSingleQuery(query, { id, userId: context.userId });
      return result?.workspace;
    },

    suite: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new Error('Not authenticated');
      }

      const query = `
        MATCH (user:User {clerkId: $userId})-[:MEMBER_OF]->(workspace:Workspace)-[:HAS_SUITE]->(suite:Suite {id: $id})
        RETURN suite
      `;
      
      const result = await runSingleQuery(query, { id, userId: context.userId });
      return result?.suite;
    },

    initiative: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new Error('Not authenticated');
      }

      const query = `
        MATCH (user:User {clerkId: $userId})-[:MEMBER_OF]->(workspace:Workspace)-[:HAS_INITIATIVE]->(initiative:Initiative {id: $id})
        RETURN initiative
      `;
      
      const result = await runSingleQuery(query, { id, userId: context.userId });
      return result?.initiative;
    },

    task: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new Error('Not authenticated');
      }

      const query = `
        MATCH (user:User {clerkId: $userId})-[:MEMBER_OF]->(workspace:Workspace)
        MATCH (workspace)-[:HAS_INITIATIVE]->(initiative:Initiative)-[:HAS]->(task:Task {id: $id})
        RETURN task
      `;
      
      const result = await runSingleQuery(query, { id, userId: context.userId });
      return result?.task;
    },

    acceptanceCriterion: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new Error('Not authenticated');
      }

      const query = `
        MATCH (user:User {clerkId: $userId})-[:MEMBER_OF]->(workspace:Workspace)
        MATCH (workspace)-[:HAS_INITIATIVE]->(initiative:Initiative)-[:HAS]->(task:Task)-[:HAS]->(ac:AcceptanceCriterion {id: $id})
        RETURN ac
      `;
      
      const result = await runSingleQuery(query, { id, userId: context.userId });
      return result?.ac;
    }
  },

  Mutation: {
    _placeholder: () => "Placeholder mutation - agent operations will be implemented in later prompts"
  },

  Subscription: {
    _placeholder: () => "Placeholder subscription - agent subscriptions will be implemented in later prompts"
  },

  // Field resolvers for relationships
  User: {
    workspaces: async (parent: any, _: any, context: GraphQLContext) => {
      const query = `
        MATCH (user:User {id: $userId})-[:MEMBER_OF]->(workspace:Workspace)
        RETURN workspace
        ORDER BY workspace.createdAt DESC
      `;
      
      const results = await runQuery(query, { userId: parent.id });
      return results.map(r => r.workspace);
    }
  },

  Workspace: {
    suites: async (parent: any) => {
      const query = `
        MATCH (workspace:Workspace {id: $workspaceId})-[:HAS_SUITE]->(suite:Suite)
        RETURN suite
        ORDER BY suite.name
      `;
      
      const results = await runQuery(query, { workspaceId: parent.id });
      return results.map(r => r.suite);
    },

    initiatives: async (parent: any) => {
      const query = `
        MATCH (workspace:Workspace {id: $workspaceId})-[:HAS_INITIATIVE]->(initiative:Initiative)
        RETURN initiative
        ORDER BY initiative.createdAt DESC
      `;
      
      const results = await runQuery(query, { workspaceId: parent.id });
      return results.map(r => r.initiative);
    },

    members: async (parent: any) => {
      const query = `
        MATCH (workspace:Workspace {id: $workspaceId})<-[:MEMBER_OF]-(user:User)
        RETURN user
        ORDER BY user.name
      `;
      
      const results = await runQuery(query, { workspaceId: parent.id });
      return results.map(r => ({
        id: `member_${r.user.id}_${parent.id}`,
        role: 'MEMBER',
        user: r.user,
        workspace: parent,
        createdAt: r.user.createdAt
      }));
    }
  },

  Suite: {
    workspace: async (parent: any) => {
      const query = `
        MATCH (workspace:Workspace)-[:HAS_SUITE]->(suite:Suite {id: $suiteId})
        RETURN workspace
      `;
      
      const result = await runSingleQuery(query, { suiteId: parent.id });
      return result?.workspace;
    },

    initiatives: async (parent: any) => {
      const query = `
        MATCH (initiative:Initiative {suiteId: $suiteId})
        RETURN initiative
        ORDER BY initiative.createdAt DESC
      `;
      
      const results = await runQuery(query, { suiteId: parent.id });
      return results.map(r => r.initiative);
    }
  },

  Initiative: {
    workspace: async (parent: any) => {
      const query = `
        MATCH (workspace:Workspace)-[:HAS_INITIATIVE]->(initiative:Initiative {id: $initiativeId})
        RETURN workspace
      `;
      
      const result = await runSingleQuery(query, { initiativeId: parent.id });
      return result?.workspace;
    },

    suite: async (parent: any) => {
      const query = `
        MATCH (suite:Suite {id: $suiteId})
        RETURN suite
      `;
      
      const result = await runSingleQuery(query, { suiteId: parent.suiteId });
      return result?.suite;
    },

    tasks: async (parent: any) => {
      const query = `
        MATCH (initiative:Initiative {id: $initiativeId})-[:HAS]->(task:Task)
        RETURN task
        ORDER BY task.priority DESC, task.createdAt
      `;
      
      const results = await runQuery(query, { initiativeId: parent.id });
      return results.map(r => r.task);
    }
  },

  Task: {
    initiative: async (parent: any) => {
      const query = `
        MATCH (initiative:Initiative)-[:HAS]->(task:Task {id: $taskId})
        RETURN initiative
      `;
      
      const result = await runSingleQuery(query, { taskId: parent.id });
      return result?.initiative;
    },

    assignee: async (parent: any) => {
      const query = `
        MATCH (task:Task {id: $taskId})
        OPTIONAL MATCH (task)-[:ASSIGNED_TO]->(user:User)
        RETURN user
      `;
      
      const result = await runSingleQuery(query, { taskId: parent.id });
      return result?.user;
    },

    acceptanceCriteria: async (parent: any) => {
      const query = `
        MATCH (task:Task {id: $taskId})-[:HAS]->(ac:AcceptanceCriterion)
        RETURN ac
        ORDER BY ac.order
      `;
      
      const results = await runQuery(query, { taskId: parent.id });
      return results.map(r => r.ac);
    }
  },

  AcceptanceCriterion: {
    task: async (parent: any) => {
      const query = `
        MATCH (task:Task)-[:HAS]->(ac:AcceptanceCriterion {id: $acId})
        RETURN task
      `;
      
      const result = await runSingleQuery(query, { acId: parent.id });
      return result?.task;
    }
  },

  WorkspaceMember: {
    user: async (parent: any) => {
      // User should already be resolved in the parent query
      return parent.user;
    },
    workspace: async (parent: any) => {
      // Workspace should already be resolved in the parent query
      return parent.workspace;
    }
  }
};