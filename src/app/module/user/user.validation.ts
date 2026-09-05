import { z } from "zod";

export const UpdateUserValidationZodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .optional(),
  phone: z.string().trim().min(6, "Invalid phone number").optional(),
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .optional(),
  billingAddr: z
    .string()
    .trim()
    .min(5, "Billing address must be at least 5 characters")
    .optional(),
});
