/**
 * Court React Query Hooks
 *
 * Custom hooks for court operations using TanStack Query
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import { toast } from "sonner"
import { courtsApi } from "@/lib/api/courts"
import type {
  CreateCourtDto,
  UpdateCourtDto,
  CourtListResponse,
  CourtListParams,
  Court,
} from "@/lib/types/court"

/**
 * Query key factory for court queries
 */
export const courtKeys = {
  all: ["courts"] as const,
  lists: () => [...courtKeys.all, "list"] as const,
  list: (params: CourtListParams) =>
    [...courtKeys.lists(), params] as const,
  details: () => [...courtKeys.all, "detail"] as const,
  detail: (id: string) => [...courtKeys.details(), id] as const,
}

/**
 * Hook to fetch courts
 */
export function useCourts(
  params: CourtListParams = {},
  options?: Omit<
    UseQueryOptions<CourtListResponse>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: courtKeys.list(params),
    queryFn: () => courtsApi.list(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  })
}

/**
 * Hook to fetch a single court by ID
 */
export function useCourt(
  id: string,
  options?: Omit<UseQueryOptions<Court>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: courtKeys.detail(id),
    queryFn: () => courtsApi.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Hook to create a new court
 */
export function useCreateCourt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCourtDto) => courtsApi.create(data),
    onSuccess: (data) => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: courtKeys.lists() })
      toast.success("Court created successfully", {
        description: `${data.name} has been added to your venues.`,
      })
    },
    onError: (error: Error) => {
      toast.error("Failed to create court", {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to update a court
 */
export function useUpdateCourt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCourtDto }) =>
      courtsApi.update(id, data),
    onSuccess: (data) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: courtKeys.lists() })
      queryClient.invalidateQueries({ queryKey: courtKeys.detail(data.id) })
      toast.success("Court updated successfully", {
        description: `${data.name} has been updated.`,
      })
    },
    onError: (error: Error) => {
      toast.error("Failed to update court", {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to delete a court
 */
export function useDeleteCourt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => courtsApi.delete(id),
    onSuccess: () => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: courtKeys.lists() })
      toast.success("Court deleted successfully")
    },
    onError: (error: Error) => {
      toast.error("Failed to delete court", {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to restore a deleted court
 */
export function useRestoreCourt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => courtsApi.restore(id),
    onSuccess: (data) => {
      // Invalidate the list query
      queryClient.invalidateQueries({ queryKey: courtKeys.lists() })
      toast.success("Court restored successfully", {
        description: `${data.name} has been restored.`,
      })
    },
    onError: (error: Error) => {
      toast.error("Failed to restore court", {
        description: error.message,
      })
    },
  })
}
