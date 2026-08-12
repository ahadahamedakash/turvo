import { z } from "zod";

/**
 * Permission modules enum
 */
export enum PermissionModule {
  Booking = "Booking",
  Customer = "Customer",
  Court = "Court",
  Payment = "Payment",
  Reports = "Reports",
  Users = "Users",
}

/**
 * Schema for creating a new permission
 */
export const createPermissionSchema = z.object({
  module: z.enum(Object.values(PermissionModule) as [string, ...string[]], {
    message: "Module is required",
  }),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(100, "Slug must be at most 100 characters")
    .regex(
      /^[a-z]+\.[a-z]+$/,
      'Slug must be in format: module.action (e.g., "booking.create")',
    ),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional(),
});

/**
 * Schema for updating an existing permission
 * All fields are optional
 */
export const updatePermissionSchema = createPermissionSchema.partial();

/**
 * Type for create permission input
 */
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;

/**
 * Type for update permission input
 */
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
