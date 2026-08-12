"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield } from "lucide-react";
import { createRoleSchema, type CreateRoleInput } from "@/lib/schemas/role";
import { useCreateRole } from "@/hooks/roles";
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
import { useState } from "react";

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateRoleDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateRoleDialogProps) {
  const createRole = useCreateRole();
  const [name, setName] = useState("");

  const form = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Watch name for slug preview
  const watchedName = form.watch("name");

  // Generate slug preview
  const slugPreview = watchedName
    ? watchedName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
    : "";

  const onSubmit = (values: CreateRoleInput) => {
    createRole.mutate(values, {
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
            <Shield className="h-5 w-5 text-teal-600" />
            Create New Role
          </DialogTitle>
          <DialogDescription>
            Create a new role with custom permissions. The slug will be auto-generated from the name.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            <FormSection
              title="Role Details"
              description="Basic information for the new role"
            >
              <RHFInput
                name="name"
                label="Role Name"
                placeholder="e.g. Turf Manager"
                required
              />

              {slugPreview && (
                <div className="text-xs text-muted-foreground">
                  Slug preview: <code className="bg-muted px-1 py-0.5 rounded">{slugPreview}</code>
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
                label: "Create Role",
                loadingLabel: "Creating...",
                isLoading: createRole.isPending,
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
