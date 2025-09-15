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
        MATCH (user:User {id: $userId})
        MATCH (user)-[:BELONGS_TO]->(member:WorkspaceMember)
        MATCH (member)-[:MEMBER_OF]->(workspace:WORKSPACE)
        RETURN workspace
        ORDER BY workspace.name
      `;
      
      const results = await runQuery(query, { userId: context.userId });
      return results.map(r => r.workspace);
    },

    workspace: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.userId) {
        throw new Error('Not authenticated');
      }

      const query = `
        MATCH (workspace:WORKSPACE {id: $id})
        MATCH (workspace)-[:HAS_MEMBER]->(member:WorkspaceMember)-[:BELONGS_TO]->(user:User {id: $userId})
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
        MATCH (suite:SUITE {id: $id})
        MATCH (workspace:WORKSPACE)-[:CONTAINS]->(suite)
        MATCH (workspace)-[:HAS_MEMBER]->(member:WorkspaceMember)-[:BELONGS_TO]->(user:User {id: $userId})
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
        MATCH (initiative:INITIATIVE {id: $id})
        MATCH (workspace:WORKSPACE)-[:CONTAINS*]->(initiative)
        MATCH (workspace)-[:HAS_MEMBER]->(member:WorkspaceMember)-[:BELONGS_TO]->(user:User {id: $userId})
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
        MATCH (task:TASK {id: $id})
        MATCH (workspace:WORKSPACE)-[:CONTAINS*]->(task)
        MATCH (workspace)-[:HAS_MEMBER]->(member:WorkspaceMember)-[:BELONGS_TO]->(user:User {id: $userId})
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
        MATCH (ac:ACCEPTANCE_CRITERION {id: $id})
        MATCH (workspace:WORKSPACE)-[:CONTAINS*]->(ac)
        MATCH (workspace)-[:HAS_MEMBER]->(member:WorkspaceMember)-[:BELONGS_TO]->(user:User {id: $userId})
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
        MATCH (user:User {id: $userId})
        MATCH (user)-[:BELONGS_TO]->(member:WorkspaceMember)
        MATCH (member)-[:MEMBER_OF]->(workspace:WORKSPACE)
        RETURN workspace
        ORDER BY workspace.name
      `;
      
      const results = await runQuery(query, { userId: parent.id });
      return results.map(r => r.workspace);
    }
  },

  Workspace: {
    suites: async (parent: any) => {
      const query = `
        MATCH (workspace:WORKSPACE {id: $workspaceId})
        MATCH (workspace)-[:CONTAINS]->(suite:SUITE)
        RETURN suite
        ORDER BY suite.name
      `;
      
      const results = await runQuery(query, { workspaceId: parent.id });
      return results.map(r => r.suite);
    },

    initiatives: async (parent: any) => {
      const query = `
        MATCH (workspace:WORKSPACE {id: $workspaceId})
        MATCH (workspace)-[:CONTAINS]->(initiative:INITIATIVE)
        RETURN initiative
        ORDER BY initiative.name
      `;
      
      const results = await runQuery(query, { workspaceId: parent.id });
      return results.map(r => r.initiative);
    },

    members: async (parent: any) => {
      const query = `
        MATCH (workspace:WORKSPACE {id: $workspaceId})
        MATCH (workspace)-[:HAS_MEMBER]->(member:WorkspaceMember)
        MATCH (member)-[:BELONGS_TO]->(user:User)
        RETURN member, user
        ORDER BY user.name
      `;
      
      const results = await runQuery(query, { workspaceId: parent.id });
      return results.map(r => ({
        ...r.member,
        user: r.user,
        workspace: parent
      }));
    }
  },

  Suite: {
    workspace: async (parent: any) => {
      const query = `
        MATCH (suite:SUITE {id: $suiteId})
        MATCH (workspace:WORKSPACE)-[:CONTAINS]->(suite)
        RETURN workspace
      `;
      
      const result = await runSingleQuery(query, { suiteId: parent.id });
      return result?.workspace;
    },

    initiatives: async (parent: any) => {
      const query = `
        MATCH (suite:SUITE {id: $suiteId})
        MATCH (suite)-[:CONTAINS]->(initiative:INITIATIVE)
        RETURN initiative
        ORDER BY initiative.name
      `;
      
      const results = await runQuery(query, { suiteId: parent.id });
      return results.map(r => r.initiative);
    }
  },

  Initiative: {
    workspace: async (parent: any) => {
      const query = `
        MATCH (initiative:INITIATIVE {id: $initiativeId})
        MATCH (workspace:WORKSPACE)-[:CONTAINS*]->(initiative)
        RETURN workspace
      `;
      
      const result = await runSingleQuery(query, { initiativeId: parent.id });
      return result?.workspace;
    },

    suite: async (parent: any) => {
      const query = `
        MATCH (initiative:INITIATIVE {id: $initiativeId})
        OPTIONAL MATCH (suite:SUITE)-[:CONTAINS]->(initiative)
        RETURN suite
      `;
      
      const result = await runSingleQuery(query, { initiativeId: parent.id });
      return result?.suite;
    },

    tasks: async (parent: any) => {
      const query = `
        MATCH (initiative:INITIATIVE {id: $initiativeId})
        MATCH (initiative)-[:HAS]->(task:TASK)
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
        MATCH (task:TASK {id: $taskId})
        MATCH (initiative:INITIATIVE)-[:HAS]->(task)
        RETURN initiative
      `;
      
      const result = await runSingleQuery(query, { taskId: parent.id });
      return result?.initiative;
    },

    assignee: async (parent: any) => {
      const query = `
        MATCH (task:TASK {id: $taskId})
        OPTIONAL MATCH (task)-[:ASSIGNED_TO]->(user:User)
        RETURN user
      `;
      
      const result = await runSingleQuery(query, { taskId: parent.id });
      return result?.user;
    },

    acceptanceCriteria: async (parent: any) => {
      const query = `
        MATCH (task:TASK {id: $taskId})
        MATCH (task)-[:HAS]->(ac:ACCEPTANCE_CRITERION)
        RETURN ac
        ORDER BY ac.createdAt
      `;
      
      const results = await runQuery(query, { taskId: parent.id });
      return results.map(r => r.ac);
    }
  },

  AcceptanceCriterion: {
    task: async (parent: any) => {
      const query = `
        MATCH (ac:ACCEPTANCE_CRITERION {id: $acId})
        MATCH (task:TASK)-[:HAS]->(ac)
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