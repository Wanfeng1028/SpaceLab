/**
 * 统一响应格式工具函数
 */

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** 成功响应 */
export function success<T>(data: T, message?: string): SuccessResponse<T> {
  return { success: true, data, ...(message ? { message } : {}) };
}

/** 错误响应 */
export function error(message: string, details?: unknown): ErrorResponse {
  return { success: false, error: message, ...(details ? { details } : {}) };
}

/** 分页响应（保留兼容，推荐各路由直接构造响应对象） */
export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  };
}
