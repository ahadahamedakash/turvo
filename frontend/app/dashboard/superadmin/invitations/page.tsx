"use client";

import { useState } from "react";
import { Mail, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInvitations } from "@/hooks/invitations";
import { InvitationsDataTable } from "@/components/superadmin/invitations/invitations-data-table";
import type { InvitationStatus } from "@/lib/types/invitation";

export default function InvitationsListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<InvitationStatus | "All">("All");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useInvitations({ page, status, search });

  const totalInvitations = data?.total ?? 0;
  const pendingInvitations = data?.data?.filter((i) => i.status === "Pending").length ?? 0;
  const acceptedInvitations = data?.data?.filter((i) => i.status === "Accepted").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-card p-6 border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-semibold uppercase text-teal-700 border-teal-600/30 bg-teal-50 dark:bg-teal-950">
              <ShieldAlert className="mr-1 h-3 w-3" /> Global Directory
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Team Invitations
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            View and manage all team invitation records across all turf organizations. Monitor pending invitations, revoke expired links, and track invitation history.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              setPage(1);
              setStatus("All");
              setSearch("");
            }}
          >
            <Sparkles className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-teal-200/30 bg-teal-50/30 dark:border-teal-900/50 dark:bg-teal-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Invitations</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalInvitations}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-teal-600/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/30 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground mt-1">{pendingInvitations}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-600/10 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200/30 bg-green-50/30 dark:border-green-900/50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold text-foreground mt-1">{acceptedInvitations}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-600/10 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-xl border bg-card/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center text-xs text-destructive">
            Failed to load invitations. Please refresh or verify network connection.
          </CardContent>
        </Card>
      )}

      {/* Main Data Table */}
      {!isLoading && !error && data && (
        <InvitationsDataTable
          data={data}
          onPageChange={setPage}
          onStatusFilter={setStatus}
          onSearch={setSearch}
          currentStatus={status}
          currentSearch={search}
        />
      )}
    </div>
  );
}
