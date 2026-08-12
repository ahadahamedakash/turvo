"use client";

import { AlertTriangle } from "lucide-react";
import { useDeletePermission } from "@/hooks/permissions";
import type { Permission } from "@/lib/types/permission";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeletePermissionDialogProps {
  permission: Permission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeletePermissionDialog({
  permission,
  open,
  onOpenChange,
  onSuccess,
}: DeletePermissionDialogProps) {
  const deletePermission = useDeletePermission();

  const onSubmit = () => {
    if (!permission) return;

    deletePermission.mutate(permission.id, {
      onSuccess: () => {
        onOpenChange(false);
        onSuccess?.();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete Permission
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{permission?.name}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The permission will be permanently deleted.
          </p>

          {deletePermission.isError && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">
                {deletePermission.error?.message ||
                  "Failed to delete permission. It may be assigned to roles."}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={deletePermission.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onSubmit}
              disabled={deletePermission.isPending}
            >
              {deletePermission.isPending ? "Deleting..." : "Delete Permission"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
