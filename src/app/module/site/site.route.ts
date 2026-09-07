import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SiteController } from "./site.controller";
import {
  CreateSiteValidationZodSchema,
  UpdateSiteValidationZodSchema,
} from "./site.validation";

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
