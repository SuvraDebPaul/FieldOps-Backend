import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PaymentServices } from "./payment.service";

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

/**
 * Mounted in app.ts with express.raw() ahead of express.json(), so req.body is
 * the untouched Buffer the signature was computed over.
 */
const handleStripeWebhook = catchAsync(async (req: Request, res: Response) => {
	const signature = req.headers["stripe-signature"] as string | undefined;

	const result = await PaymentServices.handleStripeWebhook(
		req.body as Buffer,
		signature,
	);

	// Stripe only cares about the 2xx; the body is for our own logs.
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
