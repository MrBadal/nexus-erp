export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
}

export type SortOrder = 'asc' | 'desc';

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: SortOrder;
  search?: string;
}

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
