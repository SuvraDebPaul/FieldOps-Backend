import { z } from "zod";
import { Priority } from "../../../generated/prisma/enums.js";

export const CreateServiceRequestValidationZodSchema = z.object({
  siteId: z.uuid("A valid site is required"),

  categoryId: z.uuid("A valid service category is required"),

  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters long")
    .max(150, "Title cannot exceed 150 characters"),

  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters long")
    .max(2000, "Description cannot exceed 2000 characters"),

  priority: z.enum(Priority).optional(),

  preferredAt: z.iso.datetime("preferredAt must be an ISO datetime").optional(),
});

export const UpdateServiceRequestValidationZodSchema = z.object({
  siteId: z.uuid("A valid site is required").optional(),

  categoryId: z.uuid("A valid service category is required").optional(),

  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters long")
    .max(150, "Title cannot exceed 150 characters")
    .optional(),

  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters long")
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),

  priority: z.enum(Priority).optional(),

  preferredAt: z.iso.datetime("preferredAt must be an ISO datetime").optional(),
});
