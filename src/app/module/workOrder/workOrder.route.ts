import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { FeedbackController } from "../feedback/feedback.controller";
import { SubmitFeedbackValidationZodSchema } from "../feedback/feedback.validation";
import { InvoiceController } from "../invoice/invoice.controller";
import { WorkOrderController } from "./workOrder.controller";
import {
	AddPartUsageValidationZodSchema,
	ChangeWorkOrderStatusValidationZodSchema,
	RescheduleWorkOrderValidationZodSchema,
} from "./workOrder.validation";

const router = Router();

// Must be declared before "/:workOrderId", or "my-assigned" would be read as an id.
router.get(
	"/my-assigned",
	auth(Role.TECHNICIAN),
	WorkOrderController.getMyAssignedWorkOrders,
);

router.get(
	"/",
	auth(Role.ADMIN, Role.TECHNICIAN, Role.CUSTOMER),
	WorkOrderController.getAllWorkOrders,
);

router.get(
	"/:workOrderId",
	auth(Role.ADMIN, Role.TECHNICIAN, Role.CUSTOMER),
	WorkOrderController.getSingleWorkOrder,
);

router.patch(
	"/:workOrderId/status",
	auth(Role.ADMIN, Role.TECHNICIAN),
	validateRequest(ChangeWorkOrderStatusValidationZodSchema),
	WorkOrderController.changeWorkOrderStatus,
);

router.patch(
	"/:workOrderId/reschedule",
	auth(Role.ADMIN),
	validateRequest(RescheduleWorkOrderValidationZodSchema),
	WorkOrderController.rescheduleWorkOrder,
);

router.post(
	"/:workOrderId/parts",
	auth(Role.TECHNICIAN),
	validateRequest(AddPartUsageValidationZodSchema),
	WorkOrderController.addPartUsage,
);

// Generating the invoice performs the COMPLETED -> INVOICED transition, so it
// hangs off the work order rather than /invoices.
router.post(
	"/:workOrderId/invoice",
	auth(Role.ADMIN),
	InvoiceController.generateInvoice,
);

// Customer feedback closes the flow: rate the job once it has been paid.
router.post(
	"/:workOrderId/feedback",
	auth(Role.CUSTOMER),
	validateRequest(SubmitFeedbackValidationZodSchema),
	FeedbackController.submitFeedback,
);

router.get(
	"/:workOrderId/feedback",
	auth(Role.ADMIN, Role.CUSTOMER, Role.TECHNICIAN),
	FeedbackController.getWorkOrderFeedback,
);

export const WorkOrderRoutes = router;
