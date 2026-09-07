import { z } from "zod";

export const InitiatePaymentValidationZodSchema = z.object({
  invoiceId: z.uuid("A valid invoice is required"),
});
