import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { PaymentServices } from "./payment.service.js";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;

  const result = await PaymentServices.initiatePayment(req.body, user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Payment Session Created Successfully",
    data: result,
  });
});

const handleStripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string | undefined;

  const result = await PaymentServices.handleStripeWebhook(
    req.body as Buffer,
    signature,
  );

  res.status(httpStatus.OK).json({ received: true, ...result });
});

const getPaymentByTransactionId = catchAsync(
  async (req: Request, res: Response) => {
    const transactionId = req.params.transactionId as string;
    const user = req.user!;

    const result = await PaymentServices.getPaymentByTransactionId(
      transactionId,
      user,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment Retrieved Successfully",
      data: result,
    });
  },
);

export const PaymentController = {
  initiatePayment,
  handleStripeWebhook,
  getPaymentByTransactionId,
};
