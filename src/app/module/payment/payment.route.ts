import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { PaymentController } from "./payment.controller";
import { InitiatePaymentValidationZodSchema } from "./payment.validation";

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
