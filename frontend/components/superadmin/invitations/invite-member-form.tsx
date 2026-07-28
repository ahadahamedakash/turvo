/**
 * Invite Member Form
 *
 * Form for inviting new team members to a turf
 */

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inviteMemberSchema } from '@/lib/schemas/tenant'
import { useCreateInvitation } from '@/hooks/invitations'
import type { InviteMemberSchema } from '@/lib/schemas/tenant'
import { RHFInput, RHFSelect } from '@/components/forms/form-field'
import { SubmitButton } from '@/components/forms/form-actions'
import { Form } from '@/components/ui/form'
import { InfoIcon } from 'lucide-react'

interface InviteMemberFormProps {
  tenantId: string
  tenantName: string
  onSuccess?: () => void
}

/**
 * Available roles for invitation
 * TODO: Fetch from API
 */
const AVAILABLE_ROLES = [
  { value: 'admin-role-id', label: 'Admin', description: 'Full access to all features' },
  { value: 'staff-role-id', label: 'Staff', description: 'Can manage bookings and customers' },
]

/**
 * Invite member form component
 */
export function InviteMemberForm({ tenantId, tenantName, onSuccess }: InviteMemberFormProps) {
  const createInvitation = useCreateInvitation()

  const form = useForm<InviteMemberSchema>({
    resolver: zodResolver(inviteMemberSchema) as any,
    defaultValues: {
      email: '',
      roleId: '',
      expiresInDays: 7,
    },
    mode: 'onBlur',
  })

  const onSubmit = async (values: InviteMemberSchema) => {
    createInvitation.mutate(
      {
        ...values,
        tenantId,
      },
      {
        onSuccess: () => {
          form.reset()
          onSuccess?.()
        },
      }
    )
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
          options={AVAILABLE_ROLES}
          description="Assign a role for this team member"
          required
        />

        <RHFSelect
          name="expiresInDays"
          label="Expiration"
          placeholder="Select expiration"
          options={[
            { value: '1', label: '1 day' },
            { value: '3', label: '3 days' },
            { value: '7', label: '7 days' },
            { value: '14', label: '14 days' },
            { value: '30', label: '30 days' },
          ]}
          description="How long the invitation link is valid"
        />

        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
          <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Invitation will be sent to <strong>{form.watch('email') || 'the recipient'}</strong>.
            They can accept it within <strong>{form.watch('expiresInDays') || 7} days</strong>.
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
  )
}
