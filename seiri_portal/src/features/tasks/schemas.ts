import { z } from "zod";

import { TaskStatus } from "./types";

export const createTaskSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
  workspaceId: z.string().trim().min(1, "Required"),
  initiativeId: z.string().trim().min(1, "Required"),
  dueDate: z.coerce.date().optional(),
  assigneeId: z.string().trim().min(1, "Required").optional(),
  description: z.string().optional(),
});

export const updateTaskSchema = z.object({
  name: z.string().trim().min(1, "Required").optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: z.string().optional(),
  initiativeId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  description: z.string().optional(),
  position: z.number().optional(),
});

export const createAcceptanceCriterionSchema = z.object({
  text: z.string().trim().min(1, "Required"),
  order: z.number().optional(),
});

export const updateAcceptanceCriterionSchema = z.object({
  text: z.string().trim().min(1, "Required").optional(),
  completed: z.boolean().optional(),
  order: z.number().optional(),
});
