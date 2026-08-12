"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Key } from "lucide-react";
import { createPermissionSchema, type CreatePermissionInput, PermissionModule } from "@/lib/schemas/permission";
import { useCreatePermission } from "@/hooks/permissions";
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

interface CreatePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreatePermissionDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePermissionDialogProps) {
  const createPermission = useCreatePermission();

  const form = useForm<CreatePermissionInput>({
    resolver: zodResolver(createPermissionSchema),
    defaultValues: {
      module: PermissionModule.Booking,
      slug: "",
      name: "",
      description: "",
    },
  });

  const onSubmit = (values: CreatePermissionInput) => {
    createPermission.mutate(values, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-teal-600" />
            Create New Permission
          </DialogTitle>
          <DialogDescription>
            Create a new system permission. Slugs should follow the pattern:{" "}
            <code className="bg-muted px-1 py-0.5 rounded">module.action</code>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            <FormSection
              title="Permission Details"
              description="Define the permission scope and action"
            >
              <RHFSelect
                name="module"
                label="Module"
                placeholder="Select module"
                options={MODULE_OPTIONS}
                required
              />

              <RHFInput
                name="slug"
                label="Slug"
                placeholder="e.g. booking.create"
                required
              />

              <div className="text-xs text-muted-foreground">
                Format: <code>module.action</code> (e.g.,{" "}
                <code>booking.create</code>, <code>users.manage</code>)
              </div>

              <RHFInput
                name="name"
                label="Display Name"
                placeholder="e.g. Create Booking"
                required
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
                label: "Create Permission",
                loadingLabel: "Creating...",
                isLoading: createPermission.isPending,
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
