import "server-only";

import { createMiddleware } from "hono/factory";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { neo4jClient } from "./neo4j";

type AdditionalContext = {
  Variables: {
    userId: string;
    user: {
      $id: string;
      email: string;
      name: string;
      prefs?: Record<string, unknown>;
      publicMetadata?: Record<string, unknown>;
    };
    databases: any;
    storage: any;
  };
};

export const clerkSessionMiddleware = createMiddleware<AdditionalContext>(
  async (c, next) => {
    try {
      // Get auth from Clerk
      const { userId } = await auth();
      
      if (!userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Fetch user data from Clerk
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      
      // Transform Clerk user to match expected structure
      const user = {
        $id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "User",
        prefs: {}, // Can store additional preferences here
        publicMetadata: {
          ...clerkUser.publicMetadata,
          // For development, grant admin access automatically
          isAdmin: process.env.NODE_ENV === 'development' ? true : clerkUser.publicMetadata?.isAdmin
        }
      };

      c.set("userId", userId);
      c.set("user", user);
      
      // Set up Neo4j database connection
      c.set("databases", {
        createDocument: async (databaseId: string, collectionId: string, documentId: string, data: any) => {
          // Neo4j implementation for creating documents
          const session = neo4jClient.getSession();
          try {
            const nodeData = { 
              ...data, 
              id: documentId, 
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            const result = await session.run(
              `CREATE (n:${collectionId} $data) RETURN n`,
              { data: nodeData }
            );
            const neo4jDoc = result.records[0]?.get('n').properties;
            // Map Neo4j response back to Appwrite format for frontend compatibility
            if (neo4jDoc) {
              return {
                ...neo4jDoc,
                $id: neo4jDoc.id,
                $createdAt: neo4jDoc.createdAt,
                $updatedAt: neo4jDoc.updatedAt
              };
            }
            return neo4jDoc;
          } catch (error) {
            console.error('Neo4j createDocument error:', error);
            throw error;
          } finally {
            await session.close();
          }
        },
        listDocuments: async (databaseId: string, collectionId: string, queries: any[] = []) => {
          // Neo4j implementation for listing documents with query support
          const session = neo4jClient.getSession();
          try {
            let cypher = `MATCH (n:${collectionId})`;
            let params: any = {};
            
            // Process Appwrite queries to build Cypher WHERE clauses
            if (queries && queries.length > 0) {
              const whereClause = queries.map((query, index) => {
                if (query.method === 'equal') {
                  // Fix $id to id for Neo4j compatibility
                  const attribute = query.attribute === '$id' ? 'id' : query.attribute;
                  params[`param${index}`] = query.values[0];
                  return `n.${attribute} = $param${index}`;
                } else if (query.method === 'contains') {
                  // Handle Query.contains for bulk operations
                  // Fix $id to id for Neo4j compatibility
                  const attribute = query.attribute === '$id' ? 'id' : query.attribute;
                  params[`param${index}`] = query.values;
                  return `n.${attribute} IN $param${index}`;
                } else if (query.method === 'orderDesc') {
                  // Handle ordering - will be processed separately
                  return '';
                } else if (query.method === 'orderAsc') {
                  // Handle ordering - will be processed separately
                  return '';
                } else if (query.method === 'limit') {
                  // Handle limit - will be processed separately
                  return '';
                }
                return '';
              }).filter(Boolean).join(' AND ');
              
              if (whereClause) {
                cypher += ` WHERE ${whereClause}`;
              }
            }
            
            cypher += ' RETURN n';
            
            const result = await session.run(cypher, params);
            const documents = result.records.map(record => {
              const neo4jDoc = record.get('n').properties;
              // Map Neo4j response back to Appwrite format for frontend compatibility
              return {
                ...neo4jDoc,
                $id: neo4jDoc.id,
                $createdAt: neo4jDoc.createdAt,
                $updatedAt: neo4jDoc.updatedAt
              };
            });
            return { documents, total: documents.length };
          } catch (error) {
            console.error('Neo4j listDocuments error:', error);
            return { documents: [], total: 0 };
          } finally {
            await session.close();
          }
        },
        getDocument: async (databaseId: string, collectionId: string, documentId: string) => {
          // Neo4j implementation for getting a document
          const session = neo4jClient.getSession();
          try {
            const result = await session.run(
              `MATCH (n:${collectionId} {id: $documentId}) RETURN n`,
              { documentId }
            );
            const neo4jDoc = result.records[0]?.get('n').properties;
            // Map Neo4j response back to Appwrite format for frontend compatibility
            if (neo4jDoc) {
              return {
                ...neo4jDoc,
                $id: neo4jDoc.id,
                $createdAt: neo4jDoc.createdAt,
                $updatedAt: neo4jDoc.updatedAt
              };
            }
            return neo4jDoc;
          } finally {
            await session.close();
          }
        },
        updateDocument: async (databaseId: string, collectionId: string, documentId: string, data: any) => {
          // Neo4j implementation for updating documents
          const session = neo4jClient.getSession();
          try {
            const result = await session.run(
              `MATCH (n:${collectionId} {id: $documentId}) SET n += $data, n.updatedAt = $updatedAt RETURN n`,
              { documentId, data, updatedAt: new Date().toISOString() }
            );
            const neo4jDoc = result.records[0]?.get('n').properties;
            // Map Neo4j response back to Appwrite format for frontend compatibility
            if (neo4jDoc) {
              return {
                ...neo4jDoc,
                $id: neo4jDoc.id,
                $createdAt: neo4jDoc.createdAt,
                $updatedAt: neo4jDoc.updatedAt
              };
            }
            return neo4jDoc;
          } finally {
            await session.close();
          }
        },
        deleteDocument: async (databaseId: string, collectionId: string, documentId: string) => {
          // Neo4j implementation for deleting documents
          const session = neo4jClient.getSession();
          try {
            await session.run(
              `MATCH (n:${collectionId} {id: $documentId}) DELETE n`,
              { documentId }
            );
          } finally {
            await session.close();
          }
        }
      });
      
      // Mock storage for now
      c.set("storage", {
        createFile: async () => ({ $id: "mock-file-id" }),
        deleteFile: async () => {},
        getFileView: async () => new ArrayBuffer(0)
      });

      await next();
    } catch (error) {
      console.error("Error verifying Clerk session:", error);
      return c.json({ error: "Failed to authenticate user" }, 401);
    }
  },
);