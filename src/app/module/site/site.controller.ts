import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { SiteServices } from "./site.service";

const createSite = catchAsync(async (req: Request, res: Response) => {
	const result = await SiteServices.createSite(req.body, req.user!);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Site Created Successfully",
		data: result,
	});
});

const getAllSites = catchAsync(async (req: Request, res: Response) => {
	const { data, meta } = await SiteServices.getAllSites(req.query, req.user!);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Sites Retrieved Successfully",
		data,
		meta,
	});
});

const getSingleSite = catchAsync(async (req: Request, res: Response) => {
	const siteId = req.params.siteId as string;

	const result = await SiteServices.getSingleSite(siteId, req.user!);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Site Retrieved Successfully",
		data: result,
	});
});

const updateSite = catchAsync(async (req: Request, res: Response) => {
	const siteId = req.params.siteId as string;

	const result = await SiteServices.updateSite(siteId, req.body, req.user!);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Site Updated Successfully",
		data: result,
	});
});

export const SiteController = {
	createSite,
	getAllSites,
	getSingleSite,
	updateSite,
};
