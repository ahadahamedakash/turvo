/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Invite Member Form
 *
 * Form for inviting new team members to a turf
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteMemberSchema } from "@/lib/schemas/tenant";
import { useCreateInvitation } from "@/hooks/invitations";
import { useRoles } from "@/hooks/roles";
import type { InviteMemberSchema } from "@/lib/schemas/tenant";
import { RHFInput, RHFSelect } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/form-actions";
import { Form } from "@/components/ui/form";
import { InfoIcon, Loader2 } from "lucide-react";

interface InviteMemberFormProps {
  tenantId: string;
  tenantName: string;
  onSuccess?: () => void;
}

/**
 * Invite member form component
 */
export function InviteMemberForm({
  tenantId,
  onSuccess,
}: InviteMemberFormProps) {
  const createInvitation = useCreateInvitation();
  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useRoles();

  // Transform roles for select options
  const roleOptions =
    roles?.map((role) => ({
      value: role.id,
      label: role.name,
      description: role.description || "",
    })) || [];

  const form = useForm<InviteMemberSchema>({
    resolver: zodResolver(inviteMemberSchema) as any,
    defaultValues: {
      email: "",
      roleId: "",
      expiresInDays: 7,
    },
    mode: "onBlur",
  });

  const onSubmit = async (values: InviteMemberSchema) => {
    const expiresInDays = Number(values.expiresInDays);

    createInvitation.mutate(
      {
        email: values.email,
        roleId: values.roleId,
        expiresInDays,
        tenantId,
      },
      {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
      },
    );
  };

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (rolesError) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-center text-xs text-destructive">
        Failed to load available roles. Please refresh the page.
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <RHFInput
          name="email"
          label="Email Address"
          placeholder="colleague@example.com"
          description="The person will receive an email invitation"
          required
        />

        <RHFSelect
          name="roleId"
          label="Role"
          placeholder="Select a role"
          options={roleOptions}
          description="Assign a role for this team member"
          required
        />

        <RHFSelect
          name="expiresInDays"
          label="Expiration"
          placeholder="Select expiration"
          options={[
            { value: "1", label: "1 day" },
            { value: "3", label: "3 days" },
            { value: "7", label: "7 days" },
            { value: "14", label: "14 days" },
            { value: "30", label: "30 days" },
          ]}
          description="How long the invitation link is valid"
        />

        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
          <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Invitation will be sent to{" "}
            <strong>{form.watch("email") || "the recipient"}</strong>. They can
            accept it within{" "}
            <strong>{form.watch("expiresInDays") || 7} days</strong>.
          </p>
        </div>

        <SubmitButton
          isLoading={createInvitation.isPending}
          loadingText="Sending invitation..."
          className="w-full"
        >
          Send Invitation
        </SubmitButton>
      </form>
    </Form>
  );
}
