/**
 * React Query hooks for Customers (booking-dialog typeahead)
 *
 * Debouncing (300ms) lives in the customer-search input component (Task 6)
 * so the query key only changes once typing settles — this hook just reacts
 * to the term it is given.
 */

import { useQuery } from "@tanstack/react-query";
import { customersApi } from "@/lib/api/customers";

/**
 * Query key factory for customers
 */
export const customerKeys = {
  all: ["customers"] as const,
  search: (term: string) => [...customerKeys.all, "search", term] as const,
};

/**
 * Search customers by phone digits or name. Fires once the term is
 * meaningful: 3+ digits (phone fragment) or 2+ characters (name).
 * No polling — typeahead results don't go stale mid-dialog.
 */
export function useCustomerSearch(term: string) {
  const digits = term.replace(/\D/g, "").length;

  return useQuery({
    queryKey: customerKeys.search(term),
    queryFn: () => customersApi.search(term),
    enabled: digits >= 3 || term.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}
