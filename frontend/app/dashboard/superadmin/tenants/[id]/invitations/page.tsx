"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTenantInvitations } from "@/hooks/invitations";
import { InvitationsList } from "@/components/superadmin/invitations/invitations-list";
import { useTenant } from "@/hooks/tenants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InviteMemberForm } from "@/components/superadmin/invitations/invite-member-form";

export default function TenantInvitationsPage() {
  const { id } = useParams<{ id: string }>();
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Pending" | "Accepted" | "Revoked" | "Expired"
  >("All");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { data: tenant, isLoading: tenantLoading } = useTenant(id);
  const { data: invitations, isLoading: invitationsLoading } =
    useTenantInvitations(id, {
      status: statusFilter === "All" ? undefined : statusFilter,
    });

  if (tenantLoading || invitationsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center shadow-xs">
        <CardContent className="space-y-4 pt-4">
          <p className="text-xs text-destructive">
            Tenant organization not found.
          </p>
          <Button asChild size="sm" className="bg-teal-600 text-white text-xs">
            <Link href="/dashboard/superadmin/tenants">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Turfs List
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="h-9 w-9">
          <Link href={`/dashboard/superadmin/tenants/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to turf details</span>
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Team Invitations
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage onboarding invitations for <strong>{tenant.name}</strong>
          </p>
        </div>

        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Staff Member</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Invite Team Member
              </DialogTitle>
              <DialogDescription className="text-xs">
                Send an invitation to join <strong>{tenant.name}</strong>. They
                will receive an email with a signup token.
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

      {/* Invitations List Container */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-6">
          {invitations ? (
            <InvitationsList
              invitations={invitations.data}
              tenantId={id}
              onFilterChange={setStatusFilter}
              currentFilter={statusFilter}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                No invitations sent yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
