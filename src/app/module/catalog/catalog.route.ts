import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { CatalogController } from "./catalog.controller.js";
import {
  CreateServiceCategoryValidationZodSchema,
  CreateSkillValidationZodSchema,
  UpdateServiceCategoryValidationZodSchema,
} from "./catalog.validation.js";

const categoryRouter = Router();
const skillRouter = Router();

categoryRouter.get("/", CatalogController.getAllServiceCategories);

categoryRouter.get("/:categoryId", CatalogController.getSingleServiceCategory);

categoryRouter.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(CreateServiceCategoryValidationZodSchema),
  CatalogController.createServiceCategory,
);

categoryRouter.patch(
  "/:categoryId",
  auth(Role.ADMIN),
  validateRequest(UpdateServiceCategoryValidationZodSchema),
  CatalogController.updateServiceCategory,
);

categoryRouter.delete(
  "/:categoryId",
  auth(Role.ADMIN),
  CatalogController.softDeleteServiceCategory,
);

skillRouter.get("/", CatalogController.getAllSkills);

skillRouter.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(CreateSkillValidationZodSchema),
  CatalogController.createSkill,
);

export const ServiceCategoryRoutes = categoryRouter;
export const SkillRoutes = skillRouter;
