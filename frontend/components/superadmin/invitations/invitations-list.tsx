/**
 * Invitations List Component
 *
 * Displays invitations with filtering and actions
 */

"use client";

import { Mail, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRevokeInvitation } from "@/hooks/invitations";
import type { Invitation, InvitationStatus } from "@/lib/types/invitation";
import { toast } from "sonner";

interface InvitationsListProps {
  invitations: Invitation[];
  tenantId: string;
  onFilterChange?: (status: InvitationStatus | "All") => void;
  currentFilter?: InvitationStatus | "All";
}

/**
 * Status icon for invitation
 */
function StatusIcon({ status }: { status: InvitationStatus }) {
  switch (status) {
    case "Pending":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "Accepted":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "Revoked":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "Expired":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  }
}

/**
 * Status badge for invitation
 */
function StatusBadge({ status }: { status: InvitationStatus }) {
  const variants: Record<InvitationStatus, string> = {
    Pending:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
    Accepted:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900",
    Revoked:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
    Expired:
      "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900",
  };

  return (
    <Badge variant="outline" className={variants[status]}>
      <StatusIcon status={status} />
      <span className="ml-1">{status}</span>
    </Badge>
  );
}

/**
 * Empty state component
 */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Mail className="mb-4 h-12 w-12 text-muted-foreground/50" />
      <p className="text-center text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Invitations list component
 *
 * Shows:
 * - Filter by status
 * - List of invitations with role, email, status, expiry
 * - Revoke action for pending invitations
 */
export function InvitationsList({
  invitations,
  tenantId,
  onFilterChange,
  currentFilter = "All",
}: InvitationsListProps) {
  const revokeInvitation = useRevokeInvitation();

  const handleRevoke = (invitation: Invitation) => {
    revokeInvitation.mutate(invitation.id, {
      onSuccess: () => {
        toast.success(`Invitation to ${invitation.email} revoked`);
      },
    });
  };

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "Pending",
  );
  const otherInvitations = invitations.filter(
    (inv) => inv.status !== "Pending",
  );

  return (
    <div className="space-y-6">
      {/* Filter controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Pending Invitations ({pendingInvitations.length})
        </h2>
        {onFilterChange && (
          <Select value={currentFilter} onValueChange={onFilterChange}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Revoked">Revoked</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr className="text-left">
                <th className="p-4 text-sm font-medium text-muted-foreground">
                  Email
                </th>
                <th className="p-4 text-sm font-medium text-muted-foreground">
                  Role
                </th>
                <th className="p-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="p-4 text-sm font-medium text-muted-foreground">
                  Expires
                </th>
                <th className="p-4 text-sm font-medium text-muted-foreground w-25">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pendingInvitations.map((invitation) => (
                <tr
                  key={invitation.id}
                  className="transition-colors hover:bg-muted/50"
                >
                  <td className="p-4">{invitation.email}</td>
                  <td className="p-4">{invitation.role?.name || "—"}</td>
                  <td className="p-4">
                    <StatusBadge status={invitation.status} />
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(invitation)}
                      disabled={revokeInvitation.isPending}
                    >
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState message="No pending invitations" />
      )}

      {/* All invitations history */}
      {currentFilter === "All" && otherInvitations.length > 0 && (
        <>
          <h2 className="text-lg font-medium">Invitation History</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr className="text-left">
                  <th className="p-4 text-sm font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="p-4 text-sm font-medium text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {otherInvitations.map((invitation) => (
                  <tr
                    key={invitation.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <td className="p-4">{invitation.email}</td>
                    <td className="p-4">{invitation.role?.name || "—"}</td>
                    <td className="p-4">
                      <StatusBadge status={invitation.status} />
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
