/**
 * Superadmin Protected Layout
 *
 * Layout wrapper for all superadmin pages
 * Validates user isSuperAdmin and provides consistent navigation
 */

"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useUserData } from "@/hooks/use-user";

interface SuperadminLayoutProps {
  children: React.ReactNode;
}

/**
 * Loading state component
 */
function SuperadminLoading() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        <p className="text-xs text-muted-foreground">Verifying superadmin permissions...</p>
      </div>
    </div>
  );
}

/**
 * Access denied component
 */
function SuperadminAccessDenied() {
  return (
    <div className="flex min-h-[300px] w-full flex-col items-center justify-center gap-4 rounded-xl border bg-card p-8 text-center shadow-xs">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Access Restricted</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          You don&apos;t have permission to access superadmin administration area.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-medium text-white hover:bg-teal-700 transition-colors"
      >
        Return to Dashboard Overview
      </Link>
    </div>
  );
}

/**
 * Superadmin layout component
 *
 * This layout:
 * 1. Checks if user is authenticated and isSuperAdmin
 * 2. Shows loading state while checking
 * 3. Shows access denied if not superadmin
 * 4. Renders children if authorized
 */
export default function SuperadminLayout({ children }: SuperadminLayoutProps) {
  const { userData, isLoading } = useUserData();

  // Show loading while checking auth
  if (isLoading) {
    return <SuperadminLoading />;
  }

  // Show access denied if not superadmin
  if (!userData?.isSuperAdmin) {
    return <SuperadminAccessDenied />;
  }

  // Render children if authorized
  return <>{children}</>;
}
