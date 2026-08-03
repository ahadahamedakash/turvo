/**
 * Turf Detail Page
 *
 * Detailed view of a single turf/tenant with members list
 */

"use client";

import Link from "next/link";
import { ArrowLeft, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/hooks/tenants";
import { TurfDetailCard } from "@/components/superadmin/tenants/turf-detail-card";
import { TurfMembersList } from "@/components/superadmin/tenants/turf-members-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InviteMemberForm } from "@/components/superadmin/invitations/invite-member-form";
import { useState } from "react";
import { useParams } from "next/navigation";

export default function TurfDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: tenant, isLoading, error } = useTenant(id);

  console.log("TENANT DATA: ", tenant);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Turf Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The turf you&apos;re looking for doesn&apos;t exist or you don&apos;t
          have access to it.
        </p>
        <Button asChild className="mt-6">
          <Link href="/superadmin/tenants">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Turfs
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/superadmin/tenants">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Turf Details
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage turf information
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
                Send an invitation to join <strong>{tenant.name}</strong>.
                They&apos;ll receive an email with a signup link.
              </DialogDescription>
            </DialogHeader>
            <InviteMemberForm
              tenantId={id}
              tenantName={tenant.name}
              onSuccess={() => setInviteDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <Button variant="outline" asChild>
          <Link href={`/superadmin/tenants/${id}/invitations`}>
            <Mail className="mr-2 h-4 w-4" />
            Invitations
          </Link>
        </Button>
      </div>

      {/* Turf detail card */}
      <TurfDetailCard tenant={tenant} />

      {/* Members list */}
      <TurfMembersList tenantId={id} tenantName={tenant.name} />
    </div>
  );
}
