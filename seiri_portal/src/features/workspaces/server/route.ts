import { z } from "zod";
import { Hono } from "hono";
import { randomUUID } from "crypto";
import { zValidator } from "@hono/zod-validator";
// @ts-ignore
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

import { Query } from "@/lib/query-utils";
import { getMember } from "@/features/members/utils";
import { MemberRole } from "@/features/members/types";
import { TaskStatus } from "@/features/tasks/types";

import { generateInviteCode } from "@/lib/utils";
import { clerkSessionMiddleware } from "@/lib/clerk-middleware";
import { DATABASE_ID, IMAGES_BUCKET_ID, TASKS_ID, WORKSPACES_ID, MEMBERS_ID } from "@/config";
import { createDefaultSuites } from "@/features/suites/utils/default-suites";
import { runQuery, runSingleQuery } from "@/lib/neo4j";
import { generateId } from "@/lib/neo4j-schema";

import { Workspace } from "../types";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../schemas";

const app = new Hono()
  .get("/", clerkSessionMiddleware, async (c) => {
    const user = c.get("user");

    // Get workspaces where user is a member
    const workspaces = await runQuery(`
      MATCH (m:Member {userId: $userId})-[:MEMBER_OF]->(w:Workspace)
      RETURN w
      ORDER BY w.createdAt DESC
    `, { userId: user.$id });

    return c.json({ 
      data: { 
        documents: workspaces.map(result => ({ $id: result.w.id, ...result.w })), 
        total: workspaces.length 
      } 
    });
  })
  .get(
    "/:workspaceId",
    clerkSessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const { workspaceId } = c.req.param();

      // Check if user is member and get workspace
      const result = await runSingleQuery(`
        MATCH (m:Member {userId: $userId, workspaceId: $workspaceId})-[:MEMBER_OF]->(w:Workspace {id: $workspaceId})
        RETURN w, m
      `, { userId: user.$id, workspaceId });

      if (!result) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const workspace = { $id: workspaceId, ...result.w };

      return c.json({ data: workspace });
    }
  )
  .get(
    "/:workspaceId/info",
    clerkSessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const { workspaceId } = c.req.param();

      const workspace = await databases.getDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId,
      ) as Workspace;

      return c.json({ 
        data: { 
          $id: (workspace as any).$id, 
          name: workspace.name, 
          imageUrl: workspace.imageUrl
        } 
      });
    }
  )
  .post(
    "/",
    zValidator("form", createWorkspaceSchema),
    clerkSessionMiddleware,
    async (c) => {
      const storage = c.get("storage");
      const user = c.get("user");

      const { name, image } = c.req.valid("form");

      let uploadedImageUrl: string | undefined;

      if (image instanceof File) {
        const file = await storage.createFile(
          IMAGES_BUCKET_ID,
          randomUUID(),
          image,
        );

        const arrayBuffer = await storage.getFileView(
          IMAGES_BUCKET_ID,
          file.$id,
        );

        uploadedImageUrl = `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
      }

      const workspaceId = generateId();
      const memberId = generateId();
      const now = new Date().toISOString();
      const inviteCode = generateInviteCode(6);

      // Create workspace and admin member in Neo4j
      const result = await runQuery(`
        CREATE (w:Workspace {
          id: $workspaceId,
          name: $name,
          userId: $userId,
          imageUrl: $imageUrl,
          inviteCode: $inviteCode,
          createdAt: $createdAt,
          updatedAt: $updatedAt
        })
        CREATE (m:Member {
          id: $memberId,
          userId: $userId,
          workspaceId: $workspaceId,
          role: $role,
          createdAt: $createdAt,
          updatedAt: $updatedAt
        })
        CREATE (m)-[:MEMBER_OF]->(w)
        RETURN w
      `, {
        workspaceId,
        memberId,
        name,
        userId: user.$id,
        imageUrl: uploadedImageUrl || null,
        inviteCode,
        role: MemberRole.ADMIN,
        createdAt: now,
        updatedAt: now
      });

      const workspace = result.length > 0 ? {
        $id: workspaceId,
        ...result[0].w
      } : null;

      if (!workspace) {
        return c.json({ error: "Failed to create workspace" }, 500);
      }

      // Create default suites for the new workspace
      try {
        await createDefaultSuites(workspaceId);
      } catch (error) {
        console.error("Failed to create default suites:", error);
        // Don't fail workspace creation if default suites fail
      }

      return c.json({ data: workspace });
    }
  )
  .patch(
    "/:workspaceId",
    clerkSessionMiddleware,
    zValidator("form", updateWorkspaceSchema),
    async (c) => {
      const storage = c.get("storage");
      const user = c.get("user");

      const { workspaceId } = c.req.param();
      const { name, image } = c.req.valid("form");

      const member = await getMember({
        workspaceId,
        userId: user.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      let uploadedImageUrl: string | undefined;

      if (image instanceof File) {
        const file = await storage.createFile(
          IMAGES_BUCKET_ID,
          randomUUID(),
          image,
        );

        const arrayBuffer = await storage.getFileView(
          IMAGES_BUCKET_ID,
          file.$id,
        );

        uploadedImageUrl = `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
      } else {
        uploadedImageUrl = image;
      } 

      // Update workspace in Neo4j
      const result = await runQuery(`
        MATCH (w:Workspace {id: $workspaceId})
        SET w.name = $name,
            w.imageUrl = $imageUrl,
            w.updatedAt = $updatedAt
        RETURN w
      `, {
        workspaceId,
        name,
        imageUrl: uploadedImageUrl || null,
        updatedAt: new Date().toISOString()
      });

      const workspace = result.length > 0 ? {
        $id: workspaceId,
        ...result[0].w
      } : null;

      if (!workspace) {
        return c.json({ error: "Failed to update workspace" }, 500);
      }

      return c.json({ data: workspace });
    }
  )
  .delete(
    "/:workspaceId",
    clerkSessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");

      const { workspaceId } = c.req.param();

      const member = await getMember({

        workspaceId,
        userId: user.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // TODO: Delete members, initiatives, and tasks

      await databases.deleteDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId,
      );

      return c.json({ data: { $id: workspaceId } });
    }
  )
  .post(
    "/:workspaceId/reset-invite-code",
    clerkSessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");

      const { workspaceId } = c.req.param();

      const member = await getMember({

        workspaceId,
        userId: user.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const workspace = await databases.updateDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId,
        {
          inviteCode: generateInviteCode(6),
        },
      );

      return c.json({ data: workspace });
    }
  )
  .post(
    "/:workspaceId/join",
    clerkSessionMiddleware,
    zValidator("json", z.object({ code: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.param();
      const { code } = c.req.valid("json");

      const databases = c.get("databases");
      const user = c.get("user");

      const member = await getMember({

        workspaceId,
        userId: user.$id,
      });

      if (member) {
        return c.json({ error: "Already a member" }, 400);
      }

      const workspace = await databases.getDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId
      ) as Workspace;

      if (workspace.inviteCode !== code) {
        return c.json({ error: "Invalid invite code" }, 400);
      }

      await databases.createDocument(
        DATABASE_ID,
        MEMBERS_ID,
        randomUUID(),
        {
          workspaceId,
          userId: user.$id,
          role: MemberRole.MEMBER,
        },
      );

      return c.json({ data: workspace });
    }
  )
  .get(
    "/:workspaceId/analytics",
    clerkSessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");
      const { workspaceId } = c.req.param();

      const member = await getMember({

        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      const thisMonthTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("workspaceId", workspaceId),
          Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
          Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString())
        ]
      );

      const lastMonthTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("workspaceId", workspaceId),
          Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
          Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString())
        ]
      );

      const taskCount = thisMonthTasks.total;
      const taskDifference = taskCount - lastMonthTasks.total;

      const thisMonthAssignedTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("workspaceId", workspaceId),
          Query.equal("assigneeId", member.$id),
          Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
          Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString())
        ]
      );

      const lastMonthAssignedTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("workspaceId", workspaceId),
          Query.equal("assigneeId", member.$id),
          Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
          Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString())
        ]
      );

      const assignedTaskCount = thisMonthAssignedTasks.total;
      const assignedTaskDifference =
        assignedTaskCount - lastMonthAssignedTasks.total;

      const thisMonthIncompleteTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("workspaceId", workspaceId),
          Query.notEqual("status", TaskStatus.DONE),
          Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
          Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString())
        ]
      );

      const lastMonthIncompleteTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("workspaceId", workspaceId),
          Query.notEqual("status", TaskStatus.DONE),
          Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
          Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString())
        ]
      );

      const incompleteTaskCount = thisMonthIncompleteTasks.total;
      const incompleteTaskDifference =
        incompleteTaskCount - lastMonthIncompleteTasks.total;

      const thisMonthCompletedTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("workspaceId", workspaceId),
          Query.equal("status", TaskStatus.DONE),
          Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
          Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString())
        ]
      );

      const lastMonthCompletedTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("workspaceId", workspaceId),
          Query.equal("status", TaskStatus.DONE),
          Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
          Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString())
        ]
      );

      const completedTaskCount = thisMonthCompletedTasks.total;
      const completedTaskDifference =
        completedTaskCount - lastMonthCompletedTasks.total;

      const thisMonthOverdueTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("workspaceId", workspaceId),
          Query.notEqual("status", TaskStatus.DONE),
          Query.lessThan("dueDate", now.toISOString()),
          Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
          Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString())
        ]
      );

      const lastMonthOverdueTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("workspaceId", workspaceId),
          Query.notEqual("status", TaskStatus.DONE),
          Query.lessThan("dueDate", now.toISOString()),
          Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
          Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString())
        ]
      );

      const overdueTaskCount = thisMonthOverdueTasks.total;
      const overdueTaskDifference =
        overdueTaskCount - lastMonthOverdueTasks.total;

      return c.json({
        data: {
          taskCount,
          taskDifference,
          assignedTaskCount,
          assignedTaskDifference,
          completedTaskCount,
          completedTaskDifference,
          incompleteTaskCount,
          incompleteTaskDifference,
          overdueTaskCount,
          overdueTaskDifference,
        },
      });
    }
  )

export default app;
