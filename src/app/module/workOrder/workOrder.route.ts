import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { FeedbackController } from "../feedback/feedback.controller.js";
import { SubmitFeedbackValidationZodSchema } from "../feedback/feedback.validation.js";
import { InvoiceController } from "../invoice/invoice.controller.js";
import { WorkOrderController } from "./workOrder.controller.js";
import {
  AddPartUsageValidationZodSchema,
  ChangeWorkOrderStatusValidationZodSchema,
  RescheduleWorkOrderValidationZodSchema,
} from "./workOrder.validation.js";

const router = Router();

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

router.post(
  "/:workOrderId/invoice",
  auth(Role.ADMIN),
  InvoiceController.generateInvoice,
);

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
