/**
 * Roles React Query Hooks
 *
 * Custom hooks for role management using TanStack Query
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { rolesApi } from '@/lib/api/roles';
import type { Role } from '@/lib/types/role';
import type { CreateRoleInput, UpdateRoleInput } from '@/lib/schemas/role';

/**
 * Query key factory for role queries
 */
export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  detail: (id: string) => [...roleKeys.all, 'detail', id] as const,
};

/**
 * Hook to fetch all available roles
 */
export function useRoles(
  options?: Omit<UseQueryOptions<Role[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: () => rolesApi.getAll(),
    staleTime: 10 * 60 * 1000, // 10 minutes - roles rarely change
    ...options,
  });
}

/**
 * Hook to fetch a single role
 */
export function useRole(
  id: string,
  options?: Omit<UseQueryOptions<Role>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => rolesApi.get(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to create a new role
 */
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoleInput) => rolesApi.create(data),
    onSuccess: (data) => {
      // Invalidate roles list query
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      toast.success('Role created', {
        description: `"${data.name}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create role', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to update an existing role
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleInput }) =>
      rolesApi.update(id, data),
    onSuccess: (data) => {
      // Invalidate the specific role query
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(data.id) });
      // Invalidate all roles queries
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      toast.success('Role updated', {
        description: `"${data.name}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update role', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to delete a role
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => {
      // Invalidate all roles queries
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      toast.success('Role deleted', {
        description: 'The role has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      // Handle conflict error (role assigned to users)
      if (error.message.includes('assigned to')) {
        toast.error('Cannot delete role', {
          description: error.message,
        });
      } else {
        toast.error('Failed to delete role', {
          description: error.message,
        });
      }
    },
  });
}
