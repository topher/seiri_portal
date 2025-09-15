import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { getWorkspaces } from "@/features/workspaces/queries";
import { WorkspacesPageClient } from "./client";

export default async function WorkspacesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return <WorkspacesPageClient />;
}