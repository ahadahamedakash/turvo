/**
 * UX-only permission gating
 *
 * Reads the permission slugs baked into the JWT (`tenantContext.permissions`)
 * and mirrors the backend PermissionGuard's matching rules. This hides or
 * disables UI affordances only — the backend remains the enforcement point
 * and 403s are still toasted by the API layer.
 */

import { useUserContext } from "@/contexts/user-context";
import { getSessionUser } from "@/lib/auth/session-manager";

/**
 * Check the current user's permissions.
 *
 * `hasPermission("Booking.create")` resolves true when the user:
 *   1. is a superadmin (bypass — same as the backend guard), or
 *   2. holds the exact slug, or
 *   3. holds the `{module}.all` wildcard for that module.
 *
 * PascalCase module declarations ("Booking.create") are accepted — the
 * slug is normalized to lowercase like the backend does.
 *
 * Deliberately not memoized: the slug list is a handful of strings, and
 * reading it fresh each render keeps the check correct across session
 * changes (UserContext re-renders consumers on every session update).
 */
export function usePermissions() {
  const { user } = useUserContext();
  const permissions = getSessionUser()?.tenantContext?.permissions ?? [];

  const hasPermission = (required: string) => {
    if (user?.isSuperAdmin) return true;

    const normalized = required.toLowerCase();
    if (permissions.includes(normalized)) return true;

    const [moduleName] = normalized.split(".");
    return permissions.includes(`${moduleName}.all`);
  };

  return { hasPermission };
}
