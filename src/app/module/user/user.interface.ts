export interface IUpdateUserPayload {
  name?: string;
  phone?: string;
  companyName?: string;
  billingAddr?: string;
}

export interface ITechnicianFilterQuery {
  skill?: string;
  city?: string;
  available?: string;
  searchTerm?: string;
  page?: string;
  limit?: string;
}
