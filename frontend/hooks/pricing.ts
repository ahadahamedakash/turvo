/**
 * React Query hooks for Pricing Rules
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pricingApi } from "@/lib/api/pricing";
import type {
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
  QueryPricingRuleParams,
} from "@/lib/types/pricing";

/**
 * Query key factory for pricing rules
 */
export const pricingKeys = {
  all: ["pricing"] as const,
  lists: () => [...pricingKeys.all, "list"] as const,
  list: (params?: QueryPricingRuleParams) =>
    [...pricingKeys.lists(), params] as const,
  detail: (id: string) => [...pricingKeys.all, "detail", id] as const,
};

/**
 * Fetch all pricing rules with optional filtering
 */
export function usePricingRules(params?: QueryPricingRuleParams) {
  return useQuery({
    queryKey: pricingKeys.list(params),
    queryFn: () => pricingApi.list(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch a single pricing rule by ID
 */
export function usePricingRule(id: string) {
  return useQuery({
    queryKey: pricingKeys.detail(id),
    queryFn: () => pricingApi.get(id),
    enabled: !!id,
  });
}

/**
 * Create a new pricing rule
 */
export function useCreatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePricingRuleDto) => pricingApi.create(data),

    onSuccess: () => {
      // Invalidate all pricing rules lists
      queryClient.invalidateQueries({ queryKey: pricingKeys.lists() });
    },
  });
}

/**
 * Update an existing pricing rule
 */
export function useUpdatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePricingRuleDto }) =>
      pricingApi.update(id, data),

    onSuccess: (_, { id }) => {
      // Invalidate the specific rule detail
      queryClient.invalidateQueries({ queryKey: pricingKeys.detail(id) });
      // Invalidate all lists
      queryClient.invalidateQueries({ queryKey: pricingKeys.lists() });
    },
  });
}

/**
 * Delete a pricing rule (soft delete)
 */
export function useDeletePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pricingApi.delete(id),

    onSuccess: () => {
      // Invalidate all pricing rules lists
      queryClient.invalidateQueries({ queryKey: pricingKeys.lists() });
    },
  });
}

/**
 * Bulk create pricing rules
 */
export function useBulkCreatePricingRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePricingRuleDto[]) => pricingApi.bulkCreate(data),

    onSuccess: () => {
      // Invalidate all pricing rules lists
      queryClient.invalidateQueries({ queryKey: pricingKeys.lists() });
    },
  });
}
