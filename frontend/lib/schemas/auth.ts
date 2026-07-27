/**
 * Authentication Zod schemas
 * These match the backend DTOs for type-safe validation
 */

import { z } from 'zod';

/**
 * Login form schema
 * Matches backend LoginDto
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Auth response schema
 * Matches backend AuthResponseDto
 */
export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }),
  tenants: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      tenantMemberId: z.string(),
      permissions: z.array(z.string()),
      role: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
      }).nullable(),
    }),
  ).optional(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password schema
 */
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
