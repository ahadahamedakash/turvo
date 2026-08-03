/**
 * Authentication hooks using TanStack Query
 *
 * Handles login, logout, and auth state management.
 * Uses in-memory token storage and session manager.
 */

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, handleApiError } from "@/lib/api";
import {
  establishSession,
  clearSession,
  getSessionUser,
} from "@/lib/auth/session-manager";
import type { LoginFormValues, AuthResponse } from "@/lib/schemas/auth";

/**
 * Login mutation hook
 */
export function useLogin(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const response = await authApi.login(values.email, values.password);
      return response as AuthResponse;
    },
    onSuccess: (data) => {
      console.log("[useLogin] Login successful:", data);

      // Establish session with access token (refresh token is already in HttpOnly cookie)
      establishSession(data.accessToken);

      // Show success toast
      toast.success("Login successful", {
        description: "Welcome back!",
      });

      // Clear any cached data from previous sessions
      queryClient.clear();

      // Call custom onSuccess callback if provided
      options?.onSuccess?.();
    },
    onError: (error) => {
      console.error("Login error:", error);

      const apiError = handleApiError(error);

      // Handle specific error statuses
      if (apiError.status === 401) {
        toast.error("Invalid credentials", {
          description: "Please check your email and password.",
        });
      } else if (apiError.status === 429) {
        toast.error("Too many attempts", {
          description: "Please wait before trying again.",
        });
      } else {
        toast.error("Login failed", {
          description:
            apiError.message ||
            "An unexpected error occurred. Please try again.",
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
      // Clear session
      clearSession();

      // Clear all cached data
      queryClient.clear();

      // Show success toast
      toast.success("Logged out", {
        description: "You have been logged out successfully.",
      });

      // Redirect to login
      router.push("/login");
    },
    onError: (error) => {
      console.error("Logout error:", error);

      // Even if logout API fails, clear local state
      clearSession();
      queryClient.clear();
      router.push("/login");
    },
  });
}

/**
 * Hook to check if user is authenticated
 */
export function useAuth() {
  const user = getSessionUser();

  return {
    isAuthenticated: !!user,
    isLoading: false,
    user: user
      ? {
          id: user.sub,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          isSuperAdmin: user.isSuperAdmin,
        }
      : null,
  };
}
