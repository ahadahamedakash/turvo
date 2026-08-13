# Task 2: Slot Generation Service (Backend)

**Scope**: Backend Slot Generation Service
**Status**: TODO
**Priority**: High (required before bookings can work)

---

## Context

Slots are the "inventory" of bookable time units. They are generated from pricing rules and capture price snapshots at creation time.

**Schema Location**: `backend/prisma/slot.prisma`

```prisma
model Slot {
  id            String       @id @default(uuid()) @db.Uuid
  tenantId      String       @db.Uuid
  courtId       String       @db.Uuid
  pricingRuleId String?      @db.Uuid
  price         Decimal      @db.Decimal(10, 2)
  date          DateTime     @db.Date
  startTime     DateTime     @db.Time(6)
  endTime       DateTime     @db.Time(6)
  status        SlotStatus   @default(Available)
  heldAt        DateTime?
  heldBy        String?      @db.Uuid
  heldUntil     DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  deletedAt     DateTime?

  @@unique([courtId, date, startTime], name: "no_duplicate_slot_generation")
  @@index([tenantId, status, date])
}
```

---

## Part 1: Module Structure

### Files to Create

```
backend/src/modules/slots/
├── slots.module.ts
├── slots.controller.ts
├── slots.service.ts
├── dto/
│   ├── generate-slots.dto.ts
│   ├── query-slots.dto.ts
│   └── slot-response.dto.ts
```

---

## Part 2: Service Implementation

### 2.1 Core Service Logic

**File**: `slots.service.ts`

**Key Methods**:

```typescript
// 1. Generate slots from pricing rules for a date range
generateSlots(tenantId: string, courtId: string, startDate: Date, endDate: Date): Promise<SlotGenerationResult>

// 2. Find available slots for booking
findAvailableSlots(tenantId: string, courtId: string, date: Date, duration?: number): Promise<Slot[]>

// 3. Hold slot temporarily (during checkout)
holdSlot(tenantId: string, slotId: string, userId: string, holdUntil: Date): Promise<Slot>

// 4. Release slot hold
releaseSlotHold(tenantId: string, slotId: string): Promise<Slot>

// 5. Book slot (update status to Booked)
bookSlot(tenantId: string, slotId: string): Promise<Slot>

// 6. Block slot (maintenance, etc.)
blockSlot(tenantId: string, slotId: string, reason: string): Promise<Slot>

// 7. Unblock slot
unblockSlot(tenantId: string, slotId: string): Promise<Slot>

// 8. Cleanup expired slots (optional cron job)
cleanupExpiredSlots(tenantId: string, beforeDate: Date): Promise<number>

// 9. List slots with filtering
findAll(tenantId: string, params: QuerySlotsDto): Promise<PaginatedResult<Slot>>
```

### 2.2 Slot Generation Algorithm

```typescript
/**
 * Generate slots from pricing rules
 *
 * For each date in range:
 * 1. Determine dayType (Weekday/Weekend/Holiday)
 * 2. Find matching PricingRules for court + dayType
 * 3. For each rule's time range, create hourly slots
 * 4. Handle duplicates via unique constraint
 * 5. Price is snapshotted from pricing rule
 */
async generateSlots(
  tenantId: string,
  courtId: string,
  startDate: Date,
  endDate: Date
): Promise<SlotGenerationResult> {

  const results = { generated: 0, skipped: 0, errors: [] };

  // For each date
  for (const date of eachDayOfInterval({ start: startDate, end: endDate })) {
    // 1. Determine dayType
    const dayType = this.getDayType(date);

    // 2. Find matching pricing rules
    const pricingRules = await this.prisma.pricingRule.findMany({
      where: { tenantId, courtId, dayType },
    });

    // 3. For each rule, generate hourly slots
    for (const rule of pricingRules) {
      const slotTimes = this.generateHourlySlots(
        rule.startTime,
        rule.endTime
      );

      for (const { startTime, endTime } of slotTimes) {
        try {
          // Try to create slot (unique constraint handles duplicates)
          await this.prisma.slot.create({
            data: {
              tenantId,
              courtId,
              pricingRuleId: rule.id,
              price: rule.price, // Snapshot!
              date,
              startTime,
              endTime,
              status: SlotStatus.Available,
            },
          });
          results.generated++;
        } catch (error) {
          // Unique constraint violation = slot exists, skip
          if (error.code === 'P2002') {
            results.skipped++;
          } else {
            results.errors.push(error.message);
          }
        }
      }
    }
  }

  return results;
}

/**
 * Generate hourly slot times from a time range
 */
private generateHourlySlots(startTime: Date, endTime: Date): Array<{startTime: Date, endTime: Date}> {
  const slots = [];
  let current = new Date(startTime);

  while (current < endTime) {
    const next = new Date(current);
    next.setHours(current.getHours() + 1);

    // Don't create slot that goes beyond endTime
    if (next <= endTime) {
      slots.push({
        startTime: new Date(current),
        endTime: next,
      });
    }

    current = next;
  }

  return slots;
}

/**
 * Determine dayType for a date
 * - Weekend: Saturday, Sunday
 * - Holiday: Check holiday calendar (future enhancement)
 * - Weekday: Monday-Friday, non-holiday
 */
private getDayType(date: Date): DayType {
  const day = date.getDay();

  // Weekend = Saturday (6), Sunday (0)
  if (day === 0 || day === 6) {
    return DayType.Weekend;
  }

  // TODO: Check holiday calendar
  // For now, all non-weekend are weekdays
  return DayType.Weekday;
}
```

---

## Part 3: Controller Implementation

### 3.1 API Endpoints

**File**: `slots.controller.ts`

```typescript
@ApiTags('Slots')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@Controller('slots')
export class SlotsController {

  // Generate slots for a date range
  @Post('generate')
  @RequirePermissions('Court.update')
  @ApiOperation({ summary: 'Generate slots from pricing rules' })
  generate(@Body() dto: GenerateSlotsDto, @CurrentTenant() tenantId: string) {}

  // List available slots
  @Get()
  @ApiOperation({ summary: 'List slots with filtering' })
  findAll(@Query() query: QuerySlotsDto, @CurrentTenant() tenantId: string) {}

  // Get single slot
  @Get(':id')
  @ApiOperation({ summary: 'Get slot details' })
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {}

  // Hold slot (for checkout)
  @Post(':id/hold')
  @RequirePermissions('Booking.create')
  @ApiOperation({ summary: 'Hold slot temporarily during checkout' })
  holdSlot(@Param('id') id: string, @CurrentTenant() tenantId: string, @Request() req) {}

  // Release hold
  @Post(':id/release')
  @RequirePermissions('Booking.create')
  @ApiOperation({ summary: 'Release slot hold' })
  releaseHold(@Param('id') id: string, @CurrentTenant() tenantId: string) {}

  // Block slot
  @Post(':id/block')
  @RequirePermissions('Court.update')
  @ApiOperation({ summary: 'Block slot (maintenance, etc.)' })
  blockSlot(@Param('id') id: string, @Body() dto: BlockSlotDto, @CurrentTenant() tenantId: string) {}

  // Unblock slot
  @Post(':id/unblock')
  @RequirePermissions('Court.update')
  @ApiOperation({ summary: 'Unblock slot' })
  unblockSlot(@Param('id') id: string, @CurrentTenant() tenantId: string) {}

  // Cleanup expired slots
  @Delete('cleanup')
  @RequirePermissions('Court.update')
  @ApiOperation({ summary: 'Delete expired slots before date' })
  cleanupExpired(@Query('beforeDate') beforeDate: string, @CurrentTenant() tenantId: string) {}
}
```

---

## Part 4: DTOs

### 4.1 Generate Slots DTO

```typescript
class GenerateSlotsDto {
  @ApiProperty({ example: 'uuid-court-id' })
  @IsUUID()
  courtId: string;

  @ApiProperty({ example: '2025-08-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-08-22' })
  @IsDateString()
  endDate: string;
}
```

### 4.2 Query Slots DTO

```typescript
class QuerySlotsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  courtId?: string;

  @ApiProperty({ required: false, enum: SlotStatus })
  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;

  @ApiProperty({ required: false, example: '2025-08-15' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

### 4.3 Slot Response DTO

```typescript
class SlotResponseDto {
  id: string;
  courtId: string;
  courtName?: string;
  pricingRuleId?: string;
  price: number;
  date: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  heldUntil?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Part 5: Slot Hold Mechanism

### 5.1 Hold Logic

When a customer starts booking process:

```typescript
// Hold slot for 15 minutes
async holdSlot(
  tenantId: string,
  slotId: string,
  userId: string,
  holdDuration: number = 15 // minutes
): Promise<Slot> {

  const holdUntil = new Date();
  holdUntil.setMinutes(holdUntil.getMinutes() + holdDuration);

  return this.prisma.slot.update({
    where: {
      id: slotId,
      tenantId,
      status: SlotStatus.Available, // Only hold if available
    },
    data: {
      status: SlotStatus.Held,
      heldAt: new Date(),
      heldBy: userId,
      heldUntil,
    },
  });
}
```

### 5.2 Hold Expiry

**Option A**: Cron job to release expired holds
```typescript
// Run every 5 minutes
@Cron('*/5 * * * *')
async releaseExpiredHolds() {
  await this.prisma.slot.updateMany({
    where: {
      status: SlotStatus.Held,
      heldUntil: { lt: new Date() },
    },
    data: {
      status: SlotStatus.Available,
      heldAt: null,
      heldBy: null,
      heldUntil: null,
    },
  });
}
```

**Option B**: Check on read (simpler, no cron)
```typescript
// Before returning slot, check if hold expired
if (slot.status === SlotStatus.Held && slot.heldUntil < new Date()) {
  // Release and return as available
  return this.releaseSlotHold(slot.id);
}
```

**Recommendation**: Start with Option B, add Option A later if needed.

---

## Part 6: Testing

### 6.1 Unit Tests

```typescript
describe('SlotsService', () => {
  describe('generateSlots', () => {
    it('should generate hourly slots from pricing rules');
    it('should skip duplicate slots (unique constraint)');
    it('should snapshot price from pricing rule');
    it('should determine dayType correctly');
  });

  describe('holdSlot', () => {
    it('should hold available slot');
    it('should fail to hold already booked slot');
    it('should set holdUntil correctly');
  });

  describe('releaseSlotHold', () => {
    it('should release held slot');
    it('should make slot available again');
  });
});
```

### 6.2 Integration Tests (Swagger)

```bash
# 1. Generate slots
POST /slots/generate
{
  "courtId": "uuid",
  "startDate": "2025-08-15",
  "endDate": "2025-08-22"
}
# Expected: { generated: 84, skipped: 0, errors: [] }

# 2. List available slots
GET /slots?courtId=uuid&status=Available&date=2025-08-15
# Expected: Array of 12 slots (9AM-9PM)

# 3. Hold a slot
POST /slots/uuid/hold
# Expected: Slot with status: Held, heldUntil set

# 4. Try booking held slot (should fail in booking service)

# 5. Block a slot
POST /slots/uuid/block
{ "reason": "Maintenance" }
# Expected: Slot with status: Blocked

# 6. Cleanup expired slots
DELETE /slots/cleanup?beforeDate=2025-08-01
# Expected: { deleted: 168 }
```

---

## Part 7: Dependencies

- **Pricing Module**: Must exist (reads pricing rules)
- **Courts Module**: Must exist (courtId reference)
- **Next**: Bookings Module (will use slots for booking)

---

## Implementation Order

1. **Create module structure** (10 min)
2. **Implement generateSlots** (1 hour)
3. **Implement hold/release logic** (30 min)
4. **Implement block/unblock logic** (20 min)
5. **Implement findAll/findOne** (20 min)
6. **Create DTOs** (30 min)
7. **Create controller** (30 min)
8. **Add Swagger decorators** (20 min)
9. **Add guards and permissions** (10 min)
10. **Testing** (1 hour)

**Total estimated time**: ~4 hours

---

## Future Enhancements

1. **Holiday Calendar**: Store holidays in DB, check in getDayType()
2. **Custom Slot Duration**: Support non-hourly slots (30 min, 90 min)
3. **Bulk Generation**: Generate for all courts at once
4. **Auto-generation Cron**: Nightly job to generate next week's slots
5. **Slot Templates**: Pre-defined slot patterns for quick setup
