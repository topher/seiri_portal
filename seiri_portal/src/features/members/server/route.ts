import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
// Members server route using Neo4j

import { Query } from "@/lib/query-utils";

import { clerkClient } from "@clerk/nextjs/server";
import { DATABASE_ID, MEMBERS_ID } from "@/config";
import { clerkSessionMiddleware } from "@/lib/clerk-middleware";

import { getMember } from "../utils";
import { Member, MemberRole } from "../types";

const app = new Hono()
  .get(
    "/",
    clerkSessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");
      const { workspaceId } = c.req.valid("query");

      const member = await getMember({

        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const members = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        [Query.equal("workspaceId", workspaceId)]
      );

      const clerk = await clerkClient();
      const populatedMembers = await Promise.all(
        members.documents.map(async (member: any) => {
          const clerkUser = await clerk.users.getUser(member.userId);

          return {
            ...member,
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || "User",
            email: clerkUser.emailAddresses[0]?.emailAddress || "",
          }
        })
      );

      return c.json({
        data: {
          ...members,
          documents: populatedMembers,
        },
      });
    }
  )
  .delete(
    "/:memberId",
    clerkSessionMiddleware,
    async (c) => {
      const { memberId } = c.req.param();
      const user = c.get("user");
      const databases = c.get("databases");

      const memberToDelete = await databases.getDocument(
        DATABASE_ID,
        MEMBERS_ID,
        memberId,
      );

      const allMembersInWorkspace = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        [Query.equal("workspaceId", memberToDelete.workspaceId)]
      );

      const member = await getMember({

        workspaceId: memberToDelete.workspaceId,
        userId: user.$id
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      
      if (member.$id !== memberToDelete.$id && member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      
      if (allMembersInWorkspace.total === 1) {
        return c.json({ error: "Cannot delete the only member" }, 400);
      }

      await databases.deleteDocument(
        DATABASE_ID,
        MEMBERS_ID,
        memberId,
      );

      return c.json({ data: { $id: memberToDelete.$id } });
    }
  )
  .patch(
    "/:memberId",
    clerkSessionMiddleware,
    zValidator("json", z.object({ role: z.nativeEnum(MemberRole) })),
    async (c) => {
      const { memberId } = c.req.param();
      const { role } = c.req.valid("json");
      const user = c.get("user");
      const databases = c.get("databases");

      const memberToUpdate = await databases.getDocument(
        DATABASE_ID,
        MEMBERS_ID,
        memberId,
      );

      const allMembersInWorkspace = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        [Query.equal("workspaceId", memberToUpdate.workspaceId)]
      );

      const member = await getMember({

        workspaceId: memberToUpdate.workspaceId,
        userId: user.$id
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      
      if (member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      
      if (allMembersInWorkspace.total === 1) {
        return c.json({ error: "Cannot downgrade the only member" }, 400);
      }

      await databases.updateDocument(
        DATABASE_ID,
        MEMBERS_ID,
        memberId,
        {
          role,
        }
      );

      return c.json({ data: { $id: memberToUpdate.$id } });
    }
  )

export default app;
