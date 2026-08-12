# Turvo Backend - NestJS Architecture

## Overview

Multi-tenant turf booking platform backend built with NestJS, Prisma ORM, and PostgreSQL (NeonDB).

**Tech Stack**:
- NestJS 10.x with TypeScript
- Prisma ORM with PostgreSQL
- JWT authentication with refresh token rotation
- Swagger/OpenAPI documentation
- Nodemailer for emails

---

## Completed Work: RBAC/Permissions Module

### Status: ✅ Complete (August 2025)

Implemented a complete role-based access control system with hard-delete pattern for junction tables.

**Key Backend Changes**:

1. **Hard Delete Pattern** (`modules/permissions/permissions.service.ts`)
   ```typescript
   // updateRolePermissions uses hard DELETE
   const toDelete = currentRolePermissions
     .filter((rp) => !permissionIds.includes(rp.permissionId))
     .map((rp) => rp.permissionId);

   if (toDelete.length > 0) {
     await tx.rolePermission.deleteMany({
       where: { roleId, permissionId: { in: toDelete } },
     });
   }
   ```

2. **Schema Changes** (`prisma/role-permission.prisma`)
   - Removed `deletedAt` field from `RolePermission` model
   - Junction table now uses hard delete only

3. **Auth Service Updates** (`modules/auth/auth.service.ts`)
   - Removed all `deletedAt: null` filters from rolePermissions queries
   - Clean queries without soft-delete logic

**API Endpoints** (All Swagger-documented):
- `GET /permissions` - List all permissions
- `GET /permissions/:id` - Get single permission
- `POST /permissions` - Create permission
- `PUT /permissions/:id` - Update permission
- `DELETE /permissions/:id` - Delete permission
- `GET /permissions/roles/:roleId` - Get role permissions
- `PUT /permissions/roles/:roleId` - Update role permissions (atomic diffing)
- `GET /permissions/members/:tenantMemberId/roles` - Get member roles
- `PUT /permissions/members/:tenantMemberId/roles` - Update member roles
- `GET /permissions/members/:tenantMemberId` - Get member permissions

**See also**: `tasks/task-2-backend-hard-delete-role-permissions.md` for implementation details.

---

## Current Work: Auth & Tenant Isolation Fix

### In Progress Tasks

See `/tasks/` directory for full details. Backend-specific tasks:

| Task | File | Status | Change |
|------|------|--------|--------|
| Task 1 | `courts.controller.ts` | PENDING | Add `PermissionGuard` to guard chain |
| Task 2 | `auth.service.ts`, `jwt.strategy.ts` | PENDING | Include tenant context in JWT payload |
| Task 3 | `tenant.guard.ts` | PENDING | Read tenant from JWT instead of header |
| Task 4 | `auth.controller.ts`, `auth.service.ts` | PENDING | Add superadmin tenant selection |

### Architecture Changes

**Current State**:
```typescript
// JWT payload: { sub: userId, email }
// TenantGuard extracts from URL/query/header
// DB query on every request for tenant membership
```

**Target State**:
```typescript
// JWT payload: { sub, email, tenantContext: {...} }
// TenantGuard reads from request.user.tenantContext
// No DB query for tenant membership per request
```

---

## Module Structure

### Core Modules

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **Auth** | JWT auth, refresh tokens, login/logout | `modules/auth/` |
| **Tenants** | Multi-tenant organization management | `modules/tenants/` |
| **Courts** | Physical venue/court management | `modules/courts/` |
| **Bookings** | Booking lifecycle & state | `modules/bookings/` |
| **Customers** | Customer management | `modules/customers/` |
| **Invitations** | Team member onboarding | `modules/invitations/` |
| **Permissions** | RBAC: roles & permissions | `modules/permissions/` |
| **RBAC Guards** | Permission enforcement | `common/guards/` |

### Guard Chain

Standard guard order for protected endpoints:

```typescript
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
```

1. **JwtAuthGuard**: Validates JWT, sets `request.user`
2. **TenantGuard**: Sets `request.tenantContext` from JWT
3. **PermissionGuard**: Validates `@RequirePermissions()` metadata

---

## Key Patterns

### Tenant-Scoped Queries

**CORRECT** (using decorator):
```typescript
async findAll(@CurrentTenant() tenantId: string) {
  return this.prisma.court.findMany({ where: { tenantId } });
}
```

**WRONG** (ad-hoc WHERE clause):
```typescript
async findAll(tenantId: string) {
  return this.prisma.court.findMany({ 
    where: { tenantId: request.body.tenantId } // Never trust request body
  });
}
```

### Transaction Boundaries

All state-changing operations MUST use transactions:

```typescript
await this.prisma.$transaction(async (tx) => {
  // Create entity
  const court = await tx.court.create({ ... });

  // Write audit log in SAME transaction
  await tx.auditLog.create({ ... });

  return court;
});
```

### Atomic Permission Updates (Diffing Pattern)

```typescript
// Calculate what needs to change
const toAdd = permissionIds.filter(
  (id) => !currentRolePermissions.some((rp) => rp.permissionId === id)
);
const toDelete = currentRolePermissions
  .filter((rp) => !permissionIds.includes(rp.permissionId))
  .map((rp) => rp.permissionId);

// Apply changes atomically
await this.prisma.$transaction(async (tx) => {
  if (toAdd.length > 0) {
    await tx.rolePermission.createMany({
      data: toAdd.map((permissionId) => ({ roleId, permissionId })),
    });
  }
  if (toDelete.length > 0) {
    await tx.rolePermission.deleteMany({
      where: { roleId, permissionId: { in: toDelete } },
    });
  }
});
```

### Permission Decorators

```typescript
@RequirePermissions('Court.create')
@Post()
create() { ... }

@RequirePermissions('Court.update', 'Court.delete')
@Put()
update() { ... }
```

### Hard Delete for Junction Tables

**Pattern**: Junction tables (like `RolePermission`) should use hard delete:

```typescript
// CORRECT: Hard delete
await tx.rolePermission.deleteMany({
  where: { roleId, permissionId: { in: toDelete } },
});

// WRONG: Soft delete on junction tables
await tx.rolePermission.updateMany({
  where: { roleId, permissionId: { in: toDelete } },
  data: { deletedAt: new Date() },
});
```

**Rationale**: Junction tables represent relationships, not entities. Soft-deleting a relationship creates unnecessary complexity and query overhead.

---

## Database Schema

Key models (see `prisma/schema.prisma` for full schema):

```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  isSuperAdmin Boolean @default(false)
  tenantMembers TenantMember[]
}

model Tenant {
  id       String @id @default(uuid())
  name     String
  slug     String @unique
  status   TenantStatus @default(Active)
  tenantMembers TenantMember[]
  courts   Court[]
}

model TenantMember {
  id        String    @id @default(uuid())
  tenantId  String
  userId    String
  userRoles UserRole[]

  @@unique([tenantId, userId])
}

model Court {
  id       String     @id @default(uuid())
  name     String
  tenantId String
  status   CourtStatus @default(Available)

  @@unique([tenantId, name])
}

// RBAC Models
model Role {
  id               String         @id @default(uuid())
  slug             String         @unique
  name             String
  description      String?
  rolePermissions  RolePermission[]
  userRoles        UserRole[]
}

model Permission {
  id               String         @id @default(uuid())
  slug             String         @unique
  name             String
  module           PermissionModule
  description      String?
  rolePermissions  RolePermission[]
}

model RolePermission {
  id           String     @id @default(uuid())
  roleId       String
  permissionId String
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([roleId, permissionId])
  @@map("role_permissions")
}

model UserRole {
  id             String @id @default(uuid())
  tenantMemberId String
  roleId         String
  createdAt      DateTime @default(now())

  @@unique([tenantMemberId, roleId])
  @@map("user_roles")
}
```

---

## API Documentation

Swagger UI available at: `http://localhost:3001/api`

Every endpoint MUST have:
- `@ApiTags()` for module grouping
- `@ApiOperation()` with description
- `@ApiResponse()` for all response codes
- DTO properties with `@ApiProperty()`

---

## Development Commands

```bash
# Development server
npm run start:dev      # Watch mode with hot reload

# Database
npm run prisma:migrate # Apply migrations
npm run prisma:generate # Generate Prisma client
npm run prisma:studio  # Open Prisma Studio

# Testing
npm run test           # Unit tests
npm run test:e2e       # E2E tests

# Linting
npm run lint           # ESLint
npm run format         # Prettier
```

---

## Environment Variables

Required in `.env`:

```bash
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRY=7d

# SMTP (for invitations)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# App
PORT=5000
NODE_ENV=development
```

---

## Known Issues & Technical Debt

1. **RLS Not Implemented**: Row-Level Security not enforced at DB level (must be added before production)
2. **Partial Unique Index**: Invitations need partial unique index on `(tenantId, email)` WHERE status = 'Pending'
3. **Debug Logs**: Remove `console.log` from `tenant-context.decorator.ts` and `courts.controller.ts`
4. **Payment Gateways**: Manual entry only, live gateways schema-ready but not implemented
