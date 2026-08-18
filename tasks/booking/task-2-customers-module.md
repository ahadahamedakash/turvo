# Task 2: Minimal Customers Module (Backend)

**Scope**: Backend — customer typeahead search + transaction-aware find-or-create
**Status**: ✅ Complete (August 17, 2026)
**Priority**: High
**Depends on**: Task 1 (schema — email nullable)

---

## Context

The create-booking dialog needs a **phone-first customer lookup** (debounced typeahead) and the booking transaction needs **find-or-create** semantics for walk-ins. This is a deliberately MINIMAL module — just what Bookings needs. Full customer CRUD/management is a separate future task.

Customer identity (confirmed decision): **phone-first** — phone is the primary lookup key; email is optional. Phone is NOT unique per tenant (concurrent creation of the same new phone from two different staff can create a duplicate row — documented, accepted; see Part 4).

---

## Part 1: Files to Create

```
backend/src/modules/customers/
├── customers.module.ts
├── customers.controller.ts
├── customers.service.ts
└── dto/
    ├── query-customers.dto.ts
    └── customer-response.dto.ts
```

Register `CustomersModule` in `backend/src/app.module.ts` imports. Module **exports `CustomersService`** (BookingsModule imports it in Task 3).

---

## Part 2: Endpoint

### `GET /customers?search=&limit=10`

```
@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@ApiBearerAuth()

@ThrottlePermissive()
@RequirePermissions('Customer.view')      // already seeded
GET /customers?search=01711&limit=10
→ 200 { data: CustomerOptionDto[] }
```

`CustomerOptionDto`: `{ id, firstName, lastName, phone, email }`

**Query DTO** (`query-customers.dto.ts`):

```typescript
search?: string   // @IsString @MinLength(1) @MaxLength(100) — free text
limit?: number    // @Type(() => Number) @IsInt @Min(1) @Max(20), default 10
```

**Search logic** (`CustomersService.search(tenantId, search, limit)`):

```typescript
where: {
  tenantId,
  deletedAt: null,
  OR: [
    { phone:     { contains: digits, mode: 'insensitive' } }, // frontend strips non-digits for this path
    { firstName: { contains: search,  mode: 'insensitive' } },
    { lastName:  { contains: search,  mode: 'insensitive' } },
  ],
},
take: Math.min(limit, 20),
orderBy: { createdAt: 'desc' },
```

**Service method contract** (mirrors `SlotsService.bookSlot(tenantId, slotId, tx?)` style):

```typescript
findOrCreate(
  tenantId: string,
  dto: CustomerInfoDto,          // { customerId?, firstName, lastName, phone?, email? }
  tx?: PrismaTransaction,        // runs INSIDE the booking transaction
): Promise<Customer>
```

Resolution order:
1. `dto.customerId` present → `tx.customer.findFirst({ id, tenantId, deletedAt: null })` → 404 if missing (stale typeahead pick)
2. else `phone` present → `findFirst({ tenantId, phone, deletedAt: null })`
3. else `email` present → `findFirst({ tenantId, email })`
4. else create: `tx.customer.create({ tenantId, firstName, lastName, phone, email: email ?? null })`
   - `(tenantId, email)` unique can race on concurrent creates → catch Prisma P2002 → re-find by email

**Validation** (`CustomerInfoDto`, shared shape — Bookings will import/embed it in Task 3):

```typescript
customerId?: string  // @IsUUID optional (selected from typeahead)
firstName: string    // @IsString @IsNotEmpty @MaxLength(50)
lastName: string     // @IsString @IsNotEmpty @MaxLength(50)
phone?: string       // @Matches(/^[0-9+\-\s]{6,20}$/) optional
email?: string       // @IsEmail optional
```

---

## Part 3: Conventions

- Full Swagger: `@ApiOperation`, `@ApiResponse` for 200/400/401/403; DTO props with `@ApiProperty`
- Every query tenant-scoped via `@CurrentTenant()` — never trust a `tenantId` in the body
- `deletedAt: null` filters on all reads
- Follow `modules/slots/` controller style exactly (guard chain order, throttle decorators)

---

## Part 4: Known & Accepted Edge Cases

1. **Duplicate customer race**: two staff simultaneously booking the same brand-new phone → two rows. Accepted (no unique constraint on `(tenantId, phone)`); document in service comment.
2. Phone search strips non-digits client-side (Task 4) so `01711` matches `+880 1711-…` — server does a plain `contains` on the digit-normalized term.
3. Soft-deleted customers are never matched; creating a customer whose phone matches a soft-deleted row creates a fresh row (intended).

---

## Part 5: Verify

1. `npm run start:dev` compiles; module registered
2. Swagger (`http://localhost:5000/api`) shows `GET /customers` with correct response codes
3. Happy path: seed/stage a customer, search by phone digits → found; search by name → found
4. Empty result: gibberish search → `{ data: [] }`, no 500
5. Tenant isolation: customer from another tenant never returned (scoped where)
6. Permission: role without `Customer.view` → 403
7. `findOrCreate` exercised indirectly in Task 3 (no HTTP route for it)
