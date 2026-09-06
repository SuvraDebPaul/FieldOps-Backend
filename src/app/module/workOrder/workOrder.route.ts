import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
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

export const WorkOrderRoutes = router;
