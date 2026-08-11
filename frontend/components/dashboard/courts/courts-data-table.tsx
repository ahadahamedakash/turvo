"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Building2,
  Calendar,
  CheckCircle,
  Wrench,
  XCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  RotateCcw,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteCourt, useRestoreCourt } from "@/hooks/courts";
import type { Court, CourtListResponse, CourtStatus } from "@/lib/types/court";

interface CourtsDataTableProps {
  data: CourtListResponse;
  onPageChange: (page: number) => void;
  onStatusFilter: (status: CourtStatus | "All") => void;
  onSearch: (search: string) => void;
  onIncludeDeletedToggle: (include: boolean) => void;
  currentStatus: CourtStatus | "All";
  currentSearch: string;
  includeDeleted: boolean;
  onEditClick: (court: Court) => void;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed bg-card/50 p-8 shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600/10 text-teal-600 mb-3">
        <Building2 className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-base text-foreground">
        No Courts Found
      </h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground">
        Showing Page{" "}
        <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
        <span className="font-semibold text-foreground">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function CourtStatusBadge({ status }: { status: CourtStatus }) {
  const variants: Record<CourtStatus, string> = {
    Available: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900",
    Maintenance: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
    Inactive: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
  };

  const icons: Record<CourtStatus, React.ReactNode> = {
    Available: <CheckCircle className="h-3 w-3" />,
    Maintenance: <Wrench className="h-3 w-3" />,
    Inactive: <XCircle className="h-3 w-3" />,
  };

  return (
    <Badge variant="outline" className={variants[status]}>
      {icons[status]}
      <span className="ml-1">{status}</span>
    </Badge>
  );
}

export function CourtsDataTable({
  data,
  onPageChange,
  onStatusFilter,
  onSearch,
  onIncludeDeletedToggle,
  currentStatus,
  currentSearch,
  includeDeleted,
  onEditClick,
}: CourtsDataTableProps) {
  const deleteMutation = useDeleteCourt();
  const restoreMutation = useRestoreCourt();

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action can be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleRestore = (id: string, name: string) => {
    restoreMutation.mutate(id);
  };

  const courtsList = data?.data ?? [];
  const availableCount = courtsList.filter((c) => c.status === "Available").length;
  const maintenanceCount = courtsList.filter((c) => c.status === "Maintenance").length;
  const inactiveCount = courtsList.filter((c) => c.status === "Inactive").length;

  return (
    <div className="space-y-4">
      {/* Quick Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50/50 border border-green-200/30">
          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
          <span className="font-medium text-foreground">{availableCount}</span>
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50/50 border border-amber-200/30">
          <Wrench className="h-3.5 w-3.5 text-amber-600" />
          <span className="font-medium text-foreground">{maintenanceCount}</span>
          <span className="text-muted-foreground">Maintenance</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50/50 border border-red-200/30">
          <XCircle className="h-3.5 w-3.5 text-red-600" />
          <span className="font-medium text-foreground">{inactiveCount}</span>
          <span className="text-muted-foreground">Inactive</span>
        </div>
        <div className="ml-auto text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{data?.total ?? 0}</span> courts
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or description..."
              value={currentSearch}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-card"
            />
          </div>

          <Select value={currentStatus} onValueChange={onStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs bg-card">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={includeDeleted ? "default" : "outline"}
            size="sm"
            className="h-9 text-xs"
            onClick={() => onIncludeDeletedToggle(!includeDeleted)}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Deleted
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {courtsList.length === 0 ? (
        <EmptyState
          message={
            currentSearch
              ? `No courts matching "${currentSearch}"`
              : currentStatus !== "All"
                ? `No ${currentStatus.toLowerCase()} courts found`
                : "No courts created yet. Create your first court to get started."
          }
        />
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5 pl-4">Court Name</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Bookings</th>
                  <th className="p-3.5">Slots</th>
                  <th className="p-3.5">Pricing Rules</th>
                  <th className="p-3.5">Created</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {courtsList.map((court) => (
                  <tr
                    key={court.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-teal-600" />
                        <span className="font-medium text-foreground">{court.name}</span>
                      </div>
                      {court.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 max-w-[200px]">
                          {court.description}
                        </p>
                      )}
                    </td>
                    <td className="p-3.5">
                      <CourtStatusBadge status={court.status} />
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <Ticket className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-foreground">{court.bookingCount}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {court.slotCount}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {court.pricingRuleCount}
                    </td>
                    <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                      {new Date(court.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-3.5 text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => onEditClick(court)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Court
                          </DropdownMenuItem>
                          {court.deletedAt ? (
                            <DropdownMenuItem
                              onClick={() => handleRestore(court.id, court.name)}
                              disabled={restoreMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleDelete(court.id, court.name)}
                              disabled={deleteMutation.isPending}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        onPageChange={onPageChange}
      />
    </div>
  );
}
