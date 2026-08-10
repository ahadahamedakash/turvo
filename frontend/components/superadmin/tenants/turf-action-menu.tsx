"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useUpdateTenant } from "@/hooks/tenants";
import type { Tenant, TenantStatus } from "@/lib/types/tenant";

interface TurfActionMenuProps {
  tenant: Tenant;
  onEdit?: (tenant: Tenant) => void;
  onDelete?: (id: string, name: string) => void;
}

export function TurfActionMenu({
  tenant,
  onEdit,
  onDelete,
}: TurfActionMenuProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const router = useRouter();
  const updateTenant = useUpdateTenant();

  const handleStatusChange = (newStatus: TenantStatus) => {
    updateTenant.mutate({
      id: tenant.id,
      data: { status: newStatus },
    });
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(tenant.id, tenant.name);
      setDeleteConfirm(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[11px] font-semibold uppercase text-muted-foreground">
          Tenant Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => router.push(`/dashboard/superadmin/tenants/${tenant.id}`)}
          className="gap-2 cursor-pointer text-xs"
        >
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <span>View Details</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => (onEdit ? onEdit(tenant) : router.push(`/dashboard/superadmin/tenants/${tenant.id}`))}
          className="gap-2 cursor-pointer text-xs"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Edit Details</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground/80 font-semibold">
          Change Status
        </DropdownMenuLabel>

        {tenant.status !== "Active" && (
          <DropdownMenuItem
            onClick={() => handleStatusChange("Active")}
            className="gap-2 cursor-pointer text-xs text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Set to Active</span>
          </DropdownMenuItem>
        )}

        {tenant.status !== "Inactive" && (
          <DropdownMenuItem
            onClick={() => handleStatusChange("Inactive")}
            className="gap-2 cursor-pointer text-xs text-amber-600 dark:text-amber-400"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Set to Inactive</span>
          </DropdownMenuItem>
        )}

        {tenant.status !== "Suspended" && (
          <DropdownMenuItem
            onClick={() => handleStatusChange("Suspended")}
            className="gap-2 cursor-pointer text-xs text-rose-600 dark:text-rose-400"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Suspend Turf</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {!deleteConfirm ? (
          <DropdownMenuItem
            onClick={() => setDeleteConfirm(true)}
            className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Turf</span>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              onClick={handleDelete}
              className="gap-2 cursor-pointer text-xs font-semibold text-destructive bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Confirm Delete</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteConfirm(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
