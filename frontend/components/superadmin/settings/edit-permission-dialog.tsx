"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Key } from "lucide-react";
import { updatePermissionSchema, type UpdatePermissionInput, PermissionModule } from "@/lib/schemas/permission";
import { useUpdatePermission } from "@/hooks/permissions";
import type { Permission } from "@/lib/types/permission";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { RHFInput, RHFSelect, RHFTextarea } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-layout";
import { FormActions } from "@/components/forms/form-actions";

const MODULE_OPTIONS = [
  { value: PermissionModule.Booking, label: "Booking" },
  { value: PermissionModule.Customer, label: "Customer" },
  { value: PermissionModule.Court, label: "Court" },
  { value: PermissionModule.Payment, label: "Payment" },
  { value: PermissionModule.Reports, label: "Reports" },
  { value: PermissionModule.Users, label: "Users" },
];

interface EditPermissionDialogProps {
  permission: Permission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditPermissionDialog({
  permission,
  open,
  onOpenChange,
  onSuccess,
}: EditPermissionDialogProps) {
  const updatePermission = useUpdatePermission();

  const form = useForm<UpdatePermissionInput>({
    resolver: zodResolver(updatePermissionSchema),
    defaultValues: {
      module: PermissionModule.Booking,
      slug: "",
      name: "",
      description: "",
    },
  });

  // Populate form values when permission changes
  useEffect(() => {
    if (permission) {
      form.reset({
        module: permission.module as PermissionModule,
        slug: permission.slug,
        name: permission.name,
        description: permission.description || "",
      });
    }
  }, [permission, form]);

  const onSubmit = (values: UpdatePermissionInput) => {
    if (!permission) return;

    updatePermission.mutate(
      {
        id: permission.id,
        data: values,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-teal-600" />
            Edit Permission
          </DialogTitle>
          <DialogDescription>
            Update permission details for <strong>{permission?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            <FormSection
              title="Permission Details"
              description="Update the permission information"
            >
              <RHFSelect
                name="module"
                label="Module"
                placeholder="Select module"
                options={MODULE_OPTIONS}
              />

              <RHFInput
                name="slug"
                label="Slug"
                placeholder="e.g. booking.create"
              />

              <div className="text-xs text-muted-foreground">
                Format: <code>module.action</code> (e.g.,{" "}
                <code>booking.create</code>, <code>users.manage</code>)
              </div>

              <RHFInput
                name="name"
                label="Display Name"
                placeholder="e.g. Create Booking"
              />

              <RHFTextarea
                name="description"
                label="Description"
                placeholder="What does this permission allow?"
                rows={2}
              />
            </FormSection>

            <FormActions
              primary={{
                label: "Save Changes",
                loadingLabel: "Updating...",
                isLoading: updatePermission.isPending,
              }}
              secondary={{
                label: "Cancel",
                onClick: () => onOpenChange(false),
              }}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
