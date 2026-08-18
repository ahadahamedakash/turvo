/**
 * Pricing Rules type definitions
 */

import type { DayType } from "./enums";

/**
 * Pricing Rule entity
 * Represents a price template for a court + day type + time range
 */
export interface PricingRule {
  id: string;
  tenantId: string;
  courtId: string;
  courtName?: string; // Included in API response
  dayType: DayType;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  price: number; // Decimal, stored as number in JSON
  slotCount: number; // Number of slots generated from this rule
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Create pricing rule DTO
 */
export interface CreatePricingRuleDto {
  courtId: string;
  dayType: DayType;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  price: number;
}

/**
 * Update pricing rule DTO (all fields optional)
 */
export type UpdatePricingRuleDto = Partial<CreatePricingRuleDto>;

/**
 * Paginated pricing rules list response
 */
export interface PricingRuleListResponse {
  data: PricingRule[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query parameters for filtering pricing rules
 */
export interface QueryPricingRuleParams {
  courtId?: string;
  dayType?: DayType;
  page?: number;
  limit?: number;
}

/**
 * Bulk create response
 */
export interface BulkCreatePricingRulesResponse {
  created: PricingRule[];
  failed: Array<{
    rule: CreatePricingRuleDto;
    error: string;
  }>;
}
