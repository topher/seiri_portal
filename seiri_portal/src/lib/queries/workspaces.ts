import { currentUser } from "@clerk/nextjs/server";
import { runQuery, runSingleQuery, runTransaction } from "@/lib/neo4j";
import { Workspace, generateId } from "@/lib/neo4j-schema";

export async function getWorkspaces() {
  const user = await currentUser();
  
  if (!user) {
    return { documents: [], total: 0 };
  }

  // Get workspaces where user is a member
  const workspaces = await runQuery<Workspace>(`
    MATCH (u:User {clerkId: $clerkId})-[:MEMBER_OF]->(w:Workspace)
    RETURN w
    ORDER BY w.createdAt DESC
  `, { clerkId: user.id });

  return {
    documents: workspaces.map(workspaceRecord => ({
      ...(workspaceRecord as any).w,
      $id: (workspaceRecord as any).w.id // Map the id field to $id for compatibility
    })),
    total: workspaces.length
  };
}

export async function getWorkspaceById(workspaceId: string) {
  const user = await currentUser();
  
  if (!user) {
    return null;
  }

  // Verify user has access to this workspace
  const workspace = await runSingleQuery<{ w: Workspace }>(`
    MATCH (u:User {clerkId: $clerkId})-[:MEMBER_OF]->(w:Workspace {id: $workspaceId})
    RETURN w
  `, { clerkId: user.id, workspaceId });

  return workspace?.w || null;
}

export async function createWorkspace(data: {
  name: string;
  imageUrl?: string;
  inviteCode: string;
}) {
  const user = await currentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  const workspaceId = generateId();
  const now = new Date().toISOString();

  return await runTransaction(async (tx) => {
    // Create or get user node
    await tx.run(`
      MERGE (u:User {clerkId: $clerkId})
      ON CREATE SET 
        u.id = $userId,
        u.email = $email,
        u.name = $name,
        u.createdAt = $now,
        u.updatedAt = $now
      ON MATCH SET 
        u.updatedAt = $now
    `, {
      clerkId: user.id,
      userId: generateId(),
      email: user.emailAddresses[0]?.emailAddress || "",
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "User",
      now
    });

    // Create workspace
    await tx.run(`
      MATCH (u:User {clerkId: $clerkId})
      CREATE (w:Workspace {
        id: $workspaceId,
        name: $name,
        imageUrl: $imageUrl,
        inviteCode: $inviteCode,
        userId: u.id,
        createdAt: $now,
        updatedAt: $now
      })
      CREATE (u)-[:OWNS]->(w)
      CREATE (u)-[:MEMBER_OF {role: 'ADMIN', createdAt: $now}]->(w)
      RETURN w
    `, {
      clerkId: user.id,
      workspaceId,
      name: data.name,
      imageUrl: data.imageUrl || null,
      inviteCode: data.inviteCode,
      now
    });

    return { id: workspaceId };
  });
}

export async function updateWorkspace(workspaceId: string, data: {
  name?: string;
  imageUrl?: string;
}) {
  const user = await currentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Verify user is admin of this workspace
  const isAdmin = await runSingleQuery(`
    MATCH (u:User {clerkId: $clerkId})-[m:MEMBER_OF]->(w:Workspace {id: $workspaceId})
    WHERE m.role = 'ADMIN'
    RETURN w
  `, { clerkId: user.id, workspaceId });

  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const now = new Date().toISOString();
  const updates = [];
  const params: any = { workspaceId, now };

  if (data.name !== undefined) {
    updates.push("w.name = $name");
    params.name = data.name;
  }

  if (data.imageUrl !== undefined) {
    updates.push("w.imageUrl = $imageUrl");
    params.imageUrl = data.imageUrl;
  }

  if (updates.length === 0) {
    return;
  }

  await runQuery(`
    MATCH (w:Workspace {id: $workspaceId})
    SET ${updates.join(", ")}, w.updatedAt = $now
    RETURN w
  `, params);
}

export async function deleteWorkspace(workspaceId: string) {
  const user = await currentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Verify user owns this workspace
  const isOwner = await runSingleQuery(`
    MATCH (u:User {clerkId: $clerkId})-[:OWNS]->(w:Workspace {id: $workspaceId})
    RETURN w
  `, { clerkId: user.id, workspaceId });

  if (!isOwner) {
    throw new Error("Unauthorized");
  }

  // Delete workspace and all related data
  await runQuery(`
    MATCH (w:Workspace {id: $workspaceId})
    OPTIONAL MATCH (w)-[:CONTAINS]->(p:Initiative)
    OPTIONAL MATCH (p)-[:HAS]->(t:Task)
    DETACH DELETE w, p, t
  `, { workspaceId });
}

export async function resetInviteCode(workspaceId: string, newInviteCode: string) {
  const user = await currentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Verify user is admin
  const isAdmin = await runSingleQuery(`
    MATCH (u:User {clerkId: $clerkId})-[m:MEMBER_OF]->(w:Workspace {id: $workspaceId})
    WHERE m.role = 'ADMIN'
    RETURN w
  `, { clerkId: user.id, workspaceId });

  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  await runQuery(`
    MATCH (w:Workspace {id: $workspaceId})
    SET w.inviteCode = $inviteCode, w.updatedAt = $now
    RETURN w
  `, { 
    workspaceId, 
    inviteCode: newInviteCode,
    now: new Date().toISOString()
  });
}

export async function joinWorkspace(inviteCode: string) {
  const user = await currentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Find workspace by invite code
  const workspace = await runSingleQuery<{ w: Workspace }>(`
    MATCH (w:Workspace {inviteCode: $inviteCode})
    RETURN w
  `, { inviteCode });

  if (!workspace) {
    throw new Error("Invalid invite code");
  }

  const now = new Date().toISOString();

  return await runTransaction(async (tx) => {
    // Create or get user node
    await tx.run(`
      MERGE (u:User {clerkId: $clerkId})
      ON CREATE SET 
        u.id = $userId,
        u.email = $email,
        u.name = $name,
        u.createdAt = $now,
        u.updatedAt = $now
      ON MATCH SET 
        u.updatedAt = $now
    `, {
      clerkId: user.id,
      userId: generateId(),
      email: user.emailAddresses[0]?.emailAddress || "",
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "User",
      now
    });

    // Check if already a member
    const existingMembership = await tx.run(`
      MATCH (u:User {clerkId: $clerkId})-[m:MEMBER_OF]->(w:Workspace {id: $workspaceId})
      RETURN m
    `, { clerkId: user.id, workspaceId: workspace.w.id });

    if (existingMembership.records.length === 0) {
      // Add as member
      await tx.run(`
        MATCH (u:User {clerkId: $clerkId}), (w:Workspace {id: $workspaceId})
        CREATE (u)-[:MEMBER_OF {role: 'MEMBER', createdAt: $now}]->(w)
      `, { clerkId: user.id, workspaceId: workspace.w.id, now });
    }

    return workspace.w;
  });
}