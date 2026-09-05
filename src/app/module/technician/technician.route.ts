import { Router } from "express";
import { TechnicianController } from "./technician.controller";

const router = Router();

router.get("/", TechnicianController.getTechnicians);

export const TechnicianRoutes = router;
