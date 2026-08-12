"use client";

import { useState } from "react";
import {
  Plus,
  Shield,
  Settings,
  Key,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRoles } from "@/hooks/roles";
import {
  usePermissions,
  useRolePermissions,
  useUpdateRolePermissions,
} from "@/hooks/permissions";
import { CreateRoleDialog } from "@/components/superadmin/settings/create-role-dialog";
import { EditRoleDialog } from "@/components/superadmin/settings/edit-role-dialog";
import { DeleteRoleDialog } from "@/components/superadmin/settings/delete-role-dialog";
import { CreatePermissionDialog } from "@/components/superadmin/settings/create-permission-dialog";
import { EditPermissionDialog } from "@/components/superadmin/settings/edit-permission-dialog";
import { DeletePermissionDialog } from "@/components/superadmin/settings/delete-permission-dialog";
import type { Role } from "@/lib/types/role";
import type { Permission } from "@/lib/types/permission";

export default function SettingsPage() {
  // Role management state
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);

  // Permission management state
  const [createPermissionDialogOpen, setCreatePermissionDialogOpen] =
    useState(false);
  const [editPermission, setEditPermission] = useState<Permission | null>(null);
  const [deletePermission, setDeletePermission] = useState<Permission | null>(
    null,
  );
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] =
    useState<Role | null>(null);

  // UI state for collapsing sections
  const [rolesExpanded, setRolesExpanded] = useState(true);
  const [permissionsExpanded, setPermissionsExpanded] = useState(true);

  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useRoles();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();

  const totalRoles = roles?.length ?? 0;
  const totalPermissions = permissions?.length ?? 0;

  // Group permissions by module for the permissions table
  const groupedPermissions =
    permissions?.reduce(
      (acc, perm) => {
        const module = perm.module;
        if (!acc[module]) acc[module] = [];
        acc[module].push(perm);
        return acc;
      },
      {} as Record<string, Permission[]>,
    ) ?? {};

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-card p-6 border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-semibold uppercase text-teal-700 border-teal-600/30 bg-teal-50 dark:bg-teal-950"
            >
              <Settings className="mr-1 h-3 w-3" /> System Configuration
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Roles & Permissions
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            Manage system roles and their associated permissions. Only
            superadmins can modify roles and permissions.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setCreatePermissionDialogOpen(true)}
            variant="outline"
            className="gap-1.5 text-xs"
          >
            <Key className="h-4 w-4" />
            <span>New Permission</span>
          </Button>
          <Button
            onClick={() => setCreateRoleDialogOpen(true)}
            className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Role</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Roles
            </CardTitle>
            <Shield className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRoles}</div>
            <p className="text-xs text-muted-foreground">
              System-wide role definitions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Permissions
            </CardTitle>
            <Key className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPermissions}</div>
            <p className="text-xs text-muted-foreground">
              Granular permission rules
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              System Status
            </CardTitle>
            <Settings className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              RBAC system operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Roles Section */}
      <Card className="shadow-xs">
        <CardHeader
          className="cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setRolesExpanded(!rolesExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Roles</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {totalRoles}
              </Badge>
            </div>
            {rolesExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {rolesExpanded && (
          <CardContent>
            {rolesLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-teal-600 border-t-transparent" />
              </div>
            ) : rolesError ? (
              <div className="text-center text-xs text-destructive py-4">
                Failed to load roles. Please refresh.
              </div>
            ) : !roles || roles.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No roles found. Create your first role.
                </p>
                <Button
                  onClick={() => setCreateRoleDialogOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Role
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Slug
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr
                        key={role.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 font-medium">{role.name}</td>
                        <td className="p-3">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {role.slug}
                          </code>
                        </td>
                        <td className="p-3 text-muted-foreground max-w-md truncate">
                          {role.description || "-"}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSelectedRoleForPermissions(role)
                              }
                              className="h-8 text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Permissions
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditRole(role)}
                              className="h-8 text-xs"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteRole(role)}
                              className="h-8 text-xs text-destructive hover:text-destructive"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Permissions Section */}
      <Card className="shadow-xs">
        <CardHeader
          className="cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setPermissionsExpanded(!permissionsExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Permissions</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {totalPermissions}
              </Badge>
            </div>
            {permissionsExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {permissionsExpanded && (
          <CardContent>
            {permissionsLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
              </div>
            ) : !permissions || permissions.length === 0 ? (
              <div className="text-center py-8">
                <Key className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No permissions found. Create your first permission.
                </p>
                <Button
                  onClick={() => setCreatePermissionDialogOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Permission
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <Card key={module} className="shadow-none border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-semibold">
                          {module}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {perms.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="text-left p-2 font-medium text-muted-foreground">
                                Slug
                              </th>
                              <th className="text-left p-2 font-medium text-muted-foreground">
                                Name
                              </th>
                              <th className="text-left p-2 font-medium text-muted-foreground">
                                Description
                              </th>
                              <th className="text-right p-2 font-medium text-muted-foreground">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {perms.map((perm) => (
                              <tr
                                key={perm.id}
                                className="border-b hover:bg-muted/30 transition-colors last:border-0"
                              >
                                <td className="p-2">
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                    {perm.slug}
                                  </code>
                                </td>
                                <td className="p-2 font-medium">{perm.name}</td>
                                <td className="p-2 text-muted-foreground max-w-xs truncate">
                                  {perm.description || "-"}
                                </td>
                                <td className="p-2 text-right">
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditPermission(perm)}
                                      className="h-7 text-xs px-2"
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeletePermission(perm)}
                                      className="h-7 text-xs text-destructive hover:text-destructive px-2"
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Dialogs */}
      <CreateRoleDialog
        open={createRoleDialogOpen}
        onOpenChange={setCreateRoleDialogOpen}
      />
      <EditRoleDialog
        role={editRole}
        open={!!editRole}
        onOpenChange={(open) => !open && setEditRole(null)}
      />
      <DeleteRoleDialog
        role={deleteRole}
        open={!!deleteRole}
        onOpenChange={(open) => !open && setDeleteRole(null)}
      />

      <CreatePermissionDialog
        open={createPermissionDialogOpen}
        onOpenChange={setCreatePermissionDialogOpen}
      />
      <EditPermissionDialog
        permission={editPermission}
        open={!!editPermission}
        onOpenChange={(open) => !open && setEditPermission(null)}
      />
      <DeletePermissionDialog
        permission={deletePermission}
        open={!!deletePermission}
        onOpenChange={(open) => !open && setDeletePermission(null)}
      />

      {/* Role Permissions Management Dialog */}
      {selectedRoleForPermissions && (
        <RolePermissionsDialog
          role={selectedRoleForPermissions}
          open={!!selectedRoleForPermissions}
          onOpenChange={(open) => !open && setSelectedRoleForPermissions(null)}
        />
      )}
    </div>
  );
}

// Role Permissions Management Dialog Component
// Uses React Query's optimistic updates for immediate UI feedback
function RolePermissionsDialog({
  role,
  open,
  onOpenChange,
}: {
  role: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: rolePermissions, isLoading } = useRolePermissions(role.id);
  const { data: allPermissions } = usePermissions();
  const updateRolePermissions = useUpdateRolePermissions();

  // Toggle permission - optimistic updates handled by the hook
  const handleTogglePermission = (
    permissionId: string,
    isAssigned: boolean,
  ) => {
    // Get current permissions from query data (includes optimistic updates)
    const currentPermissionIds =
      rolePermissions?.permissions.map((p) => p.id) ?? [];

    // Calculate new permission IDs array
    let newPermissionIds: string[];

    if (isAssigned) {
      // Remove permission
      newPermissionIds = currentPermissionIds.filter(
        (id) => id !== permissionId,
      );
    } else {
      // Add permission
      newPermissionIds = [...currentPermissionIds, permissionId];
    }

    // Call mutation - hook handles optimistic updates and rollback
    updateRolePermissions.mutate({
      roleId: role.id,
      data: { permissionIds: newPermissionIds },
    });
  };

  // Derive assigned permission IDs from query data (includes optimistic updates)
  const assignedPermissionIds = new Set(
    rolePermissions?.permissions.map((p) => p.id) ?? [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-teal-600" />
            Manage Permissions: {role.name}
          </DialogTitle>
          <DialogDescription>
            Select which permissions this role should have.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !allPermissions ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-teal-600 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {Object.entries(
              allPermissions.reduce(
                (acc, perm) => {
                  const module = perm.module;
                  if (!acc[module]) acc[module] = [];
                  acc[module].push(perm);
                  return acc;
                },
                {} as Record<string, typeof allPermissions>,
              ),
            ).map(([module, perms]) => (
              <div key={module} className="space-y-2">
                <h4 className="text-sm font-semibold uppercase text-muted-foreground">
                  {module}
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {perms.map((perm) => {
                    const isAssigned = assignedPermissionIds.has(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() =>
                              handleTogglePermission(perm.id, isAssigned)
                            }
                            disabled={updateRolePermissions.isPending}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          {updateRolePermissions.isPending && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {perm.name}
                            </span>
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {perm.slug}
                            </code>
                          </div>
                          {perm.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {perm.description}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={() => onOpenChange(false)}
            disabled={updateRolePermissions.isPending}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
