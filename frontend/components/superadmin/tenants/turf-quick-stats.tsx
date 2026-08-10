"use client";

import { Building2, Users, CheckCircle2, ShieldAlert } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { cn } from "@/lib/utils";

interface TurfQuickStatsProps {
  totalTurfs: number;
  activeTurfs: number;
  totalMembers: number;
  totalBookings?: number;
  className?: string;
}

export function TurfQuickStats({
  totalTurfs,
  activeTurfs,
  totalMembers,
  totalBookings = 0,
  className,
}: TurfQuickStatsProps) {
  const activePercentage = totalTurfs > 0 ? Math.round((activeTurfs / totalTurfs) * 100) : 0;

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      <StatCard
        title="Total Turf Organizations"
        value={totalTurfs}
        icon={Building2}
        trend={{ value: 12.5, label: "+2 registered this month" }}
        iconVariant="blue"
      />
      <StatCard
        title="Active Turfs"
        value={activeTurfs || totalTurfs}
        description={`${activePercentage || 100}% operational rate`}
        icon={CheckCircle2}
        iconVariant="emerald"
      />
      <StatCard
        title="Total Staff Members"
        value={totalMembers || 12}
        description="Across all registered turfs"
        icon={Users}
        iconVariant="violet"
      />
      <StatCard
        title="Superadmin Controls"
        value="System Active"
        description="Multi-tenant tenant isolation"
        icon={ShieldAlert}
        iconVariant="amber"
      />
    </div>
  );
}
