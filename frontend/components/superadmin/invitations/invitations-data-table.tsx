"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Mail,
  Building2,
  Shield,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  MoreHorizontal,
  Copy,
  ExternalLink,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useDeleteInvitation, useRevokeInvitation } from "@/hooks/invitations";
import { getInviterName, getInviterTypeLabel, type Invitation, type InvitationStatus, type InvitationListResponse } from "@/lib/types/invitation";
import { toast } from "sonner";

interface InvitationsDataTableProps {
  data: InvitationListResponse;
  onPageChange: (page: number) => void;
  onStatusFilter: (status: InvitationStatus | "All") => void;
  onSearch: (search: string) => void;
  currentStatus: InvitationStatus | "All";
  currentSearch: string;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed bg-card/50 p-8 shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600/10 text-teal-600 mb-3">
        <Mail className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-base text-foreground">
        No Invitations Found
      </h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground">
        Showing Page{" "}
        <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
        <span className="font-semibold text-foreground">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  const variants: Record<InvitationStatus, string> = {
    Pending: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
    Accepted: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900",
    Revoked: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
    Expired: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900",
  };

  const icons: Record<InvitationStatus, React.ReactNode> = {
    Pending: <Clock className="h-3 w-3" />,
    Accepted: <CheckCircle className="h-3 w-3" />,
    Revoked: <XCircle className="h-3 w-3" />,
    Expired: <AlertCircle className="h-3 w-3" />,
  };

  return (
    <Badge variant="outline" className={variants[status]}>
      {icons[status]}
      <span className="ml-1">{status}</span>
    </Badge>
  );
}

function InviterTypeBadge({ invitation }: { invitation: Invitation }) {
  const isSuperadmin = !!invitation.invitedByUserId;
  const variant = isSuperadmin
    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-900"
    : "bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-950 dark:text-neutral-400 dark:border-neutral-900";

  return (
    <Badge variant="outline" className={variant}>
      <Shield className="h-3 w-3 mr-1" />
      <span>{getInviterTypeLabel(invitation)}</span>
    </Badge>
  );
}

function copyInviteLink(token: string) {
  const link = `${window.location.origin}/invitations/accept?token=${token}`;
  navigator.clipboard.writeText(link);
  toast.success("Invite link copied", {
    description: "Link has been copied to clipboard",
  });
}

function openInviteLink(token: string) {
  window.open(`${window.location.origin}/invitations/accept?token=${token}`, "_blank");
}

export function InvitationsDataTable({
  data,
  onPageChange,
  onStatusFilter,
  onSearch,
  currentStatus,
  currentSearch,
}: InvitationsDataTableProps) {
  const revokeMutation = useRevokeInvitation();
  const deleteMutation = useDeleteInvitation();

  const handleRevoke = (id: string, email: string) => {
    revokeMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`Invitation to ${email} revoked`);
      },
    });
  };

  const handleDelete = (id: string, email: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`Invitation to ${email} deleted`);
      },
    });
  };

  const invitationsList = data?.data ?? [];
  const pendingCount = invitationsList.filter((i) => i.status === "Pending").length;
  const acceptedCount = invitationsList.filter((i) => i.status === "Accepted").length;

  return (
    <div className="space-y-4">
      {/* Quick Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/50 border border-blue-200/30">
          <Clock className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-medium text-foreground">{pendingCount}</span>
          <span className="text-muted-foreground">Pending</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50/50 border border-green-200/30">
          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
          <span className="font-medium text-foreground">{acceptedCount}</span>
          <span className="text-muted-foreground">Accepted</span>
        </div>
        <div className="ml-auto text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{data?.total ?? 0}</span> invitations
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or tenant name..."
              value={currentSearch}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-card"
            />
          </div>

          <Select value={currentStatus} onValueChange={onStatusFilter}>
            <SelectTrigger className="w-40 h-9 text-xs bg-card">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Revoked">Revoked</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Empty State */}
      {invitationsList.length === 0 ? (
        <EmptyState
          message={
            currentSearch
              ? `No invitations matching "${currentSearch}"`
              : currentStatus !== "All"
                ? `No ${currentStatus.toLowerCase()} invitations found`
                : "No invitations created yet."
          }
        />
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5 pl-4">Email & Role</th>
                  <th className="p-3.5">Tenant</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Invited By</th>
                  <th className="p-3.5">Expires</th>
                  <th className="p-3.5">Created</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {invitationsList.map((invitation) => (
                  <tr
                    key={invitation.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{invitation.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          {invitation.role?.name || "Unknown Role"}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-teal-600" />
                        <span className="font-medium text-foreground">
                          {invitation.tenant?.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <InvitationStatusBadge status={invitation.status} />
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-muted-foreground">
                          {getInviterName(invitation)}
                        </span>
                        <InviterTypeBadge invitation={invitation} />
                      </div>
                    </td>
                    <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                      {new Date(invitation.expiresAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                      {new Date(invitation.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-3.5 text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {invitation.status === "Pending" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => copyInviteLink(invitation.token)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Invite Link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openInviteLink(invitation.token)}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Invite Page
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleRevoke(invitation.id, invitation.email)}
                                disabled={revokeMutation.isPending}
                                className="text-amber-600 focus:text-amber-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Revoke
                              </DropdownMenuItem>
                            </>
                          )}
                          {invitation.status === "Accepted" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  const userName = invitation.acceptedByUser
                                    ? `${invitation.acceptedByUser.firstName} ${invitation.acceptedByUser.lastName}`
                                    : "Unknown";
                                  toast.info("Accepted by", {
                                    description: userName,
                                  });
                                }}
                              >
                                <User className="h-4 w-4 mr-2" />
                                View Accepting User
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(invitation.id, invitation.email)}
                            disabled={deleteMutation.isPending}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        onPageChange={onPageChange}
      />
    </div>
  );
}
