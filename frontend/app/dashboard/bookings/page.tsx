"use client";

/**
 * Bookings — the staff calendar. The day grid IS the app (booking-flow
 * README): rows = time, columns = courts, one cell per slot.
 *
 * Tabs: Calendar (Task 5) | List (Task 8). Clicking an available slot opens
 * the create dialog (Task 6); clicking a booked block or a list row opens the
 * SAME detail sheet (Task 7) — one source of truth for booking detail.
 */

import { useMemo, useState } from "react";
import { CalendarDays, List, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBookings, useDayView } from "@/hooks/bookings";
import { useCourts } from "@/hooks/courts";
import { useDebounce } from "@/hooks/use-debounce";
import { useHolidays, useSlotSettings } from "@/hooks/slots";
import type {
  DayViewCourt,
  DayViewSlot,
  QueryBookingsParams,
} from "@/lib/types/booking";
import { BookingCalendar, CalendarSkeleton } from "@/components/dashboard/bookings/booking-calendar";
import { BookingDetailSheet } from "@/components/dashboard/bookings/booking-detail-sheet";
import { BookingFilters, type BookingFilterValues } from "@/components/dashboard/bookings/booking-filters";
import { BookingsDataTable } from "@/components/dashboard/bookings/bookings-data-table";
import { CreateBookingDialog } from "@/components/dashboard/bookings/create-booking-dialog";
import { DateStrip } from "@/components/dashboard/bookings/date-strip";
import { DayStatsStrip } from "@/components/dashboard/bookings/day-stats-strip";
import { EmptyDayState } from "@/components/dashboard/bookings/empty-day-state";
import { isoAddDays, minutesOf, toISODate } from "@/components/dashboard/bookings/grid-utils";

// Module scope only — never `new Date()` during render (purity rule).
const DEFAULT_TODAY = toISODate(new Date());
const DEFAULT_DATE_TO = isoAddDays(DEFAULT_TODAY, 7);

const DEFAULT_FILTERS: BookingFilterValues = {
  dateFrom: DEFAULT_TODAY,
  dateTo: DEFAULT_DATE_TO,
  courtId: "",
  status: "",
  paymentStatus: "",
  customer: "",
};

/** Context handed to the create dialog (Task 6). */
interface CreateContext {
  court: DayViewCourt;
  date: string;
  /** Clicked slot + every later same-court slot, sorted — the duration pool. */
  slots: DayViewSlot[];
}

export default function BookingsPage() {
  const [selectedDate, setSelectedDate] = useState(DEFAULT_TODAY);
  const [createContext, setCreateContext] = useState<CreateContext | null>(null);
  const [detailBookingId, setDetailBookingId] = useState<string | null>(null);

  const dayViewQuery = useDayView(selectedDate);
  const { data: settings } = useSlotSettings();
  const { data: holidays } = useHolidays();

  // ---- List tab state (slots-page pattern) --------------------------------
  const [listFilters, setListFilters] = useState<BookingFilterValues>(DEFAULT_FILTERS);
  const [listPage, setListPage] = useState(1);
  const debouncedCustomer = useDebounce(listFilters.customer, 400);

  const listParams = useMemo<QueryBookingsParams>(
    () => ({
      dateFrom: listFilters.dateFrom || undefined,
      dateTo: listFilters.dateTo || undefined,
      courtId: listFilters.courtId || undefined,
      status: (listFilters.status || undefined) as QueryBookingsParams["status"],
      paymentStatus: (listFilters.paymentStatus || undefined) as QueryBookingsParams["paymentStatus"],
      customer: debouncedCustomer.trim() || undefined,
      page: listPage,
      limit: 10,
    }),
    [listFilters, debouncedCustomer, listPage],
  );
  const listQuery = useBookings(listParams);
  const { data: courtsData } = useCourts({ limit: 100 });
  const courts = useMemo(
    () => courtsData?.data.map((c) => ({ id: c.id, name: c.name })) ?? [],
    [courtsData],
  );

  /** Any filter change resets pagination to page 1. */
  const updateListFilters = (patch: Partial<BookingFilterValues>) => {
    setListFilters((filters) => ({ ...filters, ...patch }));
    setListPage(1);
  };

  const clearListFilters = () => {
    setListFilters(DEFAULT_FILTERS);
    setListPage(1);
  };

  const holidayByDate = useMemo(
    () => Object.fromEntries((holidays ?? []).map((h) => [h.date, h.name])),
    [holidays],
  );

  const dayView = dayViewQuery.data;
  const isEmptyDay = dayView !== undefined && dayView.slots.length === 0;

  const openCreateDialog = (court: DayViewCourt, slot: DayViewSlot) => {
    const slots = (dayView?.slots ?? [])
      .filter((s) => s.courtId === court.id && s.startTime >= slot.startTime)
      .sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));
    setCreateContext({ court, date: selectedDate, slots });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-semibold uppercase text-teal-700 border-teal-600/30 bg-teal-50 dark:bg-teal-950"
            >
              <CalendarDays className="mr-1 h-3 w-3" /> Bookings
            </Badge>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
              </span>
              Live · refreshes every 60s
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Court Calendar
          </h1>
          <p className="max-w-xl text-xs text-muted-foreground">
            One row per time slot, one column per court. Click a green slot to
            book, click a booking block for details.
          </p>
        </div>
      </div>

      <Tabs defaultValue="calendar">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-9 w-full sm:w-auto">
            <TabsTrigger value="calendar" className="gap-1.5 text-xs">
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5 text-xs">
              <List className="h-3.5 w-3.5" /> List
            </TabsTrigger>
          </TabsList>
          <DateStrip
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            todayIso={DEFAULT_TODAY}
            weekendDays={settings?.weekendDays ?? [5, 6]}
            holidays={holidayByDate}
          />
        </div>

        <TabsContent value="calendar" className="mt-4 space-y-4">
          {dayViewQuery.isError ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-xs text-destructive">
                Couldn&apos;t load the calendar — {dayViewQuery.error.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 text-xs"
                onClick={() => dayViewQuery.refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : dayViewQuery.isLoading || !dayView ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[62px] animate-pulse rounded-lg border bg-card"
                  />
                ))}
              </div>
              <CalendarSkeleton />
            </div>
          ) : isEmptyDay ? (
            <EmptyDayState date={selectedDate} todayIso={DEFAULT_TODAY} />
          ) : (
            <>
              <DayStatsStrip stats={dayView.stats} />
              <BookingCalendar
                dayView={dayView}
                date={selectedDate}
                onBookSlot={openCreateDialog}
                onOpenBooking={setDetailBookingId}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-4">
          {listQuery.isError ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-xs text-destructive">
                Couldn&apos;t load bookings — {listQuery.error.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 text-xs"
                onClick={() => listQuery.refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          ) : (
            <>
              <BookingFilters
                values={listFilters}
                courts={courts}
                onChange={updateListFilters}
              />
              <BookingsDataTable
                data={listQuery.data}
                isLoading={listQuery.isLoading}
                onPageChange={setListPage}
                onRowClick={setDetailBookingId}
                onClearFilters={clearListFilters}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Task 6 — keyed per clicked slot so the form starts clean */}
      {createContext && createContext.slots.length > 0 && (
        <CreateBookingDialog
          key={createContext.slots[0].id}
          open
          onOpenChange={(open) => !open && setCreateContext(null)}
          court={createContext.court}
          date={createContext.date}
          slots={createContext.slots}
        />
      )}

      {/* Task 7 — shared by the calendar grid and the list rows */}
      <BookingDetailSheet
        bookingId={detailBookingId}
        onOpenChange={(open) => !open && setDetailBookingId(null)}
      />
    </div>
  );
}
