import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { FeedbackController } from "./feedback.controller.js";

const router = Router();

router.get(
  "/",
  auth(Role.ADMIN, Role.CUSTOMER, Role.TECHNICIAN),
  FeedbackController.getAllFeedbacks,
);

export const FeedbackRoutes = router;
