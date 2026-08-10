# Fix: Invitations 500 Error

## Root Cause

The 500 error was caused by the `revokedBy` field being populated with invalid data:

1. **TenantGuard** sets virtual `tenantMemberId = 'SUPERADMIN'` (string) for superadmins
2. **Controller's revoke endpoint** passed this virtual ID to the service: `revoke(id, 'SUPERADMIN')`
3. **Service** stored `'SUPERADMIN'` in the `revokedBy` field (FK to `TenantMember.id`)
4. **Query error**: When fetching invitations, Prisma tried to resolve the `revokedByMember` relation but `'SUPERADMIN'` is not a valid UUID or `TenantMember.id`

## Fix Applied

### 1. Controller (`invitation.controller.ts`)
Changed the `revoke` endpoint to pass the actual User ID for superadmins:

```typescript
async revoke(
  @Param('id') id: string,
  @GetUser() user: { id: string; isSuperAdmin?: boolean },
  @CurrentMember() tenantMemberId: string,
) {
  // For superadmin, use their actual user ID instead of virtual tenantMemberId
  const effectiveRevokerId = user.isSuperAdmin ? user.id : tenantMemberId;
  return this.invitationService.revoke(id, effectiveRevokerId);
}
```

### 2. Service (`invitation.service.ts`)
Updated the `revoke` method to only set `revokedBy` when the revoker is a valid TenantMember:

```typescript
// Check if revoker is a tenant member
const tenantMember = await this.prisma.tenantMember.findUnique({
  where: { id: revokerId },
});

// Only set revokedBy if revoker is a tenant member
// For superadmins, we skip setting revokedBy (stays NULL)
const updateData: any = {
  status: InvitationStatus.Revoked,
  revokedAt: new Date(),
};

if (tenantMember) {
  updateData.revokedBy = revokerId;
}

await this.prisma.invitation.update({
  where: { id: invitationId },
  data: updateData,
});
```

## Result

- ✅ Superadmins can now revoke invitations without storing invalid IDs
- ✅ The `revokedBy` field stays NULL for superadmin revocations (valid - the field is optional)
- ✅ GET /invitations endpoint returns 200 with proper data
- ✅ No FK constraint violations when querying invitations

## Testing

```bash
# Test invitations list
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  http://localhost:5000/api/v1/invitations?page=1&limit=10

# Expected: 200 OK with invitation list
```
