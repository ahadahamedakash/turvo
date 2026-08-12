import { z } from 'zod';

/**
 * Schema for creating a new role
 */
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
});

/**
 * Schema for updating an existing role
 * All fields are optional
 */
export const updateRoleSchema = createRoleSchema.partial();

/**
 * Type for create role input
 */
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

/**
 * Type for update role input
 */
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
