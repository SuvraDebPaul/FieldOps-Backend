import { z } from "zod";
import { Role, UserStatus } from "../../../generated/prisma/enums";

export const UpdateUserStatusValidationZodSchema = z.object({
  status: z.enum(UserStatus),

  reason: z
    .string()
    .trim()
    .max(500, "Reason cannot exceed 500 characters")
    .optional(),
});

export const UpdateUserRoleValidationZodSchema = z.object({
  role: z.enum(Role),
});
