export interface ICreateServiceCategoryPayload {
	name: string;
	description?: string;
	requiredSkillId: string;
	baseCharge: number;
	estimatedMins: number;
}

export interface IUpdateServiceCategoryPayload {
	name?: string;
	description?: string;
	requiredSkillId?: string;
	baseCharge?: number;
	estimatedMins?: number;
	isActive?: boolean;
}

export interface ICreateSkillPayload {
	name: string;
}
