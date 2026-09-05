import { Router } from "express";
import { AuthRoutes } from "../module/auth/auth.route";

const router = Router();

const moduleRoutes: { path: string; route: Router }[] = [
  // { path: "/auth", route: AuthRoutes },
  { path: "/auth", route: AuthRoutes },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
