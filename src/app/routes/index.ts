import { Router } from "express";
import { AuthRoutes } from "../module/auth/auth.route.js";
import { UserRoutes } from "../module/user/user.route.js";
import { TechnicianRoutes } from "../module/technician/technician.route.js";
import { ServiceRequestRoutes } from "../module/request/request.route.js";
import { WorkOrderRoutes } from "../module/workOrder/workOrder.route.js";
import { InvoiceRoutes } from "../module/invoice/invoice.route.js";
import { PaymentRoutes } from "../module/payment/payment.route.js";
import { SiteRoutes } from "../module/site/site.route.js";
import { FeedbackRoutes } from "../module/feedback/feedback.route.js";
import { AdminRoutes } from "../module/admin/admin.route.js";
import {
  ServiceCategoryRoutes,
  SkillRoutes,
} from "../module/catalog/catalog.route.js";

const router = Router();

const moduleRoutes: { path: string; route: Router }[] = [
  { path: "/auth", route: AuthRoutes },
  { path: "/users", route: UserRoutes },
  { path: "/technicians", route: TechnicianRoutes },
  { path: "/requests", route: ServiceRequestRoutes },
  { path: "/work-orders", route: WorkOrderRoutes },
  { path: "/invoices", route: InvoiceRoutes },
  { path: "/payments", route: PaymentRoutes },
  { path: "/sites", route: SiteRoutes },
  { path: "/categories", route: ServiceCategoryRoutes },
  { path: "/skills", route: SkillRoutes },
  { path: "/feedbacks", route: FeedbackRoutes },
  { path: "/admin", route: AdminRoutes },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
