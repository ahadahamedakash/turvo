"use client";

/**
 * Phone-first customer typeahead for the create-booking dialog.
 *
 * Debounces (300ms) into `useCustomerSearch`, which fires once the term is
 * meaningful (3+ digits or 2+ chars). Picking a match hands the customer up
 * via `onPick`; free text simply stays for the manual name/phone fields below.
 * The debounce lives here (not in the hook) so the query key changes only
 * once typing settles.
 */

import {
  useEffect,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { Loader2, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCustomerSearch } from "@/hooks/customers";
import type { CustomerOption } from "@/lib/types/customer";

interface CustomerSearchFieldProps {
  onPick: (customer: CustomerOption) => void;
  disabled?: boolean;
  /** Focused when the dialog opens (walk-in path starts at this field). */
  inputRef?: Ref<HTMLInputElement>;
}

export function CustomerSearchField({
  onPick,
  disabled,
  inputRef,
}: CustomerSearchFieldProps) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Debounce — setState only inside the timer callback (lint-safe pattern).
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const searchQuery = useCustomerSearch(debounced);
  const results = searchQuery.data?.data ?? [];
  const searching = searchQuery.isFetching && debounced.trim().length > 0;

  const pick = (customer: CustomerOption) => {
    onPick(customer);
    setTerm("");
    setDebounced("");
    setListOpen(false);
    setActiveIndex(-1);
  };

  const showList = listOpen && debounced.trim().length > 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showList || results.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        // Picking must not submit the booking form.
        if (activeIndex >= 0 && results[activeIndex]) {
          event.preventDefault();
          pick(results[activeIndex]);
        }
        break;
      case "Escape":
        setListOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setListOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setListOpen(true)}
        onBlur={() => setListOpen(false)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Search by phone or name…"
        className="pl-9"
        autoComplete="off"
      />
      {searching && (
        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
      )}

      {showList && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-card shadow-lg">
          {searching ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">
              Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">
              No customer found — enter their details below.
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto py-1">
              {results.map((customer, index) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    // mousedown beats the input's blur so the pick lands.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(customer);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs ${
                      index === activeIndex ? "bg-muted" : ""
                    }`}
                  >
                    <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {customer.firstName} {customer.lastName}
                    </span>
                    {customer.phone && (
                      <span className="ml-auto tabular-nums text-muted-foreground">
                        {customer.phone}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
