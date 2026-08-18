/**
 * Customer type definitions
 *
 * Mirrors `modules/customers/dto/customer-response.dto.ts`. Deliberately
 * minimal — this module exists to serve the booking-dialog typeahead, not
 * full customer management.
 */

/**
 * Customer shaped for the booking-dialog typeahead.
 */
export interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
}

/**
 * Response of GET /customers — most recently created matches first.
 */
export interface CustomerSearchResponse {
  data: CustomerOption[];
}
