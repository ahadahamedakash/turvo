/**
 * Superadmin Dashboard Home
 *
 * Redirects to turfs list page
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperadminHomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to turfs list
    router.replace("/dashboard/superadmin/tenants");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
