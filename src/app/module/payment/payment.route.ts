import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { PaymentController } from "./payment.controller.js";
import { InitiatePaymentValidationZodSchema } from "./payment.validation.js";

const router = Router();

router.post(
  "/initiate",
  auth(Role.CUSTOMER, Role.ADMIN),
  validateRequest(InitiatePaymentValidationZodSchema),
  PaymentController.initiatePayment,
);

router.get(
  "/:transactionId",
  auth(Role.ADMIN, Role.CUSTOMER),
  PaymentController.getPaymentByTransactionId,
);

export const PaymentRoutes = router;
