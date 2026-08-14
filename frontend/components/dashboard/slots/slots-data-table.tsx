"use client";

import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Building2,
  DollarSign,
  MoreHorizontal,
  Ban,
  Unlock,
  CalendarX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUnblockSlot } from "@/hooks/slots";
import type {
  Slot,
  SlotListResponse,
} from "@/lib/types/slot";
import type { SlotStatus } from "@/lib/types/enums";
import { SlotStatusBadge } from "./slot-status-badge";

interface SlotsDataTableProps {
  data: SlotListResponse;
  courts: Array<{ id: string; name: string }>;
  onPageChange: (page: number) => void;
  onStatusFilter: (status: SlotStatus | "All") => void;
  onCourtFilter: (courtId: string | undefined) => void;
  onDateFilter: (date: string | undefined) => void;
  currentStatus: SlotStatus | "All";
  currentCourtId: string | undefined;
  currentDate: string | undefined;
  onBlockClick: (slot: Slot) => void;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed bg-card/50 p-8 shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600/10 text-teal-600 mb-3">
        <Calendar className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-base text-foreground">No Slots Found</h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground">
        Showing Page{" "}
        <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
        <span className="font-semibold text-foreground">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Convert HH:mm to a 12-hour display (e.g. "09:00" -> "9:00 AM"). */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/** Format a YYYY-MM-DD date for display using local components (no TZ shift). */
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(price: string): string {
  return Number(price).toLocaleString();
}

/** Format an ISO heldUntil timestamp to a local time. */
function formatHeldUntil(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SlotsDataTable({
  data,
  courts,
  onPageChange,
  onStatusFilter,
  onCourtFilter,
  onDateFilter,
  currentStatus,
  currentCourtId,
  currentDate,
  onBlockClick,
}: SlotsDataTableProps) {
  const unblockMutation = useUnblockSlot();

  const slotsList = data?.data ?? [];

  const handleUnblock = (slot: Slot) => {
    if (
      confirm(
        `Unblock this slot (${slot.courtName ?? "Court"} · ${slot.startTime}–${slot.endTime})?`,
      )
    ) {
      unblockMutation.mutate(slot.id, {
        onSuccess: () => {
          toast.success("Slot reopened", {
            description: "It is available for booking again.",
          });
        },
        onError: (error: Error) => {
          toast.error("Failed to unblock slot", { description: error.message });
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50/50 border border-green-200/30 dark:bg-green-950/20">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="font-medium text-foreground">
            {slotsList.filter((s) => s.status === "Available").length}
          </span>
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/50 border border-blue-200/30 dark:bg-blue-950/20">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="font-medium text-foreground">
            {slotsList.filter((s) => s.status === "Booked").length}
          </span>
          <span className="text-muted-foreground">Booked</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50/50 border border-amber-200/30 dark:bg-amber-950/20">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="font-medium text-foreground">
            {slotsList.filter((s) => s.status === "Held").length}
          </span>
          <span className="text-muted-foreground">Held</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50/50 border border-red-200/30 dark:bg-red-950/20">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="font-medium text-foreground">
            {slotsList.filter((s) => s.status === "Blocked").length}
          </span>
          <span className="text-muted-foreground">Blocked</span>
        </div>
        <div className="ml-auto text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{data?.total ?? 0}</span> slots
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={currentStatus}
          onValueChange={(value) => onStatusFilter(value as SlotStatus | "All")}
        >
          <SelectTrigger className="w-40 h-9 text-xs bg-card">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Booked">Booked</SelectItem>
            <SelectItem value="Held">Held</SelectItem>
            <SelectItem value="Blocked">Blocked</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={currentCourtId ?? "all"}
          onValueChange={(value) =>
            onCourtFilter(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="w-44 h-9 text-xs bg-card">
            <SelectValue placeholder="Filter Court" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courts</SelectItem>
            {courts.map((court) => (
              <SelectItem key={court.id} value={court.id}>
                {court.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={currentDate ?? ""}
            onChange={(e) => onDateFilter(e.target.value || undefined)}
            className="w-44 h-9 text-xs bg-card pl-9"
          />
        </div>
      </div>

      {/* Empty State */}
      {slotsList.length === 0 ? (
        <EmptyState message="No slots generated yet for the selected filters. Click “Generate Slots” to create inventory from pricing rules." />
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5 pl-4">Date</th>
                  <th className="p-3.5">Court</th>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Price</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Held Until</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {slotsList.map((slot) => {
                  const canBlock =
                    slot.status === "Available" || slot.status === "Held";
                  const canUnblock = slot.status === "Blocked";
                  const hasAction = canBlock || canUnblock;

                  return (
                    <tr
                      key={slot.id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span className="text-foreground font-medium">
                            {formatDate(slot.date)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-teal-600" />
                          <span className="font-medium text-foreground">
                            {slot.courtName ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatTime(slot.startTime)} –{" "}
                            {formatTime(slot.endTime)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span className="font-semibold text-foreground">
                            {formatPrice(slot.price)}
                          </span>
                          <span className="text-muted-foreground">/hr</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <SlotStatusBadge status={slot.status} />
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {slot.status === "Held" && slot.heldUntil ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            until {formatHeldUntil(slot.heldUntil)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right pr-4">
                        {hasAction ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {canBlock && (
                                <DropdownMenuItem
                                  onClick={() => onBlockClick(slot)}
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Close slot
                                </DropdownMenuItem>
                              )}
                              {canUnblock && (
                                <DropdownMenuItem
                                  onClick={() => handleUnblock(slot)}
                                  disabled={unblockMutation.isPending}
                                >
                                  <Unlock className="h-4 w-4 mr-2" />
                                  Reopen slot
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-muted-foreground/40 inline-flex items-center gap-1 text-[11px]">
                            <CalendarX className="h-3.5 w-3.5" />
                            {slot.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        onPageChange={onPageChange}
      />
    </div>
  );
}
