export interface IQuery {
  searchTerm?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;

  // Module-specific filters (status, priority, categoryId, from, to, ...)
  [key: string]: unknown;
}

export interface IMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
