import { Router } from "express";

const router = Router();

const moduleRoutes: { path: string; route: Router }[] = [
  // { path: "/auth", route: AuthRoutes },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
