/**
 * API client with cookie-based authentication and automatic token refresh
 */

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "./auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

/**
 * API error class for typed error handling
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
 * Request refresh token and update cookies
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (!response.ok) {
      // Refresh failed - clear tokens and redirect to login will be handled by caller
      return false;
    }

    const data = await response.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/**
 * Core fetch function with automatic token refresh
 */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  skipRefresh = false,
): Promise<Response> {
  // Add access token to Authorization header if available
  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - try token refresh
  if (response.status === 401 && !skipRefresh && getRefreshToken()) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      // Retry the original request with new token
      const newAccessToken = getAccessToken();
      if (newAccessToken) {
        headers["Authorization"] = `Bearer ${newAccessToken}`;
      }

      response = await fetch(url, {
        ...options,
        headers,
      });
    } else {
      // Refresh failed - clear tokens
      clearTokens();
      // Redirect to login will happen at the call site
      throw new ApiError(401, null, "Authentication failed");
    }
  }

  return response;
}

/**
 * Typed API client methods
 */
export const apiClient = {
  /**
   * Make a GET request
   */
  async get<T>(url: string): Promise<T> {
    const response = await fetchWithAuth(`${API_BASE_URL}${url}`, {
      method: "GET",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new ApiError(response.status, data, "GET request failed");
    }

    return response.json();
  },

  /**
   * Make a POST request
   */
  async post<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetchWithAuth(`${API_BASE_URL}${url}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new ApiError(response.status, data, "POST request failed");
    }

    return response.json();
  },

  /**
   * Make a PUT request
   */
  async put<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetchWithAuth(`${API_BASE_URL}${url}`, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new ApiError(response.status, data, "PUT request failed");
    }

    return response.json();
  },

  /**
   * Make a PATCH request
   */
  async patch<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetchWithAuth(`${API_BASE_URL}${url}`, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new ApiError(response.status, data, "PATCH request failed");
    }

    return response.json();
  },

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string): Promise<T> {
    const response = await fetchWithAuth(`${API_BASE_URL}${url}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new ApiError(response.status, data, "DELETE request failed");
    }

    return response.json();
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
    return apiClient.post<{
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
  },

  /**
   * Refresh access token
   */
  async refreshToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    return apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
    }>("/auth/refresh");
  },

  /**
   * Logout user
   */
  async logout() {
    return apiClient.post<{ message: string }>("/auth/logout");
  },
};
