"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield } from "lucide-react";
import { updateRoleSchema, type UpdateRoleInput } from "@/lib/schemas/role";
import { useUpdateRole } from "@/hooks/roles";
import type { Role } from "@/lib/types/role";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { RHFInput, RHFTextarea } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-layout";
import { FormActions } from "@/components/forms/form-actions";

interface EditRoleDialogProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditRoleDialog({
  role,
  open,
  onOpenChange,
  onSuccess,
}: EditRoleDialogProps) {
  const updateRole = useUpdateRole();

  const form = useForm<UpdateRoleInput>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Populate form values when role changes
  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name || "",
        description: role.description || "",
      });
    }
  }, [role, form]);

  // Watch name for slug preview
  const watchedName = form.watch("name");

  // Generate slug preview (only if name is being edited)
  const slugPreview =
    watchedName && watchedName !== role?.name
      ? watchedName
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
      : role?.slug;

  const onSubmit = (values: UpdateRoleInput) => {
    if (!role) return;

    updateRole.mutate(
      {
        id: role.id,
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
            <Shield className="h-5 w-5 text-teal-600" />
            Edit Role
          </DialogTitle>
          <DialogDescription>
            Update role details for <strong>{role?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            <FormSection
              title="Role Details"
              description="Update the role information"
            >
              <RHFInput
                name="name"
                label="Role Name"
                placeholder="e.g. Turf Manager"
              />

              {slugPreview && (
                <div className="text-xs text-muted-foreground">
                  {watchedName && watchedName !== role?.name ? (
                    <>New slug preview: <code className="bg-muted px-1 py-0.5 rounded">{slugPreview}</code></>
                  ) : (
                    <>Current slug: <code className="bg-muted px-1 py-0.5 rounded">{slugPreview}</code></>
                  )}
                </div>
              )}

              <RHFTextarea
                name="description"
                label="Description"
                placeholder="What permissions does this role have?"
                rows={3}
              />
            </FormSection>

            <FormActions
              primary={{
                label: "Save Changes",
                loadingLabel: "Updating...",
                isLoading: updateRole.isPending,
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
