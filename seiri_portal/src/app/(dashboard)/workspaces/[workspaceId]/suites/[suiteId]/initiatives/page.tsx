import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { SuiteInitiativesClient } from "./client";

const SuiteInitiativesPage = async () => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return <SuiteInitiativesClient />;
};

export default SuiteInitiativesPage;