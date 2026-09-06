import type { IMeta, IQuery } from "../interfaces";

export type TPaginationOptions = {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

/**
 * Every list endpoint reads its paging and sorting the same way.
 * `limit` is capped so a client cannot ask for the whole table.
 */
export const calculatePagination = (
  query: IQuery,
  defaultSortBy = "createdAt",
): TPaginationOptions => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sortBy: query.sortBy || defaultSortBy,
    sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
  };
};

export const buildMeta = (page: number, limit: number, total: number): IMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
