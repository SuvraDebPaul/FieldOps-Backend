import { z } from "zod";

export const CreateSiteValidationZodSchema = z.object({
  label: z
    .string()
    .trim()
    .min(3, "Label must be at least 3 characters long")
    .max(120, "Label cannot exceed 120 characters"),

  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters long"),

  city: z.string().trim().min(2, "City is required"),

  contactName: z.string().trim().min(2, "Contact name is required"),

  contactPhone: z.string().trim().min(6, "A valid contact phone is required"),
});

export const UpdateSiteValidationZodSchema = z.object({
  label: z
    .string()
    .trim()
    .min(3, "Label must be at least 3 characters long")
    .max(120, "Label cannot exceed 120 characters")
    .optional(),

  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters long")
    .optional(),

  city: z.string().trim().min(2, "City is required").optional(),

  contactName: z.string().trim().min(2, "Contact name is required").optional(),

  contactPhone: z
    .string()
    .trim()
    .min(6, "A valid contact phone is required")
    .optional(),
});
