import { z } from "zod";

export const createSuiteSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  description: z.string().optional(),
  image: z.union([
    z.instanceof(File),
    z.string().transform((value) => value === "" ? undefined : value),
  ]).optional(),
  slug: z.string().trim().min(1, "Required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const updateSuiteSchema = z.object({
  name: z.string().trim().min(1, "Required").optional(),
  description: z.string().optional(),
  image: z.union([
    z.instanceof(File),
    z.string().transform((value) => value === "" ? undefined : value),
  ]).optional(),
  slug: z.string().trim().min(1, "Required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});