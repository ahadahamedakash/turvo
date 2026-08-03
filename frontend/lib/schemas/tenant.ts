/**
 * Tenant Validation Schemas
 *
 * Zod schemas for tenant-related form validation
 */

import { z } from "zod";

/**
 * Helper function to generate URL-friendly slug from name
 */
function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_]+/g, "-") // Replace spaces/underscores with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Trim hyphens from ends
}

/**
 * Slug validation regex pattern
 */
const SLUG_REGEX = /^[a-z0-9-]+$/;

/**
 * Time format validation (HH:mm)
 */
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Base tenant fields schema (without refinements)
 * This allows us to use .partial() for the update schema
 */
const tenantBaseSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .transform((val) => val.trim()),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(
      SLUG_REGEX,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .transform((val) => val?.trim())
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500, "Address must be at most 500 characters")
    .transform((val) => val?.trim())
    .optional()
    .or(z.literal("")),
  timezone: z.string().optional().or(z.literal("")),
  website: z.string().url("Invalid URL format").optional().or(z.literal("")),
  openingHour: z
    .string()
    .regex(TIME_REGEX, "Time must be in HH:mm format (e.g., 08:00)")
    .optional()
    .or(z.literal("")),
  closingHour: z
    .string()
    .regex(TIME_REGEX, "Time must be in HH:mm format (e.g., 22:00)")
    .optional()
    .or(z.literal("")),
});

/**
 * Refinement to validate closing time is after opening time
 */
const timeValidationRefinement = {
  message: "Closing time must be after opening time",
  path: ["closingHour"],
  refine: (data: {
    openingHour?: string | null;
    closingHour?: string | null;
  }) => {
    // If both hours are provided, ensure closing is after opening
    if (data.openingHour && data.closingHour) {
      return data.closingHour > data.openingHour;
    }
    return true;
  },
};

/**
 * Create tenant schema with validation
 */
export const createTenantSchema = tenantBaseSchema.refine(
  timeValidationRefinement.refine,
  timeValidationRefinement,
);

export type CreateTenantSchema = z.infer<typeof createTenantSchema>;

/**
 * Update tenant schema (all fields optional)
 * Uses .partial() on the base schema, then applies the same refinement
 */
export const updateTenantSchema = tenantBaseSchema
  .partial()
  .refine(timeValidationRefinement.refine, timeValidationRefinement);

export type UpdateTenantSchema = z.infer<typeof updateTenantSchema>;

/**
 * Invitation schema
 */
export const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .transform((val) => val.toLowerCase().trim()),
  roleId: z.string().min(1, "Role is required").uuid("Invalid role ID"),
  expiresInDays: z
    .number()
    .int("Days must be a whole number")
    .min(1, "Invitation must expire in at least 1 day")
    .max(30, "Invitation cannot expire in more than 30 days"),
});

export type InviteMemberSchema = z.infer<typeof inviteMemberSchema>;

/**
 * Tenant filter schema for list view
 */
export const tenantFilterSchema = z.object({
  status: z.enum(["All", "Active", "Inactive", "Suspended"]).default("All"),
  search: z.string().optional(),
});

export type TenantFilterSchema = z.infer<typeof tenantFilterSchema>;

/**
 * Export helper to auto-generate slug from name
 */
export { slugFromName };
