export interface ICreateSitePayload {
	label: string;
	address: string;
	city: string;
	contactName: string;
	contactPhone: string;
}

export interface IUpdateSitePayload {
	label?: string;
	address?: string;
	city?: string;
	contactName?: string;
	contactPhone?: string;
}
