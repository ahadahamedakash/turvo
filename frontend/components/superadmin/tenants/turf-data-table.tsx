/**
 * Turf Data Table
 *
 * Data table for listing and managing turfs/tenants
 */

"use client";

import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TurfStatusBadge } from "./turf-status-badge";
import { TurfActionMenu } from "./turf-action-menu";
import type { Tenant, TenantStatus } from "@/lib/types/tenant";
import { useDeleteTenant } from "@/hooks/tenants";
import { toast } from "sonner";

interface TenantListResponse {
  data: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TurfDataTableProps {
  data: TenantListResponse;
  onPageChange: (page: number) => void;
  onStatusFilter: (status: TenantStatus | "All") => void;
  onSearch: (search: string) => void;
  currentStatus: TenantStatus | "All";
  currentSearch: string;
}

/**
 * Empty state component
 */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
      <p className="text-center text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Pagination component
 */
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
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Turf data table component
 *
 * Features:
 * - Search by name/slug
 * - Filter by status
 * - Sortable columns
 * - Pagination
 * - Row actions
 */
export function TurfDataTable({
  data,
  onPageChange,
  onStatusFilter,
  onSearch,
  currentStatus,
  currentSearch,
}: TurfDataTableProps) {
  const deleteMutation = useDeleteTenant();

  const handleDelete = (id: string, name: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`"${name}" has been deleted`);
      },
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  if (data?.data?.length === 0) {
    return (
      <>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search turfs..."
              value={currentSearch}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>
          <Select value={currentStatus} onValueChange={onStatusFilter}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <EmptyState
          message={
            currentSearch
              ? `No turfs found matching "${currentSearch}"`
              : currentStatus !== "All"
                ? `No ${currentStatus.toLowerCase()} turfs found`
                : "No turfs yet. Create your first turf to get started."
          }
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and filter bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search turfs..."
            value={currentSearch}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        <Select value={currentStatus} onValueChange={onStatusFilter}>
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr className="text-left">
                <th className="p-4 text-sm font-medium text-muted-foreground">
                  Turf Name
                </th>
                <th className="p-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="p-4 text-sm font-medium text-muted-foreground">
                  Members
                </th>
                <th className="p-4 text-sm font-medium text-muted-foreground">
                  Created
                </th>
                <th className="p-4 text-sm font-medium text-muted-foreground w-12.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.data?.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="group transition-colors hover:bg-muted/50"
                >
                  <td className="p-4">
                    <Link
                      href={`/superadmin/tenants/${tenant.id}`}
                      className="font-medium hover:underline"
                    >
                      {tenant.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {tenant.slug}
                    </p>
                  </td>
                  <td className="p-4">
                    <TurfStatusBadge status={tenant.status} />
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/superadmin/tenants/${tenant.id}/members`}
                      className="text-sm hover:underline"
                    >
                      {tenant.memberCount} member
                      {tenant.memberCount !== 1 ? "s" : ""}
                    </Link>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(tenant.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-4">
                    <TurfActionMenu
                      tenantId={tenant.id}
                      tenantName={tenant.name}
                      onDelete={handleDelete}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={data?.page}
        totalPages={data?.totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
