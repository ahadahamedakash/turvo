/**
 * Superadmin Protected Layout
 *
 * Layout wrapper for all superadmin pages
 * Validates user isSuperAdmin and provides consistent navigation
 */

"use client";

import { useIsSuperAdmin } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface SuperadminLayoutProps {
  children: React.ReactNode;
}

/**
 * Loading state component
 */
function SuperadminLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Verifying access...</p>
      </div>
    </div>
  );
}

/**
 * Access denied component
 */
function SuperadminAccessDenied() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have permission to access this area.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go to Dashboard
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
  const { isSuperAdmin, isLoading } = useIsSuperAdmin();

  // Show loading while checking auth
  if (isLoading) {
    return <SuperadminLoading />;
  }

  // Show access denied if not superadmin
  if (!isSuperAdmin) {
    return <SuperadminAccessDenied />;
  }

  // Render children if authorized
  return <>{children}</>;
}
