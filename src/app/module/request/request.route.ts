import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { WorkOrderController } from "../workOrder/workOrder.controller";
import {
	ApproveServiceRequestValidationZodSchema,
	RejectServiceRequestValidationZodSchema,
} from "../workOrder/workOrder.validation";
import { ServiceRequestController } from "./request.controller";
import {
	CreateServiceRequestValidationZodSchema,
	UpdateServiceRequestValidationZodSchema,
} from "./request.validation";

const router = Router();

router.post(
	"/",
	auth(Role.CUSTOMER),
	validateRequest(CreateServiceRequestValidationZodSchema),
	ServiceRequestController.createServiceRequest,
);

// One route, two audiences: ADMIN sees everything, CUSTOMER sees only their own.
// The scoping happens in the service, never in the route.
router.get(
	"/",
	auth(Role.ADMIN, Role.CUSTOMER),
	ServiceRequestController.getAllServiceRequests,
);

router.get(
	"/:requestId",
	auth(Role.ADMIN, Role.CUSTOMER),
	ServiceRequestController.getSingleServiceRequest,
);

router.patch(
	"/:requestId",
	auth(Role.CUSTOMER),
	validateRequest(UpdateServiceRequestValidationZodSchema),
	ServiceRequestController.updateServiceRequest,
);

router.patch(
	"/:requestId/cancel",
	auth(Role.CUSTOMER),
	ServiceRequestController.cancelServiceRequest,
);

// Dispatcher actions. These live in the workOrder module because approving a
// request is what creates a work order, but they hang off the request URL.
router.patch(
	"/:requestId/approve",
	auth(Role.ADMIN),
	validateRequest(ApproveServiceRequestValidationZodSchema),
	WorkOrderController.approveServiceRequest,
);

router.patch(
	"/:requestId/reject",
	auth(Role.ADMIN),
	validateRequest(RejectServiceRequestValidationZodSchema),
	WorkOrderController.rejectServiceRequest,
);

router.delete(
	"/:requestId",
	auth(Role.ADMIN),
	ServiceRequestController.softDeleteServiceRequest,
);

export const ServiceRequestRoutes = router;
