export enum MemberRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER"
};

export type Member = {
  workspaceId: string;
  userId: string;
  role: MemberRole;
};
