"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import {
  updateTenantSchema,
  type UpdateTenantSchema,
} from "@/lib/schemas/tenant";
import { useUpdateTenant } from "@/hooks/tenants";
import type { Tenant } from "@/lib/types/tenant";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  RHFInput,
  RHFTextarea,
  RHFSelect,
} from "@/components/forms/form-field";
import { FormGrid, FormSection } from "@/components/forms/form-layout";
import { FormActions, FormError } from "@/components/forms/form-actions";

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (Universal Coordinated Time)" },
  { value: "Asia/Dhaka", label: "Bangladesh Standard Time (Asia/Dhaka)" },
  { value: "Asia/Kolkata", label: "India Standard Time (Asia/Kolkata)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (Asia/Dubai)" },
  { value: "Asia/Singapore", label: "Singapore Time (Asia/Singapore)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
];

const HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  const display =
    hour === 0
      ? `12:${minute.toString().padStart(2, "0")} AM`
      : hour < 12
        ? `${hour}:${minute.toString().padStart(2, "0")} AM`
        : hour === 12
          ? `12:${minute.toString().padStart(2, "0")} PM`
          : `${hour - 12}:${minute.toString().padStart(2, "0")} PM`;
  return { value, label: display };
});

interface EditTurfDialogProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditTurfDialog({
  tenant,
  open,
  onOpenChange,
  onSuccess,
}: EditTurfDialogProps) {
  const updateTenant = useUpdateTenant();

  const form = useForm<UpdateTenantSchema>({
    resolver: zodResolver(updateTenantSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      timezone: "",
      website: "",
      openingHour: "",
      closingHour: "",
    },
  });

  // Helper function to extract HH:mm from a time value.
  // Handles both shapes the backend can return:
  //  - raw ISO: "1970-01-01T06:00:00.000Z" -> extract "06:00"
  //  - already formatted: "06:00" -> use as-is
  const formatTimeFromDb = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    return dateStr.includes("T") ? dateStr.slice(11, 16) : dateStr;
  };

  // Populate form values when tenant changes
  useEffect(() => {
    if (tenant) {
      form.reset({
        name: tenant.name || "",
        description: tenant.description || "",
        address: tenant.address || "",
        timezone: tenant.timezone || "",
        website: tenant.website || "",
        openingHour: formatTimeFromDb(tenant.openingHour),
        closingHour: formatTimeFromDb(tenant.closingHour),
      });
    }
  }, [tenant, form]);

  const onSubmit = (values: UpdateTenantSchema) => {
    if (!tenant) return;

    updateTenant.mutate(
      {
        id: tenant.id,
        data: {
          ...values,
          // Ensure empty strings are handled properly
          description: values.description || undefined,
          address: values.address || undefined,
          timezone: values.timezone || undefined,
          website: values.website || undefined,
          openingHour: values.openingHour || undefined,
          closingHour: values.closingHour || undefined,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      },
    );
  };

  const openingHour = form.watch("openingHour");
  const closingHour = form.watch("closingHour");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-teal-600" />
            Edit Turf Organization
          </DialogTitle>
          <DialogDescription className="text-xs">
            Update details for <strong>{tenant?.name}</strong> (Slug:{" "}
            {tenant?.slug})
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 pt-2"
          >
            <FormSection
              title="Basic Details"
              description="Primary organization identification"
            >
              <FormGrid>
                <RHFInput
                  name="name"
                  label="Turf Name"
                  placeholder="e.g. Dhaka Turf Arena"
                  required
                  colSpan={2}
                />

                <RHFTextarea
                  name="description"
                  label="Description"
                  placeholder="Brief description of the turf..."
                  rows={2}
                  colSpan={2}
                />

                <RHFTextarea
                  name="address"
                  label="Address"
                  placeholder="Physical street address..."
                  rows={2}
                  colSpan={2}
                />
              </FormGrid>
            </FormSection>

            <FormSection
              title="Contact & Timing"
              description="Website, timezone, and operating hours"
            >
              <FormGrid>
                <RHFInput
                  name="website"
                  label="Website URL"
                  placeholder="https://example.com"
                  colSpan={2}
                />

                <RHFSelect
                  name="timezone"
                  label="Timezone"
                  placeholder="Select timezone"
                  options={TIMEZONE_OPTIONS}
                  colSpan={2}
                />

                <RHFSelect
                  name="openingHour"
                  label="Opening Time"
                  placeholder="Opening time"
                  options={HOUR_OPTIONS}
                  colSpan={1}
                />

                <RHFSelect
                  name="closingHour"
                  label="Closing Time"
                  placeholder="Closing time"
                  options={HOUR_OPTIONS}
                  colSpan={1}
                />
              </FormGrid>

              {form.formState.errors.closingHour &&
                openingHour &&
                closingHour &&
                closingHour <= openingHour && (
                  <FormError message="Closing time must be after opening time" />
                )}
            </FormSection>

            <FormActions
              primary={{
                label: "Save Changes",
                loadingLabel: "Saving...",
                isLoading: updateTenant.isPending,
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
