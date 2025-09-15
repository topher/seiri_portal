import { z } from "zod";
import { Moscow } from "./types";
import { TaskStatus } from "@/features/tasks/types";

export const createInitiativeSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  description: z.string().optional(),
  moscow: z.nativeEnum(Moscow),
  workspaceId: z.string().min(1, "Workspace ID is required"),
  assigneeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const updateInitiativeSchema = z.object({
  name: z.string().trim().min(1, "Required").optional(),
  description: z.string().optional(),
  moscow: z.nativeEnum(Moscow).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});