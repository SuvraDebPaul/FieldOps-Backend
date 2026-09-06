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

// NOTE: POST /api/v1/payments/webhook is NOT registered here. It is mounted
// directly in app.ts ahead of express.json(), because Stripe signature
// verification needs the raw request body.

export const PaymentRoutes = router;
