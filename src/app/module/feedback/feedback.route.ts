import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { FeedbackController } from "./feedback.controller";

const router = Router();

router.get(
  "/",
  auth(Role.ADMIN, Role.CUSTOMER, Role.TECHNICIAN),
  FeedbackController.getAllFeedbacks,
);

export const FeedbackRoutes = router;
