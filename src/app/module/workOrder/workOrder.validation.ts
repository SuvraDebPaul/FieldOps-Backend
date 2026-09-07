import { z } from "zod";
import { WorkOrderStatus } from "../../../generated/prisma/enums";

export const ApproveServiceRequestValidationZodSchema = z.object({
  technicianId: z.uuid("A valid technician is required"),

  scheduledStart: z.iso.datetime("scheduledStart must be an ISO datetime"),

  scheduledEnd: z.iso.datetime("scheduledEnd must be an ISO datetime"),
});

export const RejectServiceRequestValidationZodSchema = z.object({
  rejectReason: z
    .string()
    .trim()
    .min(5, "A rejection reason of at least 5 characters is required"),
});

export const ChangeWorkOrderStatusValidationZodSchema = z.object({
  status: z.enum(WorkOrderStatus),

  note: z
    .string()
    .trim()
    .max(500, "Note cannot exceed 500 characters")
    .optional(),

  diagnosis: z
    .string()
    .trim()
    .max(2000, "Diagnosis cannot exceed 2000 characters")
    .optional(),

  workSummary: z
    .string()
    .trim()
    .max(2000, "Work summary cannot exceed 2000 characters")
    .optional(),

  cancelReason: z
    .string()
    .trim()
    .min(5, "A cancellation reason of at least 5 characters is required")
    .optional(),
});

export const RescheduleWorkOrderValidationZodSchema = z.object({
  scheduledStart: z.iso.datetime("scheduledStart must be an ISO datetime"),

  scheduledEnd: z.iso.datetime("scheduledEnd must be an ISO datetime"),

  note: z
    .string()
    .trim()
    .max(500, "Note cannot exceed 500 characters")
    .optional(),
});

export const AddPartUsageValidationZodSchema = z.object({
  name: z.string().trim().min(2, "Part name is required"),

  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),

  unitPrice: z.number().min(0, "Unit price cannot be negative"),
});
