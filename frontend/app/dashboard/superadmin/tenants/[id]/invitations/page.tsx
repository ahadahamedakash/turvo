/**
 * Tenant Invitations Page
 *
 * View and manage invitations for a specific tenant
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useInvitations } from '@/hooks/invitations'
import { InvitationsList } from '@/components/superadmin/invitations/invitations-list'
import { useTenant } from '@/hooks/tenants'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { InviteMemberForm } from '@/components/superadmin/invitations/invite-member-form'

interface TenantInvitationsPageProps {
  params: {
    id: string
  }
}

export default function TenantInvitationsPage({ params }: TenantInvitationsPageProps) {
  const { id } = params
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Accepted' | 'Revoked' | 'Expired'>('All')
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  const { data: tenant, isLoading: tenantLoading } = useTenant(id)
  const { data: invitations, isLoading: invitationsLoading } = useInvitations(id, {
    status: statusFilter === 'All' ? undefined : statusFilter,
  })

  if (tenantLoading || invitationsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Tenant not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/superadmin/tenants/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Invitations</h1>
          <p className="text-sm text-muted-foreground">
            Manage team invitations for <strong>{tenant.name}</strong>
          </p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join <strong>{tenant.name}</strong>. They'll
                receive an email with a signup link.
              </DialogDescription>
            </DialogHeader>
            <InviteMemberForm
              tenantId={id}
              tenantName={tenant.name}
              onSuccess={() => setInviteDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Invitations list */}
      <Card>
        <CardContent className="p-6">
          {invitations ? (
            <InvitationsList
              invitations={invitations.data}
              tenantId={id}
              onFilterChange={setStatusFilter}
              currentFilter={statusFilter}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Mail className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-center text-sm text-muted-foreground">
                No invitations yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
