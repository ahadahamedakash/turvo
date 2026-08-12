"use client";

import { AlertTriangle } from "lucide-react";
import { useDeleteRole } from "@/hooks/roles";
import type { Role } from "@/lib/types/role";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteRoleDialogProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteRoleDialog({
  role,
  open,
  onOpenChange,
  onSuccess,
}: DeleteRoleDialogProps) {
  const deleteRole = useDeleteRole();

  const onSubmit = () => {
    if (!role) return;

    deleteRole.mutate(role.id, {
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
            Delete Role
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{role?.name}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The role will be permanently deleted.
          </p>

          {deleteRole.isError && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">
                {deleteRole.error?.message ||
                  "Failed to delete role. It may be assigned to users."}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={deleteRole.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onSubmit}
              disabled={deleteRole.isPending}
            >
              {deleteRole.isPending ? "Deleting..." : "Delete Role"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
