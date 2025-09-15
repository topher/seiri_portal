import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Always redirect to workspace list for user to choose
  redirect("/workspaces");
};
