import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { CatalogServices } from "./catalog.service";

const getAllServiceCategories = catchAsync(
	async (req: Request, res: Response) => {
		const { data, meta } = await CatalogServices.getAllServiceCategories(
			req.query,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Service Categories Retrieved Successfully",
			data,
			meta,
		});
	},
);

const getSingleServiceCategory = catchAsync(
	async (req: Request, res: Response) => {
		const categoryId = req.params.categoryId as string;

		const result = await CatalogServices.getSingleServiceCategory(categoryId);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Service Category Retrieved Successfully",
			data: result,
		});
	},
);

const createServiceCategory = catchAsync(async (req: Request, res: Response) => {
	const result = await CatalogServices.createServiceCategory(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Service Category Created Successfully",
		data: result,
	});
});

const updateServiceCategory = catchAsync(async (req: Request, res: Response) => {
	const categoryId = req.params.categoryId as string;

	const result = await CatalogServices.updateServiceCategory(
		categoryId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service Category Updated Successfully",
		data: result,
	});
});

const softDeleteServiceCategory = catchAsync(
	async (req: Request, res: Response) => {
		const categoryId = req.params.categoryId as string;

		const result = await CatalogServices.softDeleteServiceCategory(categoryId);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Service Category Deleted Successfully",
			data: result,
		});
	},
);

const getAllSkills = catchAsync(async (_req: Request, res: Response) => {
	const result = await CatalogServices.getAllSkills();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Skills Retrieved Successfully",
		data: result,
	});
});

const createSkill = catchAsync(async (req: Request, res: Response) => {
	const result = await CatalogServices.createSkill(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Skill Created Successfully",
		data: result,
	});
});

export const CatalogController = {
	getAllServiceCategories,
	getSingleServiceCategory,
	createServiceCategory,
	updateServiceCategory,
	softDeleteServiceCategory,
	getAllSkills,
	createSkill,
};
