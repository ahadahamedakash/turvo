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
 * Hook to get user data directly
 * Returns the user object and loading state
 * Consumers can check userData.isSuperAdmin themselves
 */
export function useUserData() {
  const { user, isLoading } = useUserContext();

  return {
    userData: user,
    isLoading,
    isAuthenticated: !!user,
  };
}

/**
 * @deprecated Use useUserData() instead and check userData.isSuperAdmin
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
