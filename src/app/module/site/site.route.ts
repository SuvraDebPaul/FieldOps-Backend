import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { SiteController } from "./site.controller.js";
import {
  CreateSiteValidationZodSchema,
  UpdateSiteValidationZodSchema,
} from "./site.validation.js";

const router = Router();

router.post(
  "/",
  auth(Role.CUSTOMER),
  validateRequest(CreateSiteValidationZodSchema),
  SiteController.createSite,
);

router.get("/", auth(Role.CUSTOMER, Role.ADMIN), SiteController.getAllSites);

router.get(
  "/:siteId",
  auth(Role.CUSTOMER, Role.ADMIN),
  SiteController.getSingleSite,
);

router.patch(
  "/:siteId",
  auth(Role.CUSTOMER),
  validateRequest(UpdateSiteValidationZodSchema),
  SiteController.updateSite,
);

export const SiteRoutes = router;
