"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutGrid,
  List,
  Users,
  MapPin,
  Globe,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TurfStatusBadge } from "./turf-status-badge";
import { TurfActionMenu } from "./turf-action-menu";
import { EditTurfDialog } from "./edit-turf-dialog";
import type {
  Tenant,
  TenantStatus,
  TenantListResponse,
} from "@/lib/types/tenant";
import { useDeleteTenant } from "@/hooks/tenants";
import { toast } from "sonner";

interface TurfDataTableProps {
  data: TenantListResponse;
  onPageChange: (page: number) => void;
  onStatusFilter: (status: TenantStatus | "All") => void;
  onSearch: (search: string) => void;
  currentStatus: TenantStatus | "All";
  currentSearch: string;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed bg-card/50 p-8 shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600/10 text-teal-600 mb-3">
        <Building2 className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-base text-foreground">
        No Turfs Found
      </h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">{message}</p>
      <Button
        asChild
        size="sm"
        className="mt-4 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs"
      >
        <Link href="/dashboard/superadmin/tenants/new">
          <Plus className="h-3.5 w-3.5" /> Create New Turf
        </Link>
      </Button>
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

export function TurfDataTable({
  data,
  onPageChange,
  onStatusFilter,
  onSearch,
  currentStatus,
  currentSearch,
}: TurfDataTableProps) {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const deleteMutation = useDeleteTenant();

  const handleDelete = (id: string, name: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`"${name}" has been deleted`);
      },
    });
  };

  const handleEditClick = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsEditDialogOpen(true);
  };

  const tenantsList = data?.data ?? [];

  return (
    <div className="space-y-4">
      {/* Search, Filter & View Mode Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by turf name or slug..."
              value={currentSearch}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-card"
            />
          </div>

          <Select value={currentStatus} onValueChange={onStatusFilter}>
            <SelectTrigger className="w-40 h-9 text-xs bg-card">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-xs self-start sm:self-auto">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs gap-1.5"
            onClick={() => setViewMode("table")}
          >
            <List className="h-3.5 w-3.5" />
            <span>Table</span>
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs gap-1.5"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Grid</span>
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {tenantsList.length === 0 ? (
        <EmptyState
          message={
            currentSearch
              ? `No turf organizations matching "${currentSearch}"`
              : currentStatus !== "All"
                ? `No ${currentStatus.toLowerCase()} turfs found`
                : "No turf organizations created yet."
          }
        />
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5 pl-4">Turf Name & Slug</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Address</th>
                  <th className="p-3.5">Staff Members</th>
                  <th className="p-3.5">Created Date</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {tenantsList.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <td className="p-3.5 pl-4">
                      <Link
                        href={`/dashboard/superadmin/tenants/${tenant.id}`}
                        className="font-semibold text-foreground hover:text-teal-600 dark:hover:text-teal-400"
                      >
                        {tenant.name}
                      </Link>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        /{tenant.slug}
                      </p>
                    </td>
                    <td className="p-3.5">
                      <TurfStatusBadge status={tenant.status} />
                    </td>
                    <td className="p-3.5 text-muted-foreground max-w-xs truncate">
                      {tenant.address || "No address provided"}
                    </td>
                    <td className="p-3.5">
                      <Link
                        href={`/dashboard/superadmin/tenants/${tenant.id}`}
                        className="flex items-center gap-1.5 font-medium text-foreground hover:underline"
                      >
                        <Users className="h-3.5 w-3.5 text-teal-600" />
                        <span>{tenant.memberCount ?? 0} staff</span>
                      </Link>
                    </td>
                    <td className="p-3.5 text-muted-foreground font-mono">
                      {new Date(tenant.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-3.5 text-right pr-4">
                      <TurfActionMenu
                        tenant={tenant}
                        onEdit={handleEditClick}
                        onDelete={handleDelete}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenantsList.map((tenant) => (
            <Card
              key={tenant.id}
              className="flex flex-col justify-between transition-all duration-200 hover:border-teal-500/40 hover:shadow-md"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 overflow-hidden">
                    <Link
                      href={`/dashboard/superadmin/tenants/${tenant.id}`}
                      className="font-bold text-sm text-foreground hover:text-teal-600 dark:hover:text-teal-400 line-clamp-1"
                    >
                      {tenant.name}
                    </Link>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      /{tenant.slug}
                    </p>
                  </div>
                  <TurfStatusBadge status={tenant.status} />
                </div>

                <div className="space-y-2 text-xs text-muted-foreground pt-1">
                  {tenant.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      <span className="truncate">{tenant.address}</span>
                    </div>
                  )}

                  {tenant.timezone && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      <span>{tenant.timezone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                    <span>
                      {tenant.memberCount ?? 0} registered staff members
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Created {new Date(tenant.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-7 text-[11px]"
                    >
                      <Link href={`/dashboard/superadmin/tenants/${tenant.id}`}>
                        View Details
                      </Link>
                    </Button>
                    <TurfActionMenu
                      tenant={tenant}
                      onEdit={handleEditClick}
                      onDelete={handleDelete}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        onPageChange={onPageChange}
      />

      {/* Edit Tenant Dialog */}
      <EditTurfDialog
        tenant={editingTenant}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}
