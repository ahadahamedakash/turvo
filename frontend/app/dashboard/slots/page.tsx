"use client";

import { useState } from "react";
import { Calendar, Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSlots } from "@/hooks/slots";
import { useCourts } from "@/hooks/courts";
import { SlotsDataTable } from "@/components/dashboard/slots/slots-data-table";
import { GenerateSlotsDialog } from "@/components/dashboard/slots/generate-slots-dialog";
import { BlockSlotDialog } from "@/components/dashboard/slots/block-slot-dialog";
import { CleanupSlotsDialog } from "@/components/dashboard/slots/cleanup-slots-dialog";
import { SlotSettingsCard } from "@/components/dashboard/slots/slot-settings-card";
import { BookingPaymentSettingsCard } from "@/components/dashboard/slots/booking-payment-settings-card";
import type { Slot } from "@/lib/types/slot";
import type { SlotStatus } from "@/lib/types/enums";

export default function SlotsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SlotStatus | "All">("All");
  const [selectedCourt, setSelectedCourt] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState<string | undefined>();

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [slotToBlock, setSlotToBlock] = useState<Slot | null>(null);

  const { data, isLoading, error } = useSlots({
    page,
    status: status === "All" ? undefined : status,
    courtId: selectedCourt,
    date: selectedDate,
  });

  const { data: courts } = useCourts({ limit: 100 });

  const slotsList = data?.data ?? [];

  // Stats reflect the current filtered view
  const availableSlots = slotsList.filter((s) => s.status === "Available").length;
  const bookedSlots = slotsList.filter((s) => s.status === "Booked").length;
  const heldSlots = slotsList.filter((s) => s.status === "Held").length;
  const blockedSlots = slotsList.filter((s) => s.status === "Blocked").length;

  const handleBlockClick = (slot: Slot) => {
    setSlotToBlock(slot);
    setIsBlockOpen(true);
  };

  const handleResetFilters = () => {
    setPage(1);
    setStatus("All");
    setSelectedCourt(undefined);
    setSelectedDate(undefined);
  };

  const hasActiveFilters =
    status !== "All" || !!selectedCourt || !!selectedDate || page !== 1;

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
              <Calendar className="mr-1 h-3 w-3" /> Slot Management
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Slot Inventory
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            Generate bookable slots from pricing rules, view availability, and
            block slots for maintenance or private events.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setIsCleanupOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Cleanup Old
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700"
            onClick={() => setIsGenerateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Open for Booking
          </Button>
        </div>
      </div>

      {/* Auto-pilot + day-type settings */}
      <SlotSettingsCard />

      {/* Booking payment settings */}
      <BookingPaymentSettingsCard />

      {/* Quick Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-200/30 bg-green-50/30 dark:border-green-900/50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {availableSlots}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-600/10 flex items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/30 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Booked</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {bookedSlots}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-600/10 flex items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/30 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Held</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {heldSlots}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-600/10 flex items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200/30 bg-red-50/30 dark:border-red-900/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {blockedSlots}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-600/10 flex items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Card className="border-blue-200/30 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">
                How Slot Inventory Works
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Slots are generated hourly from each court&apos;s pricing rules
                and capture the price as a snapshot at generation time. Expired
                holds are released automatically; blocking makes a slot
                unavailable without cancelling any booking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-xl border bg-card/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center text-xs text-destructive">
            Failed to load slots. Please refresh or verify network connection.
          </CardContent>
        </Card>
      )}

      {/* Main Data Table */}
      {!isLoading && !error && data && (
        <SlotsDataTable
          data={data}
          courts={courts?.data ?? []}
          onPageChange={setPage}
          onStatusFilter={(value) => {
            setStatus(value);
            setPage(1);
          }}
          onCourtFilter={(value) => {
            setSelectedCourt(value);
            setPage(1);
          }}
          onDateFilter={(value) => {
            setSelectedDate(value);
            setPage(1);
          }}
          currentStatus={status}
          currentCourtId={selectedCourt}
          currentDate={selectedDate}
          onBlockClick={handleBlockClick}
        />
      )}

      {/* Clear filters helper */}
      {hasActiveFilters && !isLoading && !error && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={handleResetFilters}
          >
            Clear filters
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <GenerateSlotsDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
      />
      <BlockSlotDialog
        open={isBlockOpen}
        onOpenChange={setIsBlockOpen}
        slot={slotToBlock}
      />
      <CleanupSlotsDialog
        open={isCleanupOpen}
        onOpenChange={setIsCleanupOpen}
      />
    </div>
  );
}
