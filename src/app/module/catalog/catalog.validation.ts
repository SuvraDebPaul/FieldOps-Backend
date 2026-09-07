import { z } from "zod";

export const CreateServiceCategoryValidationZodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Category name must be at least 3 characters long")
    .max(150, "Category name cannot exceed 150 characters"),

  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),

  requiredSkillId: z.uuid("A valid required skill is needed"),

  baseCharge: z.number().min(0, "Base charge cannot be negative"),

  estimatedMins: z
    .number()
    .int("Estimated minutes must be a whole number")
    .min(1, "Estimated minutes must be at least 1"),
});

export const UpdateServiceCategoryValidationZodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Category name must be at least 3 characters long")
    .max(150, "Category name cannot exceed 150 characters")
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),

  requiredSkillId: z.uuid("A valid required skill is needed").optional(),

  baseCharge: z.number().min(0, "Base charge cannot be negative").optional(),

  estimatedMins: z
    .number()
    .int("Estimated minutes must be a whole number")
    .min(1, "Estimated minutes must be at least 1")
    .optional(),

  isActive: z.boolean().optional(),
});

export const CreateSkillValidationZodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Skill name must be at least 2 characters long"),
});
