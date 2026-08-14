import { z } from "zod";

/**
 * YYYY-MM-DD date format (matches the native `<input type="date">` value and
 * the backend's expected format).
 */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whole-day difference (b - a), parsed at UTC midnight to avoid timezone/DST
 * drift. Negative when b is before a.
 */
function dayDiff(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/**
 * Mirror of the backend's MAX_GENERATE_RANGE_DAYS guard.
 */
export const MAX_GENERATE_RANGE_DAYS = 90;

/**
 * Schema for the generate-slots form.
 * `courtId` uses the sentinel "all" for generating every court; it is
 * converted to `undefined` (omitted courtId) on submit.
 */
export const generateSlotsSchema = z
  .object({
    courtId: z.string().min(1),
    startDate: z.string().regex(dateRegex, "Select a start date"),
    endDate: z.string().regex(dateRegex, "Select an end date"),
  })
  .refine((d) => dayDiff(d.startDate, d.endDate) >= 0, {
    message: "Start date must be on or before end date",
    path: ["endDate"],
  })
  .refine((d) => dayDiff(d.startDate, d.endDate) <= MAX_GENERATE_RANGE_DAYS, {
    message: `Date range cannot exceed ${MAX_GENERATE_RANGE_DAYS} days`,
    path: ["endDate"],
  });

/**
 * Schema for the block-slot form
 */
export const blockSlotSchema = z.object({
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(255, "Reason must be at most 255 characters"),
});

/**
 * Schema for the cleanup-slots form
 */
export const cleanupSlotsSchema = z.object({
  beforeDate: z.string().regex(dateRegex, "Select a date"),
});

export type GenerateSlotsForm = z.infer<typeof generateSlotsSchema>;
export type BlockSlotForm = z.infer<typeof blockSlotSchema>;
export type CleanupSlotsForm = z.infer<typeof cleanupSlotsSchema>;
