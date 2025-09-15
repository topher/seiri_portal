import { Hono } from "hono";
import { randomUUID } from "crypto";
import { zValidator } from "@hono/zod-validator";

import { Query } from "@/lib/query-utils";

import { getMember } from "@/features/members/utils";
import { clerkSessionMiddleware } from "@/lib/clerk-middleware";
import { DATABASE_ID, ACCEPTANCE_CRITERIA_ID, TASKS_ID, INITIATIVES_ID, SUITES_ID } from "@/config";

import { AcceptanceCriterion } from "@/features/tasks/types";
import { createAcceptanceCriterionSchema, updateAcceptanceCriterionSchema } from "@/features/tasks/schemas";

const app = new Hono()
  .get("/:criterionId", clerkSessionMiddleware, async (c) => {
    const user = c.get("user");
    const databases = c.get("databases");
    const { criterionId } = c.req.param();

    const criterion = await databases.getDocument(
      DATABASE_ID,
      ACCEPTANCE_CRITERIA_ID,
      criterionId,
    ) as AcceptanceCriterion;

    // Verify access through task -> initiative -> suite -> workspace
    const task = await databases.getDocument(DATABASE_ID, TASKS_ID, criterion.taskId);
    const initiative = await databases.getDocument(DATABASE_ID, INITIATIVES_ID, task.initiativeId);
    
    // During transition, initiatives might have workspaceId directly or suiteId
    let workspaceId;
    if (initiative.suiteId) {
      const suite = await databases.getDocument(DATABASE_ID, SUITES_ID, initiative.suiteId);
      workspaceId = suite.workspaceId;
    } else {
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

    return c.json({ data: criterion });
  })
  .post(
    "/",
    zValidator("json", createAcceptanceCriterionSchema),
    clerkSessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");

      const { text, order } = c.req.valid("json");
      const { taskId } = c.req.query();

      if (!taskId) {
        return c.json({ error: "Task ID is required" }, 400);
      }

      // Verify access through task -> initiative -> suite -> workspace
      const task = await databases.getDocument(DATABASE_ID, TASKS_ID, taskId);
      const initiative = await databases.getDocument(DATABASE_ID, INITIATIVES_ID, task.initiativeId);
      
      // During transition, initiatives might have workspaceId directly or suiteId
      let workspaceId;
      if (initiative.suiteId) {
        const suite = await databases.getDocument(DATABASE_ID, SUITES_ID, initiative.suiteId);
        workspaceId = suite.workspaceId;
      } else {
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

      // Get the next order if not provided
      let criterionOrder = order;
      if (!criterionOrder) {
        const existingCriteria = await databases.listDocuments(
          DATABASE_ID,
          ACCEPTANCE_CRITERIA_ID,
          [
            Query.equal("taskId", taskId),
            Query.orderDesc("order")
          ]
        );
        criterionOrder = existingCriteria.documents.length > 0 
          ? (existingCriteria.documents[0] as AcceptanceCriterion).order + 1 
          : 0;
      }

      const criterion = await databases.createDocument(
        DATABASE_ID,
        ACCEPTANCE_CRITERIA_ID,
        randomUUID(),
        {
          text,
          taskId,
          completed: false,
          order: criterionOrder,
        },
      );

      return c.json({ data: criterion });
    }
  )
  .patch(
    "/:criterionId",
    clerkSessionMiddleware,
    zValidator("json", updateAcceptanceCriterionSchema),
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");

      const { criterionId } = c.req.param();
      const { text, completed, order } = c.req.valid("json");

      const existingCriterion = await databases.getDocument(
        DATABASE_ID,
        ACCEPTANCE_CRITERIA_ID,
        criterionId,
      ) as AcceptanceCriterion;

      // Verify access through task -> initiative -> suite -> workspace
      const task = await databases.getDocument(DATABASE_ID, TASKS_ID, existingCriterion.taskId);
      const initiative = await databases.getDocument(DATABASE_ID, INITIATIVES_ID, task.initiativeId);
      
      // During transition, initiatives might have workspaceId directly or suiteId
      let workspaceId;
      if (initiative.suiteId) {
        const suite = await databases.getDocument(DATABASE_ID, SUITES_ID, initiative.suiteId);
        workspaceId = suite.workspaceId;
      } else {
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

      const criterion = await databases.updateDocument(
        DATABASE_ID,
        ACCEPTANCE_CRITERIA_ID,
        criterionId,
        {
          text,
          completed,
          order,
        }
      );

      return c.json({ data: criterion });
    }
  )
  .delete(
    "/:criterionId",
    clerkSessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");

      const { criterionId } = c.req.param();

      const criterion = await databases.getDocument(
        DATABASE_ID,
        ACCEPTANCE_CRITERIA_ID,
        criterionId,
      ) as AcceptanceCriterion;

      // Verify access through task -> initiative -> suite -> workspace
      const task = await databases.getDocument(DATABASE_ID, TASKS_ID, criterion.taskId);
      const initiative = await databases.getDocument(DATABASE_ID, INITIATIVES_ID, task.initiativeId);
      
      // During transition, initiatives might have workspaceId directly or suiteId
      let workspaceId;
      if (initiative.suiteId) {
        const suite = await databases.getDocument(DATABASE_ID, SUITES_ID, initiative.suiteId);
        workspaceId = suite.workspaceId;
      } else {
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

      await databases.deleteDocument(
        DATABASE_ID,
        ACCEPTANCE_CRITERIA_ID,
        criterionId,
      );

      return c.json({ data: { $id: criterionId } });
    }
  );

export default app;