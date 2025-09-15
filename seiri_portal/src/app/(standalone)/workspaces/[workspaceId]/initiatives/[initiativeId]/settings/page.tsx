import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";

import { InitiativeIdSettingsClient } from "./client";

const InitiativeIdSettingsPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <InitiativeIdSettingsClient />
};
 
export default InitiativeIdSettingsPage;