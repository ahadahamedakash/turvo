"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Settings, Loader2, Check } from "lucide-react";
import { useRoles } from "@/hooks/roles";
import { useMemberRoles, useUpdateMemberRoles } from "@/hooks/permissions";
import type { TenantMember } from "@/lib/types/tenant";

interface RoleManagementDialogProps {
  open: boolean;
  onClose: () => void;
  member: TenantMember;
  tenantId: string;
  tenantName: string;
}

export function RoleManagementDialog({
  open,
  onClose,
  member,
  tenantId,
  tenantName,
}: RoleManagementDialogProps) {
  const { data: availableRoles, isLoading: rolesLoading } = useRoles();
  const { data: memberRoles, isLoading: currentRolesLoading } = useMemberRoles(
    member.id,
  );
  const { mutate: updateRoles, isPending: isUpdating } = useUpdateMemberRoles();

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  console.log("tenantId", tenantId);
  console.log("selectedRoleIds", selectedRoleIds);

  // Update selected role IDs when member roles load
  useEffect(() => {
    if (memberRoles) {
      setSelectedRoleIds(memberRoles.map((mr) => mr.roleId));
    }
  }, [memberRoles]);

  const handleToggleRole = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRoleIds((prev) => [...prev, roleId]);
    } else {
      setSelectedRoleIds((prev) => prev.filter((id) => id !== roleId));
    }
  };

  const handleSave = () => {
    updateRoles(
      {
        tenantMemberId: member.id,
        data: { roleIds: selectedRoleIds },
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  const isLoading = rolesLoading || currentRolesLoading;
  const memberName =
    [member.user?.firstName, member.user?.lastName].filter(Boolean).join(" ") ||
    member.user?.email ||
    "Unknown";

  // Group available roles by common categories
  const adminRoles =
    availableRoles?.filter(
      (r) => r.slug === "admin" || r.slug === "superadmin",
    ) || [];
  const staffRoles =
    availableRoles?.filter(
      (r) => r.slug !== "admin" && r.slug !== "superadmin",
    ) || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-teal-600" />
            Manage Roles & Permissions
          </DialogTitle>
          <DialogDescription className="text-xs">
            Assign roles to <strong>{memberName}</strong> for{" "}
            <strong>{tenantName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            {/* Current Status */}
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
              <Shield className="h-4 w-4 text-teal-600" />
              <div className="flex-1">
                <p className="text-[11px] font-medium text-foreground">
                  Current Roles
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {memberRoles && memberRoles.length > 0 ? (
                    memberRoles.map((mr) => (
                      <Badge
                        key={mr.id}
                        variant="secondary"
                        className="text-[10px] font-medium"
                      >
                        {mr.role.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      No roles assigned
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-foreground">
                Assign Roles
              </p>

              <div className="h-48 overflow-y-auto pr-2 space-y-3">
                {/* Admin Roles */}
                {adminRoles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Administrative
                    </p>
                    {adminRoles.map((role) => {
                      const isChecked = selectedRoleIds.includes(role.id);
                      const isCurrentlyAssigned = memberRoles?.some(
                        (mr) => mr.roleId === role.id,
                      );

                      return (
                        <div
                          key={role.id}
                          className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2"
                        >
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleToggleRole(role.id, checked as boolean)
                            }
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`role-${role.id}`}
                              className="text-xs font-medium text-foreground cursor-pointer"
                            >
                              {role.name}
                            </label>
                            {role.description && (
                              <p className="text-[10px] text-muted-foreground">
                                {role.description}
                              </p>
                            )}
                          </div>
                          {isCurrentlyAssigned && (
                            <Badge
                              variant="outline"
                              className="text-[10px] gap-1 text-teal-700 dark:text-teal-300 border-teal-500/30"
                            >
                              <Check className="h-2.5 w-2.5" />
                              Assigned
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Staff Roles */}
                {staffRoles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Staff
                    </p>
                    {staffRoles.map((role) => {
                      const isChecked = selectedRoleIds.includes(role.id);
                      const isCurrentlyAssigned = memberRoles?.some(
                        (mr) => mr.roleId === role.id,
                      );

                      return (
                        <div
                          key={role.id}
                          className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2"
                        >
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleToggleRole(role.id, checked as boolean)
                            }
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`role-${role.id}`}
                              className="text-xs font-medium text-foreground cursor-pointer"
                            >
                              {role.name}
                            </label>
                            {role.description && (
                              <p className="text-[10px] text-muted-foreground">
                                {role.description}
                              </p>
                            )}
                          </div>
                          {isCurrentlyAssigned && (
                            <Badge
                              variant="outline"
                              className="text-[10px] gap-1 text-teal-700 dark:text-teal-300 border-teal-500/30"
                            >
                              <Check className="h-2.5 w-2.5" />
                              Assigned
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isUpdating || selectedRoleIds.length === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
