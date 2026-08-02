/**
 * Mirrors AgriERP.Shared.Models. Every endpoint returns ApiResponse<T>, success
 * or failure, so the client has one place to check `success` and one place to
 * read errors.
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
  /** Field name -> messages. Populated for validation failures only. */
  errors?: Record<string, string[]> | null;
  /** Correlates a failure with the server log entry. */
  traceId?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/** Base query string for every list endpoint. */
export interface QueryParameters {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDescending?: boolean;
  isActive?: boolean | null;
}

export interface LookupDto {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface GstSlabLookupDto extends LookupDto {
  totalRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
}

export interface ItemFormLookups {
  itemSubGroups: LookupDto[];
  companies: LookupDto[];
  units: LookupDto[];
  gstSlabs: GstSlabLookupDto[];
  hsnCodes: LookupDto[];
  storageLocations: LookupDto[];
}

/* ---------------------------------- auth --------------------------------- */

export interface CurrentUser {
  userId: number;
  userName: string;
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  roleName: string;
  avatarPath?: string | null;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
  /**
   * Drives menu and button visibility. The server still enforces every one of
   * these on the endpoint - this list is convenience, not security.
   */
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  user: CurrentUser;
}

/**
 * Thrown by the API client for any non-2xx response, carrying the server's
 * ApiResponse envelope so forms can map field errors onto inputs.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: Record<string, string[]> | null,
    public readonly traceId?: string | null,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** 400 from FluentValidation or a service-level field check. */
  get isValidation() {
    return this.status === 400 && !!this.errors;
  }

  /** 422 - structurally valid but refused by a business rule. */
  get isBusinessRule() {
    return this.status === 422;
  }

  /** 409 - collides with existing data. */
  get isConflict() {
    return this.status === 409;
  }
}
