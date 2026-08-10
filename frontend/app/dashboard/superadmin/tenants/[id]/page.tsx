"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, UserPlus, Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export default function TurfDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: tenant, isLoading, error, refetch } = useTenant(id);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center shadow-xs">
        <CardContent className="space-y-4 pt-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 mx-auto">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Turf Organization Not Found</h2>
          <p className="text-xs text-muted-foreground">
            The turf ID may be invalid, or you do not have administrative privileges to view this organization.
          </p>
          <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs">
            <Link href="/dashboard/superadmin/tenants">
              <ArrowLeft className="h-4 w-4" />
              Return to Turfs List
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-9 w-9">
            <Link href="/dashboard/superadmin/tenants">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to turfs list</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {tenant.name}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Tenant ID: {tenant.id}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white">
                <UserPlus className="h-4 w-4" />
                <span>Invite Staff Member</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">Invite Team Member</DialogTitle>
                <DialogDescription className="text-xs">
                  Send an email invitation to onboard a new staff member for <strong>{tenant.name}</strong>.
                </DialogDescription>
              </DialogHeader>
              <InviteMemberForm
                tenantId={id}
                tenantName={tenant.name}
                onSuccess={() => setInviteDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
            <Link href={`/dashboard/superadmin/tenants/${id}/invitations`}>
              <Mail className="h-4 w-4 text-teal-600" />
              <span>Invitations Log</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Hero Turf Detail Card */}
      <TurfDetailCard tenant={tenant} onRefresh={refetch} />

      {/* Turf Members List */}
      <TurfMembersList tenantId={id} tenantName={tenant.name} limit={10} />
    </div>
  );
}
