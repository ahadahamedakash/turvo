/**
 * Role Types
 *
 * Type definitions for role management
 */

/**
 * Role for invitation assignment
 */
export interface Role {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
}
