# Invitation Dual Foreign Key Implementation

## Problem
The `invitedBy` field in the `Invitation` model had a foreign key constraint to `TenantMember.id`. When a superadmin tried to create an invitation, their `User.id` was passed, causing a foreign key constraint violation (Prisma error P2003).

## Solution: Dual Foreign Keys

### Schema Changes

**File: `backend/prisma/invitation.prisma`**

Replaced single `invitedBy` field with two optional fields:

```prisma
// Old (removed)
invitedBy       String           @db.Uuid
invitedByMember TenantMember     @relation("InvitationInvitedBy", fields: [invitedBy], references: [id])

// New (added)
invitedByMemberId String?         @db.Uuid  // For tenant member inviters
invitedByUserId   String?         @db.Uuid  // For superadmin inviters
invitedByMember  TenantMember?    @relation("InvitationInvitedBy", fields: [invitedByMemberId], references: [id])
invitedByUser    User?            @relation("InvitationInvitedByUser", fields: [invitedByUserId], references: [id])
```

**File: `backend/prisma/user.prisma`**

Added relation to User model:

```prisma
invitedInvitations   Invitation[]   @relation("InvitationInvitedByUser")
```

### Service Changes

**File: `backend/src/modules/invitation/invitation.service.ts`**

Updated the `create()` method to:

1. Determine which FK to use based on inviter type
2. Set `invitedByMemberId` for tenant members
3. Set `invitedByUserId` for superadmins

```typescript
// Determine which FK to use
let invitedByMemberId: string | null = null;
let invitedByUserId: string | null = null;

// Check if inviter is a tenant member
const tenantMember = await this.prisma.tenantMember.findUnique({
  where: { id: inviterId, tenantId },
  include: { user: { select: { firstName, lastName, email } } }
});

if (tenantMember) {
  invitedByMemberId = inviterId;
  inviter = tenantMember.user;
} else {
  // Check if inviter is superadmin
  const superadminUser = await this.prisma.user.findUnique({
    where: { id: inviterId },
    select: { id, firstName, lastName, email, isSuperAdmin }
  });
  
  if (!superadminUser?.isSuperAdmin) {
    throw new NotFoundException('Inviter not found or not authorized');
  }
  
  invitedByUserId = inviterId;
  inviter = { firstName, lastName, email };
}

// Create with dual FKs
await tx.invitation.create({
  data: {
    email,
    tenantId,
    roleId,
    token,
    status: InvitationStatus.Pending,
    expiresAt,
    invitedByMemberId,
    invitedByUserId,
  },
});
```

Updated `findAll()` and `findOne()` to include both relations:

```typescript
include: {
  // ...
  invitedByMember: { include: { user: { select: { id, firstName, lastName, email } } } },
  invitedByUser: { select: { id, firstName, lastName, email } },
  // ...
}
```

### DTO Changes

**File: `backend/src/modules/invitation/dto/response-invitation.dto.ts`**

Updated response DTO to include new fields and relations:

```typescript
invitedByMemberId?: string;  // Set when invited by tenant member
invitedByUserId?: string;     // Set when invited by superadmin
invitedByMember?: { id, user: { id, firstName, lastName, email } };
invitedByUser?: { id, firstName, lastName, email };
```

### Frontend Changes

**File: `frontend/lib/types/invitation.ts`**

Updated Invitation interface to match backend:

```typescript
export interface Invitation {
  // ...
  invitedByMemberId?: string | null
  invitedByUserId?: string | null
  invitedByMember?: InviterMember
  invitedByUser?: InviterUser
  // ...
}

// Helper functions
export function getInviterName(invitation: Invitation): string
export function isInvitedBySuperadmin(invitation: Invitation): boolean
```

## How It Works

### Tenant Member Invitation Flow
1. Tenant member creates invitation → `tenantMemberId` passed to service
2. Service finds `TenantMember` record
3. Sets `invitedByMemberId = tenantMemberId`
4. `invitedByUserId` remains `NULL`

### Superadmin Invitation Flow
1. Superadmin creates invitation → `userId` passed to service
2. Service doesn't find `TenantMember` record
3. Checks if User is superadmin
4. Sets `invitedByUserId = userId`
5. `invitedByMemberId` remains `NULL`

## Benefits

1. **Database-enforced referential integrity** - Both FKs validated by database
2. **Clear separation of concerns** - Different entity types handled explicitly
3. **Queryable** - Easy to join and get inviter details via either relation
4. **No workarounds** - No proxy records or temporary solutions
5. **Type-safe** - Prisma generates proper TypeScript types

## Testing

After these changes, both scenarios should work:

1. ✅ **Tenant member invites to their tenant** - Uses `invitedByMemberId`
2. ✅ **Superadmin invites to any tenant** - Uses `invitedByUserId`

## Future Enhancements

- Add database check constraint: `CHECK ((invitedByMemberId IS NOT NULL) OR (invitedByUserId IS NOT NULL))`
- This would be a database-level enforcement of exactly one field being set
