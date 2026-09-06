import { Router } from "express";
import { AuthRoutes } from "../module/auth/auth.route";
import { UserRoutes } from "../module/user/user.route";
import { TechnicianRoutes } from "../module/technician/technician.route";
import { ServiceRequestRoutes } from "../module/request/request.route";
import { WorkOrderRoutes } from "../module/workOrder/workOrder.route";
import { InvoiceRoutes } from "../module/invoice/invoice.route";
import { PaymentRoutes } from "../module/payment/payment.route";
import { SiteRoutes } from "../module/site/site.route";
import {
  ServiceCategoryRoutes,
  SkillRoutes,
} from "../module/catalog/catalog.route";

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
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
