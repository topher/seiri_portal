import { z } from "zod";
import { Hono } from "hono";
import { randomUUID } from "crypto";
import { zValidator } from "@hono/zod-validator";

import { Query } from "@/lib/query-utils";

import { getMember } from "@/features/members/utils";
import { Initiative } from "@/features/initiatives/types";

import { clerkClient } from "@clerk/nextjs/server";
import { clerkSessionMiddleware } from "@/lib/clerk-middleware";
import { DATABASE_ID, MEMBERS_ID, TASKS_ID, ACCEPTANCE_CRITERIA_ID, INITIATIVES_ID, SUITES_ID } from "@/config";

import { Task, TaskStatus } from "../types";
import { createTaskSchema, updateTaskSchema } from "../schemas";

const app = new Hono()
  .delete(
    "/:taskId",
    clerkSessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { taskId } = c.req.param();

      const task = await databases.getDocument(
        DATABASE_ID,
        TASKS_ID,
        taskId,
      );

      const member = await getMember({

        workspaceId: task.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      await databases.deleteDocument(
        DATABASE_ID,
        TASKS_ID,
        taskId,
      );

      return c.json({ data: { $id: task.$id } });
    }
  )
  .get(
    "/",
    clerkSessionMiddleware,
    zValidator(
      "query",
      z.object({
        workspaceId: z.string().nullish(),
        initiativeId: z.string().nullish(),
        assigneeId: z.string().nullish(),
        status: z.nativeEnum(TaskStatus).nullish(),
        search: z.string().nullish(),
        dueDate: z.string().nullish(),
      })
    ),
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");

      const {
        workspaceId,
        initiativeId,
        status,
        search,
        assigneeId,
        dueDate,
      } = c.req.valid("query");

      if (!workspaceId) {
        return c.json({ error: "Workspace ID is required" }, 400);
      }

      const member = await getMember({
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const query = [
        Query.equal("workspaceId", workspaceId),
        Query.orderDesc("$createdAt")
      ];

      if (initiativeId) {
        console.log("initiativeId: ", initiativeId);
        query.push(Query.equal("initiativeId", initiativeId));
      }

      if (status) {
        console.log("status: ", status);
        query.push(Query.equal("status", status));
      }

      if (assigneeId) {
        console.log("assigneeId: ", assigneeId);
        query.push(Query.equal("assigneeId", assigneeId));
      }

      if (dueDate) {
        console.log("dueDate: ", dueDate);
        query.push(Query.equal("dueDate", dueDate));
      }

      if (search) {
        console.log("search: ", search);
        query.push(Query.search("name", search));
      }

      const tasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        query,
      );

      const initiativeIds = tasks.documents.map((task: any) => task.initiativeId);
      const assigneeIds = tasks.documents.map((task: any) => task.assigneeId);

      const initiatives = await databases.listDocuments(
        DATABASE_ID,
        INITIATIVES_ID,
        initiativeIds.length > 0 ? [Query.contains("$id", initiativeIds)] : [],
      );

      const members = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        assigneeIds.length > 0 ? [Query.contains("$id", assigneeIds)] : [],
      );

      const clerk = await clerkClient();
      const assignees = await Promise.all(
        members.documents.map(async (member: any) => {
          const clerkUser = await clerk.users.getUser(member.userId);

          return {
            ...member,
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "User",
            email: clerkUser.emailAddresses[0]?.emailAddress || "",
          }
        })
      );

      const populatedTasks = tasks.documents.map((task: any) => {
        const initiative = initiatives.documents.find(
          (initiative: any) => initiative.$id === task.initiativeId,
        );
        const assignee = assignees.find(
          (assignee: any) => assignee.$id === task.assigneeId,
        );

        return {
          ...task,
          initiative: initiative,
          assignee,
        };
      });

      return c.json({
        data: {
          ...tasks,
          documents: populatedTasks,
        },
      });
    }
  )
  .post(
    "/",
    clerkSessionMiddleware,
    zValidator("json", createTaskSchema),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const {
        name,
        status,
        workspaceId,
        initiativeId,
        dueDate,
        assigneeId
      } = c.req.valid("json");

      const member = await getMember({

        workspaceId,
        userId: user.$id
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const highestPositionTask = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("status", status),
          Query.equal("workspaceId", workspaceId),
          Query.orderAsc("position"),
          Query.limit(1),
        ],
      );

      const newPosition =
        highestPositionTask.documents.length > 0
        ? highestPositionTask.documents[0].position + 1000
        : 1000;

      const task = await databases.createDocument(
        DATABASE_ID,
        TASKS_ID,
        randomUUID(),
        {
          name,
          status,
          workspaceId,
          initiativeId,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          assigneeId,
          position: newPosition
        },
      );

      return c.json({ data: task });
    }
  )
  .patch(
    "/:taskId",
    clerkSessionMiddleware,
    zValidator("json", updateTaskSchema),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const {
        name,
        status,
        description,
        initiativeId,
        dueDate,
        assigneeId
      } = c.req.valid("json");
      const { taskId } = c.req.param();

      const existingTask = await databases.getDocument(
        DATABASE_ID,
        TASKS_ID,
        taskId,
      );

      const member = await getMember({

        workspaceId: existingTask.workspaceId,
        userId: user.$id
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const task = await databases.updateDocument(
        DATABASE_ID,
        TASKS_ID,
        taskId,
        {
          name,
          status,
          initiativeId,
          dueDate,
          assigneeId,
          description,
        },
      );

      return c.json({ data: task });
    }
  )
  .get(
    "/:taskId",
    clerkSessionMiddleware,
    async (c) => {
      const currentUser = c.get("user");
      const databases = c.get("databases");
      const { taskId } = c.req.param();

      const task = await databases.getDocument(
        DATABASE_ID,
        TASKS_ID,
        taskId,
      );

      const currentMember = await getMember({

        workspaceId: task.workspaceId,
        userId: currentUser.$id,
      });

      if (!currentMember) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const initiative = await databases.getDocument(
        DATABASE_ID,
        INITIATIVES_ID,
        task.initiativeId
      );

      const member = await databases.getDocument(
        DATABASE_ID,
        MEMBERS_ID,
        task.assigneeId
      );

      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(member.userId);

      const assignee = {
        ...member,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "User",
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
      };

      return c.json({
        data: {
          ...task,
          initiative: initiative,
          assignee,
        },
      });
    }
  )
  .get(
    "/:taskId/acceptance-criteria",
    clerkSessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { taskId } = c.req.param();

      const task = await databases.getDocument(
        DATABASE_ID,
        TASKS_ID,
        taskId,
      );

      const member = await getMember({

        workspaceId: task.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const criteria = await databases.listDocuments(
        DATABASE_ID,
        ACCEPTANCE_CRITERIA_ID,
        [
          Query.equal("taskId", taskId),
          Query.orderAsc("order")
        ]
      );

      return c.json({ data: criteria });
    }
  )
  .post(
    "/bulk-update",
    clerkSessionMiddleware,
    zValidator(
      "json",
      z.object({
        tasks: z.array(
          z.object({
            $id: z.string(),
            status: z.nativeEnum(TaskStatus),
            position: z.number().int().positive().min(1000).max(1_000_000),
          })
        )
      })
    ),
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");
      const { tasks } = await c.req.valid("json");

      const tasksToUpdate = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [Query.contains("$id", tasks.map((task) => task.$id))]
      );

      const workspaceIds = new Set(tasksToUpdate.documents.map((task: any) => task.workspaceId));
      if (workspaceIds.size !== 1) {
        return c.json({ error: "All tasks must belong to the same workspace" })
      }

      const workspaceId = workspaceIds.values().next().value as string;

      if (!workspaceId) {
        return c.json({ error: "Workspace ID is required" }, 400);
      }

      const member = await getMember({

        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {
          const { $id, status, position } = task;
          return databases.updateDocument(
            DATABASE_ID,
            TASKS_ID,
            $id,
            { status, position }
          );
        })
      );

      return c.json({ data: updatedTasks });
    }
  )

export default app;
