/**
 * Authentication hooks using TanStack Query
 * Handles login, logout, token refresh, and auth state
 */

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { authApi, ApiError } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setTokens, clearTokens, getAccessToken } from "@/lib/auth";
import type { LoginFormValues, AuthResponse } from "@/lib/schemas/auth";

/**
 * Login mutation hook
 */
export function useLogin() {
  // const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const response = await authApi.login(values.email, values.password);
      return response as AuthResponse;
    },
    onSuccess: (data) => {
      // Store tokens in cookies
      setTokens(data.accessToken, data.refreshToken);

      // Show success toast
      toast.success("Login successful", {
        description: "Welcome back!",
      });

      // Clear any cached data from previous sessions
      queryClient.clear();

      // Redirect to dashboard
      // router.push('/dashboard');
    },
    onError: (error) => {
      console.error("Login error:", error);

      if (error instanceof ApiError) {
        // Handle specific error statuses
        if (error.status === 401) {
          toast.error("Invalid credentials", {
            description: "Please check your email and password.",
          });
        } else if (error.status === 429) {
          toast.error("Too many attempts", {
            description: "Please wait before trying again.",
          });
        } else {
          toast.error("Login failed", {
            description: "An unexpected error occurred. Please try again.",
          });
        }
      } else {
        toast.error("Login failed", {
          description: "An unexpected error occurred. Please try again.",
        });
      }
    },
  });
}

/**
 * Logout mutation hook
 */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await authApi.logout();
    },
    onSuccess: () => {
      // Clear tokens
      clearTokens();

      // Clear all cached data
      queryClient.clear();

      // Show success toast
      toast.success("Logged out", {
        description: "You have been logged out successfully.",
      });

      // Redirect to login
      router.push("/login");
    },
    onError: () => {
      // Even if logout API fails, clear local state
      clearTokens();
      queryClient.clear();
      router.push("/login");
    },
  });
}

/**
 * Token refresh mutation hook
 * Typically used internally by api-client on 401 errors
 */
export function useRefreshToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await authApi.refreshToken();
      return response as AuthResponse;
    },
    onSuccess: (data) => {
      // Update tokens in cookies
      setTokens(data.accessToken, data.refreshToken);
    },
    onError: () => {
      // Refresh failed - clear tokens and redirect to login
      clearTokens();
      queryClient.clear();
      window.location.href = "/login";
    },
  });
}

/**
 * Hook to check if user is authenticated
 */
export function useAuth() {
  const accessToken = getAccessToken();

  return {
    isAuthenticated: !!accessToken,
    isLoading: false, // Can be extended to fetch user profile
  };
}
