import { Hono } from "hono";
import { handle } from "hono/vercel";

import auth from "@/features/auth/server/route";
import members from "@/features/members/server/route";
import workspaces from "@/features/workspaces/server/route";
import tasks from "@/features/tasks/server/route";
import suites from "@/features/suites/server/route";
import initiatives from "@/features/initiatives/server/route";
import acceptanceCriteria from "@/features/acceptance-criteria/server/route";

const app = new Hono().basePath("/api");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = app
  .route("/auth", auth)
  .route("/members", members)
  .route("/workspaces", workspaces)
  .route("/suites", suites)
  .route("/initiatives", initiatives)
  .route("/tasks", tasks)
  .route("/acceptance-criteria", acceptanceCriteria)

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
