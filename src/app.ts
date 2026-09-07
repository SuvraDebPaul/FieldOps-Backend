import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import httpStatus from "http-status";
import { sendResponse } from "./app/utils/sendResponse.js";
import { notFound } from "./app/middleware/notFound.js";
import { globalErrorHandeler } from "./app/middleware/globalErrorHandler.js";
import config from "./app/config/index.js";
import { apiLimiter } from "./app/middleware/rateLimiter.js";
import router from "./app/routes/index.js";
import { PaymentController } from "./app/module/payment/payment.controller.js";

const app: Application = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(apiLimiter);

app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.handleStripeWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/v1", router);

app.get("/", (_req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Welcome to the FieldOps Field Service Management Server",
    data: null,
  });
});
app.get("/api", (_req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Welcome to the FieldOps Field Service Management API",
    data: null,
  });
});

app.use(notFound);
app.use(globalErrorHandeler);

export default app;
