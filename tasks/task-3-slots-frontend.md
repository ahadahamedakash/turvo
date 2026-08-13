# Task 3: Slot Management UI (Frontend)

**Scope**: Frontend UI for Slot Management
**Status**: TODO
**Priority**: High (admin needs to manage slots)

---

## Context

This task creates the admin-facing UI for slot management. It allows admins to:
- Generate slots from pricing rules
- View slot inventory
- Block/unblock slots (maintenance, events)
- View slot status and bookings

**Note**: This is NOT the customer booking wizard (that's a separate flow).

---

## Part 1: Files to Create

```
frontend/
├── app/dashboard/slots/
│   └── page.tsx                    # Main slot management page
├── components/dashboard/slots/
│   ├── slots-data-table.tsx        # Table for listing slots
│   ├── generate-slots-dialog.tsx    # Dialog for slot generation
│   ├── slot-status-badge.tsx       # Status badge component
│   └── block-slot-dialog.tsx       # Dialog for blocking slots
├── hooks/
│   └── slots.ts                     # React Query hooks
├── lib/api/
│   └── slots.ts                     # API client
└── lib/types/
    └── slot.ts                      # TypeScript types
```

---

## Part 2: Type Definitions

**File**: `lib/types/slot.ts`

```typescript
import type { SlotStatus } from "@/lib/types/enums";

export interface Slot {
  id: string;
  tenantId: string;
  courtId: string;
  courtName?: string;
  pricingRuleId?: string;
  price: number;
  date: string;        // ISO date string
  startTime: string;   // HH:mm format
  endTime: string;     // HH:mm format
  status: SlotStatus;
  heldAt?: string;
  heldBy?: string;
  heldUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateSlotsDto {
  courtId: string;
  startDate: string;   // ISO date string
  endDate: string;     // ISO date string
}

export interface SlotGenerationResult {
  generated: number;
  skipped: number;
  errors: string[];
}

export interface BlockSlotDto {
  reason: string;
}

export interface SlotListResponse {
  data: Slot[];
  total: number;
  page: number;
  limit: number;
}

export interface QuerySlotsParams {
  courtId?: string;
  status?: SlotStatus;
  date?: string;
  page?: number;
  limit?: number;
}
```

**File**: `lib/types/enums.ts` (extend if not exists)

```typescript
export type SlotStatus = "Available" | "Booked" | "Blocked" | "Expired" | "Held";
```

---

## Part 3: API Client

**File**: `lib/api/slots.ts`

```typescript
import { apiClient } from "./api-client";
import type {
  Slot,
  GenerateSlotsDto,
  SlotGenerationResult,
  BlockSlotDto,
  SlotListResponse,
  QuerySlotsParams,
} from "@/lib/types/slot";

export const slotsApi = {
  list: (params?: QuerySlotsParams) =>
    apiClient.get<SlotListResponse>("/slots", { params }),

  get: (id: string) =>
    apiClient.get<Slot>(`/slots/${id}`),

  generate: (data: GenerateSlotsDto) =>
    apiClient.post<SlotGenerationResult>("/slots/generate", data),

  hold: (id: string) =>
    apiClient.post<Slot>(`/slots/${id}/hold`),

  release: (id: string) =>
    apiClient.post<Slot>(`/slots/${id}/release`),

  block: (id: string, data: BlockSlotDto) =>
    apiClient.post<Slot>(`/slots/${id}/block`, data),

  unblock: (id: string) =>
    apiClient.post<Slot>(`/slots/${id}/unblock`),

  cleanup: (beforeDate: string) =>
    apiClient.delete<{ deleted: number }>(`/slots/cleanup`, {
      params: { beforeDate },
    }),
};
```

---

## Part 4: React Query Hooks

**File**: `hooks/slots.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { slotsApi } from "@/lib/api/slots";
import type { GenerateSlotsDto, BlockSlotDto, QuerySlotsParams } from "@/lib/types/slot";

// Query key factory
export const slotKeys = {
  all: ["slots"] as const,
  lists: () => [...slotKeys.all, "list"] as const,
  list: (params?: QuerySlotsParams) => [...slotKeys.lists(), params] as const,
  detail: (id: string) => [...slotKeys.all, "detail", id] as const,
};

export function useSlots(params?: QuerySlotsParams) {
  return useQuery({
    queryKey: slotKeys.list(params),
    queryFn: () => slotsApi.list(params),
    staleTime: 30 * 1000, // Slots change frequently, shorter stale time
  });
}

export function useSlot(id: string) {
  return useQuery({
    queryKey: slotKeys.detail(id),
    queryFn: () => slotsApi.get(id),
    enabled: !!id,
  });
}

export function useGenerateSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateSlotsDto) => slotsApi.generate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

export function useHoldSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => slotsApi.hold(slotId),
    onSuccess: (_, slotId) => {
      queryClient.invalidateQueries({ queryKey: slotKeys.detail(slotId) });
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

export function useReleaseSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => slotsApi.release(slotId),
    onSuccess: (_, slotId) => {
      queryClient.invalidateQueries({ queryKey: slotKeys.detail(slotId) });
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

export function useBlockSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slotId, data }: { slotId: string; data: BlockSlotDto }) =>
      slotsApi.block(slotId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

export function useUnblockSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slotId: string) => slotsApi.unblock(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}

export function useCleanupSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (beforeDate: string) => slotsApi.cleanup(beforeDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slotKeys.lists() });
    },
  });
}
```

---

## Part 5: Slot Management Page

**File**: `app/dashboard/slots/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { Calendar, Plus, Sparkles, Trash2, Blocks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSlots } from "@/hooks/slots";
import { SlotsDataTable } from "@/components/dashboard/slots/slots-data-table";
import { GenerateSlotsDialog } from "@/components/dashboard/slots/generate-slots-dialog";
import { BlockSlotDialog } from "@/components/dashboard/slots/block-slot-dialog";
import type { Slot, SlotStatus } from "@/lib/types/slot";

export default function SlotsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SlotStatus | "All">("All");
  const [selectedCourt, setSelectedCourt] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [slotToBlock, setSlotToBlock] = useState<Slot | null>(null);

  const { data, isLoading, error } = useSlots({
    page,
    status: status === "All" ? undefined : status,
    courtId: selectedCourt,
    date: selectedDate,
  });

  // Calculate stats
  const availableSlots = data?.data?.filter(s => s.status === "Available").length ?? 0;
  const bookedSlots = data?.data?.filter(s => s.status === "Booked").length ?? 0;
  const heldSlots = data?.data?.filter(s => s.status === "Held").length ?? 0;
  const blockedSlots = data?.data?.filter(s => s.status === "Blocked").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-card p-6 border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-semibold uppercase text-teal-700 border-teal-600/30 bg-teal-50 dark:bg-teal-950">
              <Calendar className="mr-1 h-3 w-3" /> Slot Management
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Slot Inventory
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            Generate and manage booking slots. View availability, block slots for maintenance, and monitor booking status.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {/* Handle cleanup */}}
          >
            <Trash2 className="h-4 w-4" />
            Cleanup Old
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700"
            onClick={() => setIsGenerateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Generate Slots
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-200/30 bg-green-50/30 dark:border-green-900/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-2xl font-bold">{availableSlots}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200/30 bg-blue-50/30 dark:border-blue-900/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Booked</p>
            <p className="text-2xl font-bold">{bookedSlots}</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200/30 bg-amber-50/30 dark:border-amber-900/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Held</p>
            <p className="text-2xl font-bold">{heldSlots}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200/30 bg-red-50/30 dark:border-red-900/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Blocked</p>
            <p className="text-2xl font-bold">{blockedSlots}</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      {!isLoading && !error && data && (
        <SlotsDataTable
          data={data}
          onPageChange={setPage}
          onStatusFilter={setStatus}
          onCourtFilter={setSelectedCourt}
          onDateFilter={setSelectedDate}
          onBlockClick={(slot) => {
            setSlotToBlock(slot);
            setIsBlockDialogOpen(true);
          }}
          onUnblockClick={(slotId) => {
            // Call unblock mutation
          }}
        />
      )}

      {/* Generate Slots Dialog */}
      <GenerateSlotsDialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        onSuccess={() => {
          // Refetch handled by mutation
        }}
      />

      {/* Block Slot Dialog */}
      <BlockSlotDialog
        open={isBlockDialogOpen}
        onOpenChange={setIsBlockDialogOpen}
        slot={slotToBlock}
        onSuccess={() => {
          // Refetch handled by mutation
        }}
      />
    </div>
  );
}
```

---

## Part 6: Data Table Component

**File**: `components/dashboard/slots/slots-data-table.tsx`

Key columns:
- Date (formatted)
- Court Name
- Time Range (e.g., "09:00 - 10:00")
- Price (formatted with currency)
- Status (badge with color coding)
- Held Until (if status is Held)
- Actions (Block/Unblock, View Details)

**Status Badge Colors**:
- Available: Green
- Booked: Blue
- Held: Amber
- Blocked: Red
- Expired: Gray

---

## Part 7: Generate Slots Dialog

**File**: `components/dashboard/slots/generate-slots-dialog.tsx`

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useGenerateSlots } from "@/hooks/slots";
import { useCourts } from "@/hooks/courts";
import { generateSlotsSchema, type GenerateSlotsForm } from "@/lib/schemas/slot";
import { FormSelect, FormDate } from "@/components/form"; // Assuming form components exist

interface GenerateSlotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GenerateSlotsDialog({ open, onOpenChange, onSuccess }: GenerateSlotsDialogProps) {
  const form = useForm<GenerateSlotsForm>({
    resolver: zodResolver(generateSlotsSchema),
    defaultValues: {
      courtId: "",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    },
  });

  const { data: courts } = useCourts();
  const generateMutation = useGenerateSlots();

  const onSubmit = async (data: GenerateSlotsForm) => {
    try {
      const result = await generateMutation.mutateAsync(data);

      // Show success message
      toast.success(
        `Generated ${result.generated} slots. ${result.skipped} already existed.`
      );

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to generate slots");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Generate Slots
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormSelect
              name="courtId"
              label="Court"
              placeholder="Select a court"
              options={courts?.data.map(c => ({ value: c.id, label: c.name })) ?? []}
            />

            <FormDate
              name="startDate"
              label="Start Date"
              placeholder="From date"
            />

            <FormDate
              name="endDate"
              label="End Date"
              placeholder="To date"
            />

            <div className="bg-muted p-3 rounded-lg text-xs text-muted-foreground">
              <p><strong>Note:</strong> Slots will be generated based on pricing rules configured for each court and day type.</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? "Generating..." : "Generate"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Part 8: Block Slot Dialog

**File**: `components/dashboard/slots/block-slot-dialog.tsx`

Simple dialog with:
- Textarea for reason (optional)
- Block/Unblock buttons

---

## Part 9: Zod Schema

**File**: `lib/schemas/slot.ts`

```typescript
import { z } from "zod";

export const generateSlotsSchema = z.object({
  courtId: z.string().uuid("Invalid court ID"),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  // Add validation: startDate <= endDate
  // Add validation: date range not too large (max 1 year?)
});

export type GenerateSlotsForm = z.infer<typeof generateSlotsSchema>;
```

---

## Part 10: Navigation Update

**File**: `components/dashboard/sidebar/navigation.tsx`

Add slots link:

```typescript
{
  name: "Slot Inventory",
  href: "/dashboard/slots",
  icon: Calendar,
  description: "Manage booking slots and availability",
},
```

---

## Implementation Order

1. **Types and API** (20 min)
   - Create slot.ts types
   - Add SlotStatus enum
   - Create slots.ts API client

2. **React Query hooks** (20 min)
   - Create slots.ts hooks

3. **Page component** (30 min)
   - Create slots page with stats

4. **Data table** (45 min)
   - Create slots data table
   - Add status badges
   - Add filters

5. **Generate dialog** (30 min)
   - Create generate slots dialog
   - Integrate with courts API

6. **Block dialog** (15 min)
   - Create block/unblock dialog

7. **Navigation** (5 min)
   - Add slots link to sidebar

8. **Testing** (30 min)
   - Generate slots for various date ranges
   - Test block/unblock
   - Test filters and search

**Total estimated time**: ~3 hours

---

## Dependencies

- Backend slots module (must be completed first)
- Courts module (for court selection in generate dialog)
- Pricing rules (used for slot generation logic)
