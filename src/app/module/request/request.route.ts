import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
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

router.delete(
	"/:requestId",
	auth(Role.ADMIN),
	ServiceRequestController.softDeleteServiceRequest,
);

export const ServiceRequestRoutes = router;
