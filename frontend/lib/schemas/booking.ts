/**
 * Booking Zod schemas — mirror the backend DTOs
 * (`modules/bookings/dto/create-booking.dto.ts`, `record-payment.dto.ts`,
 * `cancel-booking.dto.ts`).
 *
 * NOTE (Task 6): amount-vs-total and amount-vs-due checks need the live slot
 * prices, which the schema doesn't see — run them in the dialog's submit
 * handler via `form.setError(...)`, NOT here.
 */

import { z } from "zod";

/**
 * Same character class as the backend `CustomerInfoDto.phone`
 * (digits, spaces, + and -).
 */
const phoneRegex = /^[0-9+\-\s]{6,20}$/;

/**
 * Create-booking form. `discount` and payment `amount` use `z.coerce` so
 * number inputs can be plain text fields.
 */
export const createBookingSchema = z
  .object({
    slotIds: z
      .array(z.string().uuid("Invalid slot ID"))
      .min(1, "Select at least one slot")
      .max(8, "At most 8 slots per booking"),
    customer: z
      .object({
        customerId: z.string().uuid("Invalid customer ID").optional(),
        firstName: z.string().min(1, "First name is required").max(50),
        lastName: z.string().min(1, "Last name is required").max(50),
        phone: z.string().regex(phoneRegex, "Enter a valid phone").optional().or(z.literal("")),
        email: z.string().email("Enter a valid email").optional().or(z.literal("")),
      })
      .refine((c) => c.customerId || c.phone || c.email, {
        message: "Phone is required for new customers",
        path: ["phone"],
      }),
    status: z.enum(["Pending", "Confirmed"]).default("Confirmed"),
    discount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
    notes: z.string().max(1000, "Notes must be at most 1000 characters").optional(),
    paymentMode: z.enum(["none", "booking", "full", "custom"]).optional(),
    payment: z
      .object({
        amount: z.coerce.number().min(1, "Amount must be positive"),
        method: z.enum(["Cash", "Card", "MobileBanking"]).default("Cash"),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // If paymentMode is 'custom', payment.amount is required
      if (data.paymentMode === "custom") {
        return data.payment?.amount !== undefined && data.payment.amount > 0;
      }
      return true;
    },
    {
      message: "Custom payment amount is required",
      path: ["payment", "amount"],
    }
  )
  .refine(
    (data) => {
      // If paymentMode is 'none', payment should not be provided
      if (data.paymentMode === "none" && data.payment) {
        return false;
      }
      return true;
    },
    {
      message: 'Payment should not be provided when mode is "none"',
      path: ["payment"],
    }
  );

/** Record-payment form (POST /bookings/:id/payments) */
export const recordPaymentSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be positive"),
  method: z.enum(["Cash", "Card", "MobileBanking"]).default("Cash"),
  referenceNumber: z.string().max(100, "Reference must be at most 100 characters").optional(),
});

/** Cancel-booking form (POST /bookings/:id/cancel) */
export const cancelBookingSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(255, "Reason must be at most 255 characters"),
  refund: z
    .object({
      amount: z.coerce.number().min(1, "Refund amount must be positive"),
      method: z.enum(["Cash", "Card", "MobileBanking"]).default("Cash"),
    })
    .optional(),
});

export type CreateBookingForm = z.infer<typeof createBookingSchema>;
export type RecordPaymentForm = z.infer<typeof recordPaymentSchema>;
export type CancelBookingForm = z.infer<typeof cancelBookingSchema>;
