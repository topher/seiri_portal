import { runSingleQuery } from "@/lib/neo4j";

interface GetMemberProps {
  workspaceId: string;
  userId: string;
};

export const getMember = async ({
  workspaceId,
  userId,
}: GetMemberProps) => {
  const member = await runSingleQuery(`
    MATCH (m:Member {userId: $userId, workspaceId: $workspaceId})
    RETURN m
  `, { userId, workspaceId });

  return member ? { $id: member.m.id, ...member.m } : null;
};
