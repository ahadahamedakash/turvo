"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Building2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenants } from "@/hooks/tenants";
import { TurfDataTable } from "@/components/superadmin/tenants/turf-data-table";
import { TurfQuickStats } from "@/components/superadmin/tenants/turf-quick-stats";
import type { TenantStatus } from "@/lib/types/tenant";

export default function TurfsListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TenantStatus | "All">("All");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useTenants({ page, status, search });

  const totalTurfs = data?.total ?? 0;
  const activeTurfs = data?.data?.filter((t) => t.status === "Active").length ?? 0;
  const totalMembers = data?.data?.reduce((acc, t) => acc + (t.memberCount || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-card p-6 border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-semibold uppercase text-teal-700 border-teal-600/30 bg-teal-50 dark:bg-teal-950">
              <Building2 className="mr-1 h-3 w-3" /> Multi-Tenant Directory
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Turf Organizations
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            Manage all registered turf venues, inspect staff memberships, control tenant statuses, and create new organizations.
          </p>
        </div>

        <Button asChild className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-xs self-start sm:self-auto">
          <Link href="/dashboard/superadmin/tenants/new">
            <Plus className="h-4 w-4" />
            <span>New Turf</span>
          </Link>
        </Button>
      </div>

      {/* Quick Stats Cards */}
      <TurfQuickStats
        totalTurfs={totalTurfs}
        activeTurfs={activeTurfs}
        totalMembers={totalMembers}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-xl border bg-card/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center text-xs text-destructive">
            Failed to load turf organizations. Please refresh or verify network connection.
          </CardContent>
        </Card>
      )}

      {/* Main Data Table & Grid */}
      {!isLoading && !error && data && (
        <TurfDataTable
          data={data}
          onPageChange={setPage}
          onStatusFilter={setStatus}
          onSearch={setSearch}
          currentStatus={status}
          currentSearch={search}
        />
      )}
    </div>
  );
}
