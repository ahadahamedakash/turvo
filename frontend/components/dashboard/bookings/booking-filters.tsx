"use client";

/**
 * Filter bar for the bookings List tab. Purely presentational — state lives in
 * the page (slots-page pattern); every change calls up and the page resets
 * pagination to 1. The customer input is debounced by the page (400ms).
 */

import { Calendar, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BookingPaymentStatus } from "@/lib/types/booking";

/** Sentinel select values meaning "no filter". */
const ALL = "all";

export interface BookingFilterValues {
  dateFrom: string;
  dateTo: string;
  courtId: string;
  status: string;
  paymentStatus: string;
  customer: string;
}

export interface BookingFiltersProps {
  values: BookingFilterValues;
  courts: Array<{ id: string; name: string }>;
  onChange: (patch: Partial<BookingFilterValues>) => void;
}

const STATUS_OPTIONS = [
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
  "NoShow",
] as const;

const PAYMENT_OPTIONS: BookingPaymentStatus[] = ["Paid", "Partial", "Unpaid"];

export function BookingFilters({ values, courts, onChange }: BookingFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="date"
          aria-label="Date from"
          value={values.dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value })}
          className="w-40 bg-card pl-9 text-xs"
        />
      </div>
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="date"
          aria-label="Date to"
          value={values.dateTo}
          onChange={(e) => onChange({ dateTo: e.target.value })}
          className="w-40 bg-card pl-9 text-xs"
        />
      </div>

      <Select
        value={values.courtId || ALL}
        onValueChange={(v) => onChange({ courtId: v === ALL ? "" : v })}
      >
        <SelectTrigger className="w-40 bg-card text-xs">
          <SelectValue placeholder="All courts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All courts</SelectItem>
          {courts.map((court) => (
            <SelectItem key={court.id} value={court.id}>
              {court.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={values.status || ALL}
        onValueChange={(v) => onChange({ status: v === ALL ? "" : v })}
      >
        <SelectTrigger className="w-40 bg-card text-xs">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={values.paymentStatus || ALL}
        onValueChange={(v) => onChange({ paymentStatus: v === ALL ? "" : v })}
      >
        <SelectTrigger className="w-40 bg-card text-xs">
          <SelectValue placeholder="All payments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All payments</SelectItem>
          {PAYMENT_OPTIONS.map((payment) => (
            <SelectItem key={payment} value={payment}>
              {payment}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1 sm:min-w-[180px]">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={values.customer}
          onChange={(e) => onChange({ customer: e.target.value })}
          placeholder="Search name or phone…"
          className="bg-card pl-9 text-xs"
        />
      </div>
    </div>
  );
}
