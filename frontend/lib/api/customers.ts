/**
 * Customers API client
 */

import { apiClient } from "./api-client";
import type { CustomerSearchResponse } from "@/lib/types/customer";

/**
 * Customers API endpoints
 */
export const customersApi = {
  /**
   * Typeahead search for the booking dialog.
   *
   * Numeric input is stripped to digits before sending so "01711" matches
   * stored phones like "+880 1711-234567" (backend matches phone on a plain
   * contains). Text input is sent raw for name matching.
   */
  search: (term: string) => {
    const digits = term.replace(/\D/g, "");
    const search = digits.length > 0 ? digits : term;

    return apiClient.get<CustomerSearchResponse>("/customers", {
      params: { search, limit: 10 },
    });
  },
};
