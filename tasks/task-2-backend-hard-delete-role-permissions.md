# Task 2: Backend Hard Delete for Role Permissions

## Problem Description

The current backend implementation uses soft-delete for role permissions (sets `deletedAt` timestamp). The user wants:
- **Hard delete**: When a permission is unchecked, it should be completely removed from the database
- **No soft-delete**: The `RolePermission` junction table should use actual DELETE operations

## Current Behavior

**File**: `backend/src/modules/permissions/permissions.service.ts`

The `updateRolePermissions` method currently:
1. Soft-deletes ALL existing role permissions (sets `deletedAt: new Date()`)
2. Creates new role permissions from the provided array

```typescript
// Current implementation (lines 95-111)
await tx.rolePermission.updateMany({
  where: { roleId, deletedAt: null },
  data: { deletedAt: new Date() },
});

if (permissionIds.length > 0) {
  await tx.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    })),
    skipDuplicates: true,
  });
}
```

## Desired Behavior

When updating role permissions:
1. **DELETE** role permissions that are NOT in the new permissionIds array
2. **CREATE** role permissions that ARE in the new array but don't exist yet
3. **KEEP** role permissions that already exist

This approach:
- Is more efficient (only deletes what needs to be deleted)
- Uses hard DELETE (not soft-delete)
- Preserves the junction table clean state

## Implementation Steps

### Step 1: Modify updateRolePermissions Method

**File**: `backend/src/modules/permissions/permissions.service.ts`

Replace the soft-delete approach with hard delete:

```typescript
async updateRolePermissions(
  roleId: string,
  permissionIds: string[],
  assignedByUserId: string,
) {
  // Verify role exists
  const role = await this.prisma.role.findUnique({
    where: { id: roleId },
  });

  if (!role) {
    throw new NotFoundException('Role not found');
  }

  // Verify all permission IDs exist
  const permissions = await this.prisma.permission.findMany({
    where: { id: { in: permissionIds } },
    select: { id: true },
  });

  if (permissions.length !== permissionIds.length) {
    throw new BadRequestException('One or more permission IDs are invalid');
  }

  // Use transaction to update permissions
  return this.prisma.$transaction(async (tx) => {
    // Get current role permissions
    const currentRolePermissions = await tx.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });

    const currentPermissionIds = new Set(
      currentRolePermissions.map((rp) => rp.permissionId),
    );

    // Calculate permissions to DELETE (exist in DB but not in new list)
    const toDelete = currentRolePermissions
      .filter((rp) => !permissionIds.includes(rp.permissionId))
      .map((rp) => rp.permissionId);

    // Calculate permissions to CREATE (in new list but don't exist in DB)
    const toCreate = permissionIds.filter((id) => !currentPermissionIds.has(id));

    // Hard DELETE permissions that are being removed
    if (toDelete.length > 0) {
      await tx.rolePermission.deleteMany({
        where: {
          roleId,
          permissionId: { in: toDelete },
        },
      });
    }

    // CREATE new permissions that are being added
    if (toCreate.length > 0) {
      await tx.rolePermission.createMany({
        data: toCreate.map((permissionId) => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    // Get updated role with permissions
    const updatedRole = await tx.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        rolePermissions: {
          select: {
            permission: {
              select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                module: true,
              },
            },
          },
        },
      },
    });

    if (!updatedRole) {
      throw new NotFoundException('Role not found after update');
    }

    return {
      ...updatedRole,
      permissions: updatedRole.rolePermissions.map((rp) => rp.permission),
    };
  });
}
```

### Step 2: Update getRolePermissions Method

**File**: `backend/src/modules/permissions/permissions.service.ts`

Since we're now using hard delete, remove the `deletedAt` filter from the query:

```typescript
async getRolePermissions(roleId: string) {
  const role = await this.prisma.role.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      rolePermissions: {
        // Remove: where: { deletedAt: null }
        select: {
          permission: {
            select: {
              id: true,
              slug: true,
              name: true,
              description: true,
              module: true,
            },
          },
        },
      },
    },
  });

  if (!role) {
    throw new NotFoundException('Role not found');
  }

  return {
    ...role,
    permissions: role.rolePermissions.map((rp) => rp.permission),
  };
}
```

### Step 3: Update getMemberPermissions Method

**File**: `backend/src/modules/permissions/permissions.service.ts`

Remove the `deletedAt` filter since we're using hard delete:

```typescript
// In getMemberPermissions method (around line 341)
rolePermissions: {
  // Remove: where: { deletedAt: null }
  select: {
    permission: {
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        module: true,
      },
    },
  },
},
```

### Step 4: Update Schema (Optional)

**File**: `backend/prisma/schema.prisma`

Consider removing the `deletedAt` field from the `RolePermission` model if it's only used for soft-delete:

```prisma
model RolePermission {
  id          String   @id @default(uuid())
  roleId      String
  permissionId String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  role        Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission  Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
  @@index([roleId])
  @@index([permissionId])
}
```

**Note**: Only remove `deletedAt` if it's not used elsewhere. Check all references first.

## Verification Steps

1. Start the backend: `cd backend && npm run start:dev`
2. Access Swagger at `http://localhost:5000/api`
3. Test PUT `/permissions/roles/:roleId`:
   - Send with empty array `[]` → all permissions should be hard deleted
   - Send with `["perm1", "perm2"]` → only these should exist in DB
   - Send with `["perm1", "perm2", "perm3"]` → perm3 added, others kept
4. Check the database directly:
   ```sql
   SELECT * FROM "RolePermission" WHERE "roleId" = 'xxx';
   ```
   - Should only show the exact permissions from the last update
5. Verify cascade deletes work when a role or permission is deleted

## Expected Outcome

- ✅ Unchecking a permission in UI deletes it from the database (hard delete)
- ✅ Checking a permission adds it to the database
- ✅ No soft-delete records remain in the database
- ✅ The junction table stays clean with only active role-permission associations

## Dependencies

- **Must complete BEFORE**: Task 3 (Frontend Hard Delete Integration)

## Notes

- This is a breaking change if other parts of the system rely on soft-delete behavior
- Consider running a data migration to clean up existing soft-deleted records
- The cascade delete in Prisma schema helps maintain referential integrity
- Hard delete is more appropriate for junction tables which represent relationships, not entities
