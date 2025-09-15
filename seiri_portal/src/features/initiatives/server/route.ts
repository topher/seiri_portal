import { z } from "zod";
import { Hono } from "hono";
import { randomUUID } from "crypto";
import { zValidator } from "@hono/zod-validator";

import { Query } from "@/lib/query-utils";

import { getMember } from "@/features/members/utils";
import { MemberRole } from "@/features/members/types";
import { TaskStatus } from "@/features/tasks/types";

import { clerkSessionMiddleware } from "@/lib/clerk-middleware";
import { DATABASE_ID, INITIATIVES_ID, MEMBERS_ID, SUITES_ID, TASKS_ID } from "@/config";
import { runQuery, runSingleQuery } from "@/lib/neo4j";
import { generateId } from "@/lib/neo4j-schema";

import { Initiative } from "../types";
import { createInitiativeSchema, updateInitiativeSchema } from "../schemas";

const app = new Hono()
  .get("/", clerkSessionMiddleware, async (c) => {
    const user = c.get("user");
    const databases = c.get("databases");
    const { suiteId, workspaceId } = c.req.query();

    let targetWorkspaceId = workspaceId;

    if (suiteId) {
      // Get suite to verify workspace access
      const suite = await databases.getDocument(DATABASE_ID, SUITES_ID, suiteId);
      targetWorkspaceId = suite.workspaceId;
    } else if (!workspaceId) {
      return c.json({ error: "Suite ID or Workspace ID is required" }, 400);
    }

    const member = await getMember({
      workspaceId: targetWorkspaceId,
      userId: user.$id,
    });

    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    let queryFilters = [Query.orderDesc("$createdAt")];
    
    if (suiteId) {
      queryFilters.push(Query.equal("suiteId", suiteId));
    } else {
      // ✅ CRITICAL FIX: Filter initiatives by workspace when no suiteId provided
      // Query Neo4j directly for workspace-specific initiatives
      const workspaceInitiatives = await runQuery(`
        MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(i:Initiative)
        RETURN i.id as id, i.name as name, i.description as description, 
               i.moscow as moscow, i.status as status, i.assigneeId as assigneeId,
               i.startDate as startDate, i.endDate as endDate,
               i.createdAt as createdAt, i.updatedAt as updatedAt,
               i.workspaceId as workspaceId
        ORDER BY i.createdAt DESC
      `, { workspaceId: targetWorkspaceId });

      if (workspaceInitiatives.length === 0) {
        // No initiatives in this workspace, return empty result
        return c.json({ 
          data: { 
            documents: [], 
            total: 0 
          } 
        });
      }

      // Convert Neo4j results to the expected format and add virtual fields
      const initiativesWithData = await Promise.all(
        workspaceInitiatives.map(async (initiative: any) => {
          const tasks = await databases.listDocuments(
            DATABASE_ID,
            TASKS_ID,
            [Query.equal("initiativeId", initiative.id)]
          );

          const completedTasks = await databases.listDocuments(
            DATABASE_ID,
            TASKS_ID,
            [
              Query.equal("initiativeId", initiative.id),
              Query.equal("status", TaskStatus.DONE)
            ]
          );

          let assignee;
          if (initiative.assigneeId) {
            try {
              const assigneeMember = await databases.getDocument(
                DATABASE_ID,
                MEMBERS_ID,
                initiative.assigneeId
              );
              assignee = {
                $id: assigneeMember.$id,
                name: assigneeMember.name,
                email: assigneeMember.email,
              };
            } catch (error) {
              // Member not found, skip assignee
              assignee = null;
            }
          }

          return {
            $id: initiative.id,
            name: initiative.name,
            description: initiative.description,
            moscow: initiative.moscow,
            status: initiative.status,
            assigneeId: initiative.assigneeId,
            startDate: initiative.startDate,
            endDate: initiative.endDate,
            workspaceId: initiative.workspaceId,
            $createdAt: initiative.createdAt,
            $updatedAt: initiative.updatedAt,
            taskCount: tasks.total,
            completedTaskCount: completedTasks.total,
            progress: tasks.total > 0 ? (completedTasks.total / tasks.total) * 100 : 0,
            assignee,
          };
        })
      );

      return c.json({ 
        data: { 
          documents: initiativesWithData, 
          total: initiativesWithData.length 
        } 
      });
    }

    const initiatives = await databases.listDocuments(
      DATABASE_ID,
      INITIATIVES_ID,
      queryFilters
    );

    // Add virtual fields for UI (task counts, progress, assignee info)
    const initiativesWithData = await Promise.all(
      initiatives.documents.map(async (initiative: Initiative) => {
        const tasks = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [Query.equal("initiativeId", initiative.$id)]
        );

        const completedTasks = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [
            Query.equal("initiativeId", initiative.$id),
            Query.equal("status", TaskStatus.DONE)
          ]
        );

        let assignee;
        if (initiative.assigneeId) {
          const assigneeMember = await databases.getDocument(
            DATABASE_ID,
            MEMBERS_ID,
            initiative.assigneeId
          );
          assignee = {
            $id: assigneeMember.$id,
            name: assigneeMember.name,
            email: assigneeMember.email,
          };
        }

        return {
          ...initiative,
          taskCount: tasks.total,
          completedTaskCount: completedTasks.total,
          progress: tasks.total > 0 ? (completedTasks.total / tasks.total) * 100 : 0,
          assignee,
        };
      })
    );

    return c.json({ 
      data: { 
        documents: initiativesWithData, 
        total: initiatives.total 
      } 
    });
  })
  .get(
    "/:initiativeId",
    clerkSessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { initiativeId } = c.req.param();

      const initiative = await databases.getDocument(
        DATABASE_ID,
        INITIATIVES_ID,
        initiativeId,
      ) as Initiative;

      // During transition, initiatives might have workspaceId directly or suiteId
      let workspaceId;
      if (initiative.suiteId) {
        // New structure: get workspace from suite
        const suite = await databases.getDocument(DATABASE_ID, SUITES_ID, initiative.suiteId);
        workspaceId = suite.workspaceId;
      } else {
        // Legacy structure: initiative has workspaceId directly (from old projects)
        workspaceId = (initiative as any).workspaceId;
      }

      if (!workspaceId) {
        return c.json({ error: "Could not determine workspace" }, 400);
      }

      const member = await getMember({
          workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      return c.json({ data: initiative });
    }
  )
  .post(
    "/",
    zValidator("json", createInitiativeSchema),
    clerkSessionMiddleware,
    async (c) => {
      const user = c.get("user");

      const { name, description, moscow, workspaceId, assigneeId, startDate, endDate } = c.req.valid("json");

      const member = await getMember({
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      try {
        // Use enhanced initiative creation with AI RACI recommendations
        const { getEnhancedInitiativeService } = await import('@/core/initiatives/enhanced-initiative.service');
        const { neo4jClient } = await import('@/lib/neo4j');
        
        const enhancedService = getEnhancedInitiativeService(neo4jClient.getDriver());

        // Determine initiative type and priority based on moscow and description
        const initiativeType = description?.toLowerCase().includes('mvp') ? 'PRODUCT_LAUNCH' :
                             description?.toLowerCase().includes('strategy') ? 'BUSINESS_MODEL' :
                             description?.toLowerCase().includes('technical') ? 'TECHNICAL' :
                             'CUSTOM';

        const priority = moscow === 'MUST' ? 'HIGH' : 
                        moscow === 'SHOULD' ? 'MEDIUM' : 'LOW';

        const result = await enhancedService.createInitiativeWithAIRACI({
          name,
          description: description || '',
          workspaceId,
          priority,
          initiativeType,
          assigneeId,
          startDate,
          endDate,
          autoGenerateRACI: true // Enable AI RACI generation
        });

        console.log('Enhanced initiative creation result:', {
          status: result.status,
          raciGenerated: !!result.raciAssignment,
          warnings: result.warnings?.length || 0
        });

        if (result.status === 'ERROR') {
          return c.json({ 
            error: "Failed to create initiative", 
            details: result.errors 
          }, 500);
        }

        // Format response with RACI information
        const responseData = {
          $id: result.initiative.id,
          ...result.initiative,
          moscow, // Include original moscow value for compatibility
          status: TaskStatus.BACKLOG,
          // Add RACI information to response
          raciAssignment: result.raciAssignment ? {
            responsible: result.raciAssignment.responsible,
            accountable: result.raciAssignment.accountable,
            consulted: result.raciAssignment.consulted,
            informed: result.raciAssignment.informed,
            confidence: result.raciAssignment.confidence,
            method: result.raciAssignment.method
          } : null,
          // Include any warnings or success info
          meta: {
            raciGenerated: !!result.raciAssignment,
            warnings: result.warnings,
            enhancedCreation: true
          }
        };

        return c.json({ 
          data: responseData,
          message: result.raciAssignment ? 
            `Initiative created with AI-generated RACI assignment (${result.raciAssignment.confidence}% confidence)` :
            'Initiative created successfully'
        });

      } catch (error) {
        console.error('Enhanced initiative creation failed, falling back to basic creation:', error);
        
        // Fallback to basic creation if enhanced fails
        const initiativeId = generateId();
        const now = new Date().toISOString();

        const result = await runQuery(`
          MATCH (w:Workspace {id: $workspaceId})
          CREATE (i:Initiative {
            id: $initiativeId,
            name: $name,
            description: $description,
            moscow: $moscow,
            status: $status,
            workspaceId: $workspaceId,
            assigneeId: $assigneeId,
            startDate: $startDate,
            endDate: $endDate,
            createdAt: $createdAt,
            updatedAt: $updatedAt
          })
          CREATE (w)-[:CONTAINS]->(i)
          RETURN i
        `, {
          workspaceId,
          initiativeId,
          name,
          description: description || null,
          moscow,
          status: TaskStatus.BACKLOG,
          assigneeId: assigneeId || null,
          startDate: startDate || null,
          endDate: endDate || null,
          createdAt: now,
          updatedAt: now
        });

        const initiative = result.length > 0 ? {
          $id: initiativeId,
          ...result[0].i,
          meta: {
            raciGenerated: false,
            enhancedCreation: false,
            fallback: true
          }
        } : null;

        if (!initiative) {
          return c.json({ error: "Failed to create initiative" }, 500);
        }

        return c.json({ 
          data: initiative,
          message: 'Initiative created (basic mode - RACI enhancement unavailable)'
        });
      }
    }
  )
  .patch(
    "/:initiativeId",
    clerkSessionMiddleware,
    zValidator("json", updateInitiativeSchema),
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");

      const { initiativeId } = c.req.param();
      const { name, description, moscow, status, assigneeId, startDate, endDate } = c.req.valid("json");

      const existingInitiative = await databases.getDocument(
        DATABASE_ID,
        INITIATIVES_ID,
        initiativeId,
      ) as Initiative;

      // Get workspace ID from the suite
      let workspaceId;
      const suite = await databases.getDocument(DATABASE_ID, SUITES_ID, existingInitiative.suiteId);
      workspaceId = suite.workspaceId;

      if (!workspaceId) {
        return c.json({ error: "Could not determine workspace" }, 400);
      }

      const member = await getMember({
          workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const initiative = await databases.updateDocument(
        DATABASE_ID,
        INITIATIVES_ID,
        initiativeId,
        {
          name,
          description,
          moscow,
          status,
          assigneeId,
          startDate,
          endDate,
        }
      );

      return c.json({ data: initiative });
    }
  )
  .delete(
    "/:initiativeId",
    clerkSessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");

      const { initiativeId } = c.req.param();

      const initiative = await databases.getDocument(
        DATABASE_ID,
        INITIATIVES_ID,
        initiativeId,
      ) as Initiative;

      // During transition, initiatives might have workspaceId directly or suiteId
      let workspaceId;
      if (initiative.suiteId) {
        // New structure: get workspace from suite
        const suite = await databases.getDocument(DATABASE_ID, SUITES_ID, initiative.suiteId);
        workspaceId = suite.workspaceId;
      } else {
        // Legacy structure: initiative has workspaceId directly (from old projects)
        workspaceId = (initiative as any).workspaceId;
      }

      if (!workspaceId) {
        return c.json({ error: "Could not determine workspace" }, 400);
      }

      const member = await getMember({
          workspaceId,
        userId: user.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // TODO: Delete associated tasks

      await databases.deleteDocument(
        DATABASE_ID,
        INITIATIVES_ID,
        initiativeId,
      );

      return c.json({ data: { $id: initiativeId } });
    }
  );

export default app;