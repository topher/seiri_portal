import { Hono } from "hono";

import { clerkSessionMiddleware } from "@/lib/clerk-middleware";

const app = new Hono()
  .get(
    "/current",
    clerkSessionMiddleware,
    (c) => {
      const user = c.get("user");

      return c.json({ data: user });
    }
  )
  // Login and register are now handled by Clerk UI components
  // These endpoints are no longer needed but we'll keep them for now
  // to avoid breaking existing code that might call them
  .post(
    "/login",
    async (c) => {
      return c.json({ error: "Login is now handled by Clerk" }, 400);
    }
  )
  .post(
    "/register",
    async (c) => {
      return c.json({ error: "Registration is now handled by Clerk" }, 400);
    }
  )
  .post("/logout", async (c) => {
    // Logout is now handled by Clerk on the client side
    return c.json({ success: true });
  });

export default app;
