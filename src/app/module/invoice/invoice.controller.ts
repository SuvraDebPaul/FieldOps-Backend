import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { InvoiceServices } from "./invoice.service";

const generateInvoice = catchAsync(async (req: Request, res: Response) => {
	const workOrderId = req.params.workOrderId as string;
	const user = req.user!;

	const result = await InvoiceServices.generateInvoice(workOrderId, user);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Invoice Generated Successfully",
		data: result,
	});
});

const getAllInvoices = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const { data, meta } = await InvoiceServices.getAllInvoices(req.query, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Invoices Retrieved Successfully",
		data,
		meta,
	});
});

const getSingleInvoice = catchAsync(async (req: Request, res: Response) => {
	const invoiceId = req.params.invoiceId as string;
	const user = req.user!;

	const result = await InvoiceServices.getSingleInvoice(invoiceId, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Invoice Retrieved Successfully",
		data: result,
	});
});

export const InvoiceController = {
	generateInvoice,
	getAllInvoices,
	getSingleInvoice,
};
