import { z } from "zod";
import { Hono } from "hono";
import { randomUUID } from "crypto";
import { zValidator } from "@hono/zod-validator";

import { Query } from "@/lib/query-utils";

import { getMember } from "@/features/members/utils";
import { MemberRole } from "@/features/members/types";

import { clerkSessionMiddleware } from "@/lib/clerk-middleware";
import { DATABASE_ID, IMAGES_BUCKET_ID, MEMBERS_ID, SUITES_ID, INITIATIVES_ID } from "@/config";
import { runQuery, runSingleQuery } from "@/lib/neo4j";
import { generateId } from "@/lib/neo4j-schema";

import { Suite } from "../types";
import { createSuiteSchema, updateSuiteSchema } from "../schemas";

const app = new Hono()
  .get("/", clerkSessionMiddleware, async (c) => {
    const user = c.get("user");
    const { workspaceId } = c.req.query();

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

    // Get suites from Neo4j filtered by workspace
    const suites = await runQuery(`
      MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(s:Suite)
      RETURN s
      ORDER BY s.createdAt ASC
    `, { workspaceId });

    // Format suites for API response
    const formattedSuites = suites.map(result => ({
      $id: result.s.id,
      ...result.s,
      // Add placeholder counts for UI compatibility
      initiativeCount: 0,
      taskCount: 0,
      completionRate: 0
    }));

    return c.json({ 
      data: { 
        documents: formattedSuites, 
        total: formattedSuites.length 
      } 
    });
  })
  .get(
    "/:suiteId",
    clerkSessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { suiteId } = c.req.param();

      const suite = await databases.getDocument(
        DATABASE_ID,
        SUITES_ID,
        suiteId,
      ) as Suite;

      const member = await getMember({

        workspaceId: suite.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      return c.json({ data: suite });
    }
  )
  .post(
    "/",
    zValidator("form", createSuiteSchema),
    clerkSessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const storage = c.get("storage");
      const user = c.get("user");

      const { name, description, image, slug, startDate, endDate } = c.req.valid("form");
      const { workspaceId } = c.req.query();

      if (!workspaceId) {
        return c.json({ error: "Workspace ID is required" }, 400);
      }

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
      }

      const suite = await databases.createDocument(
        DATABASE_ID,
        SUITES_ID,
        randomUUID(),
        {
          name,
          description,
          workspaceId,
          imageUrl: uploadedImageUrl,
          slug,
          startDate,
          endDate,
        },
      );

      return c.json({ data: suite });
    }
  )
  .patch(
    "/:suiteId",
    clerkSessionMiddleware,
    zValidator("form", updateSuiteSchema),
    async (c) => {
      const databases = c.get("databases");
      const storage = c.get("storage");
      const user = c.get("user");

      const { suiteId } = c.req.param();
      const { name, description, image, slug, startDate, endDate } = c.req.valid("form");

      const existingSuite = await databases.getDocument(
        DATABASE_ID,
        SUITES_ID,
        suiteId,
      ) as Suite;

      const member = await getMember({

        workspaceId: existingSuite.workspaceId,
        userId: user.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      let uploadedImageUrl: string | undefined = existingSuite.imageUrl;

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
      } else if (image === "") {
        uploadedImageUrl = undefined;
      }

      const suite = await databases.updateDocument(
        DATABASE_ID,
        SUITES_ID,
        suiteId,
        {
          name,
          description,
          imageUrl: uploadedImageUrl,
          slug,
          startDate,
          endDate,
        }
      );

      return c.json({ data: suite });
    }
  )
  .delete(
    "/:suiteId",
    clerkSessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");

      const { suiteId } = c.req.param();

      const suite = await databases.getDocument(
        DATABASE_ID,
        SUITES_ID,
        suiteId,
      ) as Suite;

      const member = await getMember({

        workspaceId: suite.workspaceId,
        userId: user.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // TODO: Delete associated initiatives and tasks

      await databases.deleteDocument(
        DATABASE_ID,
        SUITES_ID,
        suiteId,
      );

      return c.json({ data: { $id: suiteId } });
    }
  )
  .patch(
    "/:suiteSlug/activate",
    clerkSessionMiddleware,
    zValidator("json", z.object({ workspaceId: z.string() })),
    async (c) => {
      const user = c.get("user");
      const { suiteSlug } = c.req.param();
      const { workspaceId } = c.req.valid("json");

      // Check if user has access to workspace
      const member = await getMember({
        workspaceId,
        userId: user.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // For now, use a simplified approach - find suite by slug and activate it
      // This is a placeholder until we fully convert to Neo4j
      
      try {
        // Mock response for now - in reality this would update Neo4j
        const suite = {
          $id: `suite-${suiteSlug}`,
          name: suiteSlug.charAt(0).toUpperCase() + suiteSlug.slice(1),
          slug: suiteSlug,
          workspaceId,
          isActive: true,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
        };

        return c.json({ data: suite });
      } catch (error) {
        console.error("Failed to activate suite:", error);
        return c.json({ error: "Failed to activate suite" }, 500);
      }
    }
  );

export default app;