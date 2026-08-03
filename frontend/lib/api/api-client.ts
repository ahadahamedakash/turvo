import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosRequestConfig,
} from "axios";
import { updateSession, clearSession } from "../auth/session-manager";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken as clearCookie,
} from "../auth/cookie-utils";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

/**
 * API Error class for typed error handling
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Refresh state to prevent concurrent refresh attempts
 */
interface RefreshState {
  isRefreshing: boolean;
  failed: boolean;
}

const refreshState: RefreshState = {
  isRefreshing: false,
  failed: false,
};

/**
 * Queue of requests waiting for refresh to complete
 */
interface QueuedRequest {
  resolve: (value: boolean) => void;
  reject: (error: unknown) => void;
}

let refreshQueue: QueuedRequest[] = [];

/**
 * Create and configure Axios instance
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important: sends HttpOnly cookies
});

/**
 * Request interceptor - Attach access token
 */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

/**
 * Response interceptor - Handle 401 and token refresh
 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is not 401 or already retried, reject immediately
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If refresh already failed, reject immediately
    if (refreshState.failed) {
      // Clear auth state and redirect to login
      clearCookie();
      clearSession();

      // Redirect to login (only in browser)
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return Promise.reject(new ApiError(401, null, "Session expired"));
    }

    // If refresh is in progress, queue this request
    if (refreshState.isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      })
        .then(() => {
          // Retry original request after refresh succeeds
          return axiosInstance(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    // Start refresh process
    refreshState.isRefreshing = true;

    try {
      // Call refresh endpoint
      // Refresh token cookie is sent automatically with withCredentials: true
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, null, {
        withCredentials: true,
      });

      if (response.status === 200 && response.data.accessToken) {
        // Update auth state with new token
        setAccessToken(response.data.accessToken);
        updateSession(response.data.accessToken);

        // Mark refresh as successful
        refreshState.isRefreshing = false;
        refreshState.failed = false;

        // Process queued requests
        refreshQueue.forEach((queued) => queued.resolve(true));
        refreshQueue = [];

        // Retry original request with new token
        originalRequest._retry = true;
        return axiosInstance(originalRequest);
      } else {
        throw new Error("Refresh failed");
      }
    } catch (refreshError) {
      // Refresh failed - mark as failed and clear auth state

      console.log(refreshError);
      refreshState.isRefreshing = false;
      refreshState.failed = true;

      clearCookie();
      clearSession();

      // Reject all queued requests
      refreshQueue.forEach((queued) =>
        queued.reject(new ApiError(401, null, "Session expired")),
      );
      refreshQueue = [];

      // Redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return Promise.reject(new ApiError(401, null, "Session expired"));
    }
  },
);

/**
 * Typed API client methods
 */
export const apiClient = {
  /**
   * Make a GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.get<T>(url, config);
    return response.data;
  },

  /**
   * Make a POST request
   */
  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await axiosInstance.post<T>(url, data, config);
    return response.data;
  },

  /**
   * Make a PUT request
   */
  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await axiosInstance.put<T>(url, data, config);
    return response.data;
  },

  /**
   * Make a PATCH request
   */
  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await axiosInstance.patch<T>(url, data, config);
    return response.data;
  },

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.delete<T>(url, config);
    return response.data;
  },
};

/**
 * Auth-specific API methods
 */
export const authApi = {
  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    const response = await axiosInstance.post<{
      accessToken: string;
      refreshToken: string;
      user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
      tenants: Array<{
        id: string;
        name: string;
        slug: string;
        tenantMemberId: string;
        permissions: string[];
        role: {
          id: string;
          name: string;
          slug: string;
        } | null;
      }>;
    }>("/auth/login", { email, password });

    // Tokens are set as HttpOnly cookies by the backend
    // We only need to extract the access token for in-memory storage
    return response.data;
  },

  /**
   * Logout user
   */
  async logout() {
    const response = await axiosInstance.post<{ message: string }>(
      "/auth/logout",
    );
    return response.data;
  },

  /**
   * Get current user info (if backend has this endpoint)
   * Falls back to JWT decoding if endpoint doesn't exist
   */
  async getMe() {
    try {
      const response = await axiosInstance.get("/auth/me");
      return response.data;
    } catch {
      // Endpoint might not exist, return null
      return null;
    }
  },
};

/**
 * Export the raw Axios instance for advanced use cases
 */
export { axiosInstance };

/**
 * Helper function to convert Axios error to ApiError
 */
export function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 500;
    const data = error.response?.data || null;
    const message =
      (data as { message?: string })?.message || "API request failed";
    return new ApiError(status, data, message);
  }
  if (error instanceof ApiError) {
    return error;
  }
  return new ApiError(500, null, "An unexpected error occurred");
}
