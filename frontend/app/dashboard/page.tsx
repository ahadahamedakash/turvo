"use client";

import { useUserData } from "@/hooks/use-user";
import { SuperadminDashboardOverview } from "@/components/dashboard/superadmin-dashboard-overview";
import { TenantDashboardOverview } from "@/components/dashboard/tenant-dashboard-overview";
import { Loader2 } from "lucide-react";

export default function DashboardOverviewPage() {
  const { userData, isLoading } = useUserData();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  // Render role-specific dashboard overview
  if (userData?.isSuperAdmin) {
    return <SuperadminDashboardOverview />;
  }

  return <TenantDashboardOverview />;
}
