import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { WorkOrderController } from "../workOrder/workOrder.controller.js";
import {
  ApproveServiceRequestValidationZodSchema,
  RejectServiceRequestValidationZodSchema,
} from "../workOrder/workOrder.validation.js";
import { ServiceRequestController } from "./request.controller.js";
import {
  CreateServiceRequestValidationZodSchema,
  UpdateServiceRequestValidationZodSchema,
} from "./request.validation.js";

const router = Router();

router.post(
  "/",
  auth(Role.CUSTOMER),
  validateRequest(CreateServiceRequestValidationZodSchema),
  ServiceRequestController.createServiceRequest,
);

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
