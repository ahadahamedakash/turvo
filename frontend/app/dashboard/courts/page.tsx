"use client";

import { useState } from "react";
import { Building2, Plus, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCourts } from "@/hooks/courts";
import { CourtsDataTable } from "@/components/dashboard/courts/courts-data-table";
import { CourtDialog } from "@/components/dashboard/courts/court-dialog";
import type { Court, CourtStatus } from "@/lib/types/court";

export default function CourtsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CourtStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [courtToEdit, setCourtToEdit] = useState<Court | null>(null);

  const { data, isLoading, error } = useCourts({
    page,
    status: status === "All" ? undefined : status,
    search: search || undefined,
    includeDeleted,
  });

  const totalCourts = data?.total ?? 0;
  const availableCourts = data?.data?.filter((c) => c.status === "Available").length ?? 0;
  const maintenanceCourts = data?.data?.filter((c) => c.status === "Maintenance").length ?? 0;
  const totalSlots = data?.data?.reduce((sum, court) => sum + court.slotCount, 0) ?? 0;
  const totalBookings = data?.data?.reduce((sum, court) => sum + court.bookingCount, 0) ?? 0;

  const handleCreateClick = () => {
    setCourtToEdit(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (court: Court) => {
    setCourtToEdit(court);
    setIsDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    // Refetch is handled by the mutation's onSuccess
  };

  const handleRefresh = () => {
    setPage(1);
    setStatus("All");
    setSearch("");
    setIncludeDeleted(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-card p-6 border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-semibold uppercase text-teal-700 border-teal-600/30 bg-teal-50 dark:bg-teal-950">
              <Building2 className="mr-1 h-3 w-3" /> Venue Management
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Courts & Venues
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            Manage your turf courts and venues. Create new courts, update their status, and track booking activity.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleRefresh}
          >
            <Sparkles className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700"
            onClick={handleCreateClick}
          >
            <Plus className="h-4 w-4" />
            Add Court
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-teal-200/30 bg-teal-50/30 dark:border-teal-900/50 dark:bg-teal-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Courts</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalCourts}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-teal-600/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200/30 bg-green-50/30 dark:border-green-900/50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-foreground mt-1">{availableCourts}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-600/10 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/30 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Slots</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalSlots}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-600/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200/30 bg-purple-50/30 dark:border-purple-900/50 dark:bg-purple-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalBookings}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-600/10 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Alert */}
      {maintenanceCourts > 0 && (
        <Card className="border-amber-200/30 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-600/10 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">
                  {maintenanceCourts} court{maintenanceCourts > 1 ? "s are" : " is"} under maintenance
                </p>
                <p className="text-[11px] text-muted-foreground">
                  These courts will not appear in booking availability
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            Failed to load courts. Please refresh or verify network connection.
          </CardContent>
        </Card>
      )}

      {/* Main Data Table */}
      {!isLoading && !error && data && (
        <CourtsDataTable
          data={data}
          onPageChange={setPage}
          onStatusFilter={setStatus}
          onSearch={setSearch}
          onIncludeDeletedToggle={setIncludeDeleted}
          currentStatus={status}
          currentSearch={search}
          includeDeleted={includeDeleted}
          onEditClick={handleEditClick}
        />
      )}

      {/* Create/Edit Dialog */}
      <CourtDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        courtToEdit={courtToEdit}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
