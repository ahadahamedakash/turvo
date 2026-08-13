/**
 * Pricing Rules API client
 */

import { apiClient } from "./api-client";
import type {
  PricingRule,
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
  PricingRuleListResponse,
  QueryPricingRuleParams,
  BulkCreatePricingRulesResponse,
} from "@/lib/types/pricing";

/**
 * Pricing rules API endpoints
 */
export const pricingApi = {
  /**
   * List all pricing rules with optional filtering
   */
  list: (params?: QueryPricingRuleParams) =>
    apiClient.get<PricingRuleListResponse>("/pricing", { params }),

  /**
   * Get a single pricing rule by ID
   */
  get: (id: string) => apiClient.get<PricingRule>(`/pricing/${id}`),

  /**
   * Create a new pricing rule
   */
  create: (data: CreatePricingRuleDto) =>
    apiClient.post<PricingRule>("/pricing", data),

  /**
   * Update an existing pricing rule
   */
  update: (id: string, data: UpdatePricingRuleDto) =>
    apiClient.put<PricingRule>(`/pricing/${id}`, data),

  /**
   * Soft delete a pricing rule
   */
  delete: (id: string) => apiClient.delete<{ message: string }>(`/pricing/${id}`),

  /**
   * Bulk create pricing rules
   */
  bulkCreate: (data: CreatePricingRuleDto[]) =>
    apiClient.post<BulkCreatePricingRulesResponse>("/pricing/bulk", { rules: data }),
};
