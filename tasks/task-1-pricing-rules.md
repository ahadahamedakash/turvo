# Task 1: Pricing Rules Implementation

**Scope**: Backend API + Frontend UI for Pricing Rules Management
**Status**: Ready to Start
**Priority**: High (foundational for slots and bookings)

---

## Part 1: Backend Implementation

### 1.1 Backend Status

**Current State**: ✅ Pricing module already implemented in backend

Files:
- `backend/src/modules/pricing/pricing.service.ts` - Business logic
- `backend/src/modules/pricing/pricing.controller.ts` - API endpoints
- `backend/prisma/pricing-rule.prisma` - Schema

API Endpoints (Already exist):
```
POST   /pricing         - Create pricing rule
GET    /pricing         - List all rules (paginated, filterable)
GET    /pricing/:id     - Get single rule
PUT    /pricing/:id     - Update rule
DELETE /pricing/:id     - Soft delete rule
POST   /pricing/bulk    - Bulk create
```

**Verification Needed**: Swagger documentation completeness, permission guards.

### 1.2 Backend Checklist

- [ ] Verify pricing module is imported in `app.module.ts`
- [ ] Verify Swagger decorators on all endpoints
- [ ] Verify `@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)` on controller
- [ ] Verify `@RequirePermissions('Court.update')` on mutation endpoints
- [ ] Test all endpoints via Swagger UI
- [ ] Verify overlap detection works (no overlapping time ranges for same court/dayType)

---

## Part 2: Frontend Implementation

### 2.1 Files to Create

```
frontend/
├── app/dashboard/pricing-rules/
│   └── page.tsx                    # Main pricing rules page
├── components/dashboard/pricing/
│   ├── pricing-data-table.tsx     # Table for listing rules
│   ├── pricing-rule-dialog.tsx    # Create/edit dialog
│   └── pricing-time-range-input.tsx # Time range input component
├── hooks/
│   └── pricing.ts                  # React Query hooks
├── lib/api/
│   └── pricing.ts                  # API client
└── lib/types/
    └── pricing.ts                  # TypeScript types
```

### 2.2 Type Definitions

**File**: `lib/types/pricing.ts`

```typescript
import type { DayType } from "@/lib/types/enums";

export interface PricingRule {
  id: string;
  tenantId: string;
  courtId: string;
  dayType: DayType;
  startTime: string;    // HH:mm format
  endTime: string;      // HH:mm format
  price: number;        // Decimal
  courtName?: string;   // Included in response
  slotCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePricingRuleDto {
  courtId: string;
  dayType: DayType;
  startTime: string;    // HH:mm format
  endTime: string;      // HH:mm format
  price: number;
}

export interface UpdatePricingRuleDto extends Partial<CreatePricingRuleDto> {}

export interface PricingRuleListResponse {
  data: PricingRule[];
  total: number;
  page: number;
  limit: number;
}

export interface QueryPricingRuleParams {
  courtId?: string;
  dayType?: DayType;
  page?: number;
  limit?: number;
}
```

**File**: `lib/types/enums.ts` (add if not exists)

```typescript
export type DayType = "Weekday" | "Weekend" | "Holiday";
```

### 2.3 API Client

**File**: `lib/api/pricing.ts`

```typescript
import { apiClient } from "./api-client";
import type {
  PricingRule,
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
  PricingRuleListResponse,
  QueryPricingRuleParams,
} from "@/lib/types/pricing";

export const pricingApi = {
  list: (params?: QueryPricingRuleParams) =>
    apiClient.get<PricingRuleListResponse>("/pricing", { params }),

  get: (id: string) =>
    apiClient.get<PricingRule>(`/pricing/${id}`),

  create: (data: CreatePricingRuleDto) =>
    apiClient.post<PricingRule>("/pricing", data),

  update: (id: string, data: UpdatePricingRuleDto) =>
    apiClient.put<PricingRule>(`/pricing/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/pricing/${id}`),

  bulkCreate: (data: CreatePricingRuleDto[]) =>
    apiClient.post<PricingRule[]>("/pricing/bulk", { rules: data }),
};
```

### 2.4 React Query Hooks

**File**: `hooks/pricing.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react/query";
import { pricingApi } from "@/lib/api/pricing";
import type { CreatePricingRuleDto, UpdatePricingRuleDto, QueryPricingRuleParams } from "@/lib/types/pricing";

// Query key factory
export const pricingKeys = {
  all: ["pricing"] as const,
  lists: () => [...pricingKeys.all, "list"] as const,
  list: (params?: QueryPricingRuleParams) => [...pricingKeys.lists(), params] as const,
  detail: (id: string) => [...pricingKeys.all, "detail", id] as const,
};

export function usePricingRules(params?: QueryPricingRuleParams) {
  return useQuery({
    queryKey: pricingKeys.list(params),
    queryFn: () => pricingApi.list(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePricingRule(id: string) {
  return useQuery({
    queryKey: pricingKeys.detail(id),
    queryFn: () => pricingApi.get(id),
    enabled: !!id,
  });
}

export function useCreatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePricingRuleDto) => pricingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.lists() });
    },
  });
}

export function useUpdatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePricingRuleDto }) =>
      pricingApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: pricingKeys.lists() });
    },
  });
}

export function useDeletePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pricingApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.lists() });
    },
  });
}
```

### 2.5 Pricing Rules Page

**File**: `app/dashboard/pricing-rules/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { DollarSign, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePricingRules } from "@/hooks/pricing";
import { PricingDataTable } from "@/components/dashboard/pricing/pricing-data-table";
import { PricingRuleDialog } from "@/components/dashboard/pricing/pricing-rule-dialog";
import type { PricingRule, DayType } from "@/lib/types/pricing";

export default function PricingRulesPage() {
  const [page, setPage] = useState(1);
  const [dayType, setDayType] = useState<DayType | "All">("All");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<PricingRule | null>(null);

  const { data, isLoading, error } = usePricingRules({
    page,
    dayType: dayType === "All" ? undefined : dayType,
  });

  // ... similar pattern to courts page

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-card p-6 border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-semibold uppercase text-teal-700 border-teal-600/30 bg-teal-50 dark:bg-teal-950">
              <DollarSign className="mr-1 h-3 w-3" /> Pricing
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pricing Rules
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            Configure pricing for different time periods and day types. Rules apply to slot generation.
          </p>
        </div>

        <Button
          size="sm"
          className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700"
          onClick={() => {
            setRuleToEdit(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Pricing Rule
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Rules</p>
            <p className="text-2xl font-bold">{data?.total ?? 0}</p>
          </CardContent>
        </Card>
        {/* ... more stats */}
      </div>

      {/* Data Table */}
      {!isLoading && !error && data && (
        <PricingDataTable
          data={data}
          onPageChange={setPage}
          onDayTypeFilter={setDayType}
          onEditClick={(rule) => {
            setRuleToEdit(rule);
            setIsDialogOpen(true);
          }}
        />
      )}

      {/* Dialog */}
      <PricingRuleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        ruleToEdit={ruleToEdit}
        onSuccess={() => {
          // Refetch handled by mutation
        }}
      />
    </div>
  );
}
```

### 2.6 Data Table Component

**File**: `components/dashboard/pricing/pricing-data-table.tsx`

Key columns:
- Court Name
- Day Type (badge)
- Time Range (e.g., "09:00 - 12:00")
- Price (formatted)
- Slot Count
- Actions (Edit, Delete)

### 2.7 Create/Edit Dialog

**File**: `components/dashboard/pricing/pricing-rule-dialog.tsx`

Form fields:
- Court (dropdown, fetches from courts API)
- Day Type (Weekday/Weekend/Holiday)
- Start Time (time picker, HH:mm format)
- End Time (time picker, HH:mm format)
- Price (number input, decimal validation)

**Validation rules**:
- Court is required
- Day type is required
- Start time < End time
- Price > 0
- No overlap with existing rules for same court/dayType (backend validates)

### 2.8 Time Range Input Component

**File**: `components/dashboard/pricing/pricing-time-range-input.tsx`

A specialized component for selecting time ranges with:
- Preset buttons (1 hour, 2 hours, etc.)
- Custom time picker
- Visual preview of selected range

---

## Part 3: Verification

### 3.1 Backend Tests

```bash
# Via Swagger UI: http://localhost:5000/api
1. GET /pricing - List all rules
2. POST /pricing - Create rule (test overlap detection)
3. PUT /pricing/:id - Update rule
4. DELETE /pricing/:id - Soft delete
5. GET /pricing?courtId=xxx&dayType=Weekday - Test filtering
```

### 3.2 Frontend Tests

```bash
# Access page
http://localhost:3000/dashboard/pricing-rules

1. Verify page loads without errors
2. Click "Add Pricing Rule" - dialog opens
3. Fill form and submit - rule appears in table
4. Edit existing rule - updates successfully
5. Delete rule - soft delete works
6. Filter by day type - results update
7. Search - results update
```

### 3.3 Integration Tests

1. Create pricing rule for Court A, Weekday, 09:00-12:00, 500 BDT
2. Verify rule appears in list
3. Try creating overlapping rule - should show error
4. Update price to 600 BDT - should update
5. Delete rule - should disappear from list (soft delete)

---

## Part 4: Navigation Update

**File**: `components/dashboard/sidebar/navigation.tsx` (or wherever navigation is defined)

Add pricing rules link:

```typescript
const navigation = [
  // ... existing items
  {
    name: "Pricing Rules",
    href: "/dashboard/pricing-rules",
    icon: DollarSign,
    description: "Configure pricing for courts and time periods",
  },
];
```

---

## Implementation Order

1. **Backend verification** (15 min)
   - Check existing module, Swagger, guards
   - Test endpoints via Swagger

2. **Frontend types** (10 min)
   - Create pricing.ts types
   - Add DayType enum

3. **API client** (10 min)
   - Create pricing.ts API client

4. **React Query hooks** (15 min)
   - Create pricing.ts hooks

5. **UI components** (1-2 hours)
   - Page component
   - Data table
   - Dialog
   - Time range input

6. **Navigation** (5 min)
   - Add pricing rules link to sidebar

7. **Testing** (30 min)
   - Manual testing of all flows

**Total estimated time**: ~3 hours

---

## Dependencies

- None (backend already exists)
- Frontend depends on: courts (for court selection dropdown)
- Next: Slots module (will use pricing rules)
