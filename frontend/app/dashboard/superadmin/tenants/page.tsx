/**
 * Turfs List Page
 *
 * Main page for listing and managing all turfs/tenants
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTenants } from "@/hooks/tenants";
import { TurfDataTable } from "@/components/superadmin/tenants/turf-data-table";
import { TurfQuickStats } from "@/components/superadmin/tenants/turf-quick-stats";
import type { TenantStatus } from "@/lib/types/tenant";

export default function TurfsListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TenantStatus | "All">("All");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useTenants({ page, status, search });

  console.log("TENANT DATA: ", data);

  // Calculate stats from data
  const totalTurfs = data?.pagination.total ?? 0;
  const activeTurfs = 0; // TODO: Calculate from all data or use separate endpoint
  const totalMembers = 0; // TODO: Calculate from data or use separate endpoint
  const totalBookings = 0; // TODO: Implement when bookings API is ready

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">
            Failed to load turfs. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Turfs</h1>
          <p className="text-sm text-muted-foreground">
            Manage your turf organizations
          </p>
        </div>
        <Button asChild>
          <Link href="/superadmin/tenants/new">
            <Plus className="mr-2 h-4 w-4" />
            New Turf
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <TurfQuickStats
        totalTurfs={totalTurfs}
        activeTurfs={activeTurfs || totalTurfs}
        totalMembers={totalMembers}
        totalBookings={totalBookings}
      />

      {/* Data Table */}
      {data && (
        <TurfDataTable
          data={data.data}
          pagination={data.pagination}
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
