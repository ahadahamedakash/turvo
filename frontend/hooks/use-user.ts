/**
 * User Hooks
 *
 * Convenience hooks for user authentication and authorization
 */

import { useUserContext } from "@/contexts/user-context";

/**
 * Hook to get current user info
 */
export function useUser() {
  return useUserContext();
}

/**
 * Hook to check if current user is a superadmin
 */
export function useIsSuperAdmin() {
  const { user, isLoading } = useUserContext();

  console.log("USER DATA: ", user);

  return {
    isSuperAdmin: user?.isSuperAdmin ?? false,
    isLoading,
  };
}
