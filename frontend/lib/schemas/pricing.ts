import { z } from "zod";

/**
 * Day type enum for pricing rules
 */
export enum DayType {
  Weekday = "Weekday",
  Weekend = "Weekend",
  Holiday = "Holiday",
}

/**
 * Helper function to validate time format (HH:mm)
 */
const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Helper function to parse HH:mm time to minutes
 */
function parseTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Base schema for pricing rule fields (without refinement)
 */
const basePricingRuleSchema = z.object({
  courtId: z.string().uuid("Invalid court ID"),
  dayType: z.enum(Object.values(DayType) as [string, ...string[]], {
    message: "Day type is required",
  }),
  startTime: z
    .string()
    .regex(timeFormatRegex, "Start time must be in HH:mm format (e.g., 09:00)"),
  endTime: z
    .string()
    .regex(timeFormatRegex, "End time must be in HH:mm format (e.g., 18:00)"),
  price: z
    .number()
    .positive("Price must be greater than 0")
    .max(999999.99, "Price must be less than 1,000,000"),
});

/**
 * Schema for creating a new pricing rule (with time validation)
 */
export const createPricingRuleSchema = basePricingRuleSchema.refine(
  (data) => {
    // Validate that startTime < endTime
    // Special case: endTime of "00:00" (midnight) is treated as 24:00
    const start = parseTime(data.startTime);
    let end = parseTime(data.endTime);

    // If endTime is midnight (00:00), treat it as 24:00 (1440 minutes)
    if (data.endTime === "00:00") {
      end = 1440; // 24 hours in minutes
    }

    return start < end;
  },
  {
    message: "Start time must be before end time",
    path: ["endTime"],
  },
);

/**
 * Schema for updating an existing pricing rule
 * All fields are optional
 */
export const updatePricingRuleSchema = basePricingRuleSchema.partial();

/**
 * Schema for query parameters
 */
export const queryPricingRuleSchema = z.object({
  courtId: z.string().uuid().optional(),
  dayType: z.enum(Object.values(DayType) as [string, ...string[]]).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

/**
 * Type for create pricing rule input
 */
export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;

/**
 * Type for update pricing rule input
 */
export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>;

/**
 * Type for query pricing rule input
 */
export type QueryPricingRuleInput = z.infer<typeof queryPricingRuleSchema>;
