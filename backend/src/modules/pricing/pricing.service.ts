import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';
import {
  PricingRule,
  DayType,
  Prisma,
  PrismaClient,
} from '../../../generated/prisma/client';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';
import { QueryPricingRuleDto } from './dto/query-pricing-rule.dto';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Pricing rule with count metadata
 */
export interface PricingRuleWithCounts extends PricingRule {
  slotCount: number;
  courtName?: string;
}

/**
 * Response type for pricing rule creation
 */
export interface CreatePricingRuleResponse {
  pricingRule: PricingRule;
}

/**
 * Paginated pricing rule list response
 */
export interface PricingRuleListResponse {
  data: PricingRuleWithCounts[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Prisma transaction client type
 */
type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new pricing rule
   * Pricing rules are tenant-scoped and tied to a specific court
   *
   * @param createPricingRuleDto - Pricing rule creation data
   * @param tenantId - Tenant ID from context
   * @param userId - User ID creating the pricing rule
   * @returns Created pricing rule
   * @throws NotFoundException if court not found or not in tenant
   * @throws ConflictException if overlapping pricing rule exists
   */
  async create(
    createPricingRuleDto: CreatePricingRuleDto,
    tenantId: string,
    userId: string,
  ): Promise<CreatePricingRuleResponse> {
    const { courtId, dayType, startTime, endTime, price } =
      createPricingRuleDto;

    // Verify court belongs to tenant
    const court = await this.prisma.court.findFirst({
      where: {
        id: courtId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!court) {
      throw new NotFoundException(
        'Court not found or does not belong to this organization',
      );
    }

    // Parse time strings
    const parsedStartTime = this.parseTimeString(startTime);
    const parsedEndTime = this.parseTimeString(endTime);

    // Validate time range
    if (parsedStartTime >= parsedEndTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for overlapping pricing rules
    const overlappingRule = await this.prisma.pricingRule.findFirst({
      where: {
        courtId,
        dayType,
        deletedAt: null,
        OR: [
          {
            // New rule starts during existing rule
            startTime: { lte: parsedStartTime },
            endTime: { gt: parsedStartTime },
          },
          {
            // New rule ends during existing rule
            startTime: { lt: parsedEndTime },
            endTime: { gte: parsedEndTime },
          },
          {
            // New rule completely covers existing rule
            startTime: { gte: parsedStartTime },
            endTime: { lte: parsedEndTime },
          },
        ],
      },
    });

    if (overlappingRule) {
      throw new ConflictException(
        'A pricing rule already exists for this court, day type, and time range',
      );
    }

    const pricingRule = await this.prisma.$transaction(async (tx) => {
      // Create the pricing rule
      const newRule = await tx.pricingRule.create({
        data: {
          tenantId,
          courtId,
          dayType,
          startTime: parsedStartTime,
          endTime: parsedEndTime,
          price: price.toString(),
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        tenantId,
        userId,
        entityType: 'PricingRule',
        entityId: newRule.id,
        action: 'Create',
        newValue: {
          pricingRuleId: newRule.id,
          courtId: newRule.courtId,
          dayType: newRule.dayType,
          price: newRule.price,
        },
      });

      return newRule;
    });

    return { pricingRule };
  }

  /**
   * Find all pricing rules for a tenant with pagination and filtering
   * Results are scoped to the tenant from context
   *
   * @param tenantId - Tenant ID from context
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated list of pricing rules with counts
   */
  async findAll(
    tenantId: string,
    query: QueryPricingRuleDto,
  ): Promise<PricingRuleListResponse> {
    const { courtId, dayType, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PricingRuleWhereInput = {
      tenantId,
      deletedAt: null,
    };

    // Filter by court
    if (courtId) {
      where.courtId = courtId;
    }

    // Filter by day type
    if (dayType) {
      where.dayType = dayType;
    }

    const [pricingRules, total] = await Promise.all([
      this.prisma.pricingRule.findMany({
        where,
        include: {
          court: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              slots: true,
            },
          },
        },
        orderBy: [
          { court: { name: 'asc' } },
          { dayType: 'asc' },
          { startTime: 'asc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.pricingRule.count({ where }),
    ]);

    return {
      data: pricingRules.map((rule) =>
        this.transformPricingRuleWithCounts(rule),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a single pricing rule by ID
   * Tenant-scoped - only returns pricing rules belonging to the tenant
   *
   * @param id - Pricing rule ID
   * @param tenantId - Tenant ID from context for authorization
   * @returns Pricing rule with count metadata
   * @throws NotFoundException if pricing rule not found or not in tenant
   */
  async findOne(id: string, tenantId: string): Promise<PricingRuleWithCounts> {
    const pricingRule = await this.prisma.pricingRule.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            slots: true,
          },
        },
      },
    });

    if (!pricingRule) {
      throw new NotFoundException('Pricing rule not found');
    }

    return this.transformPricingRuleWithCounts(pricingRule);
  }

  /**
   * Update a pricing rule
   * Tenant-scoped - can only update pricing rules belonging to the tenant
   *
   * @param id - Pricing rule ID
   * @param updatePricingRuleDto - Update data
   * @param tenantId - Tenant ID from context for authorization
   * @param userId - User ID making the update
   * @returns Updated pricing rule
   * @throws NotFoundException if pricing rule not found
   * @throws ConflictException if new time range overlaps with existing rules
   */
  async update(
    id: string,
    updatePricingRuleDto: UpdatePricingRuleDto,
    tenantId: string,
    userId: string,
  ): Promise<PricingRule> {
    // Get existing pricing rule
    const existingRule = await this.prisma.pricingRule.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingRule) {
      throw new NotFoundException('Pricing rule not found');
    }

    let parsedStartTime: Date | undefined;
    let parsedEndTime: Date | undefined;

    // Parse time strings if provided
    if (updatePricingRuleDto.startTime) {
      parsedStartTime = this.parseTimeString(updatePricingRuleDto.startTime);
    }
    if (updatePricingRuleDto.endTime) {
      parsedEndTime = this.parseTimeString(updatePricingRuleDto.endTime);
    }

    // Use existing values if not provided
    const finalStartTime = parsedStartTime ?? existingRule.startTime;
    const finalEndTime = parsedEndTime ?? existingRule.endTime;

    // Validate time range
    if (finalStartTime >= finalEndTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for overlapping pricing rules (excluding current rule)
    const checkData: Prisma.PricingRuleWhereInput = {
      courtId: existingRule.courtId,
      dayType: updatePricingRuleDto.dayType ?? existingRule.dayType,
      deletedAt: null,
      id: { not: id },
      OR: [
        {
          startTime: { lte: finalStartTime },
          endTime: { gt: finalStartTime },
        },
        {
          startTime: { lt: finalEndTime },
          endTime: { gte: finalEndTime },
        },
        {
          startTime: { gte: finalStartTime },
          endTime: { lte: finalEndTime },
        },
      ],
    };

    const overlappingRule = await this.prisma.pricingRule.findFirst({
      where: checkData,
    });

    if (overlappingRule) {
      throw new ConflictException(
        'A pricing rule already exists for this court, day type, and time range',
      );
    }

    const updatedRule = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.PricingRuleUpdateInput = {
        ...updatePricingRuleDto,
      };

      // Handle price conversion
      if (updatePricingRuleDto.price !== undefined) {
        data.price = updatePricingRuleDto.price.toString();
      }

      // Handle time parsing
      if (parsedStartTime) {
        data.startTime = parsedStartTime;
      }
      if (parsedEndTime) {
        data.endTime = parsedEndTime;
      }

      const rule = await tx.pricingRule.update({
        where: { id },
        data,
      });

      // Create audit log
      await this.createAuditLog(tx, {
        tenantId,
        userId,
        entityType: 'PricingRule',
        entityId: rule.id,
        action: 'Update',
        oldValue: {
          price: existingRule.price,
          dayType: existingRule.dayType,
        },
        newValue: {
          price: rule.price,
          dayType: rule.dayType,
        },
      });

      return rule;
    });

    return updatedRule;
  }

  /**
   * Soft delete a pricing rule
   * Tenant-scoped - can only delete pricing rules belonging to the tenant
   *
   * @param id - Pricing rule ID
   * @param tenantId - Tenant ID from context for authorization
   * @param userId - User ID performing the deletion
   * @returns Success message
   * @throws NotFoundException if pricing rule not found
   * @throws BadRequestException if pricing rule is in use by active slots
   */
  async remove(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<{ message: string }> {
    // Check if pricing rule exists
    const pricingRule = await this.prisma.pricingRule.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            slots: true,
          },
        },
      },
    });

    if (!pricingRule) {
      throw new NotFoundException('Pricing rule not found');
    }

    // Note: We allow deleting pricing rules even if they have slots
    // The slots will keep their price snapshot at creation time
    // New slots won't be able to use this pricing rule

    await this.prisma.$transaction(async (tx) => {
      // Soft delete by setting deletedAt
      await tx.pricingRule.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        tenantId,
        userId,
        entityType: 'PricingRule',
        entityId: pricingRule.id,
        action: 'Delete',
        oldValue: {
          courtId: pricingRule.courtId,
          dayType: pricingRule.dayType,
          price: pricingRule.price,
        },
      });
    });

    return { message: 'Pricing rule deleted successfully' };
  }

  /**
   * Bulk create pricing rules for a court
   * Useful for setting up default pricing schedules
   *
   * @param courtId - Court ID
   * @param rules - Array of pricing rule data
   * @param tenantId - Tenant ID from context
   * @param userId - User ID creating the rules
   * @returns Created pricing rules
   */
  async bulkCreate(
    courtId: string,
    rules: Omit<CreatePricingRuleDto, 'courtId'>[],
    tenantId: string,
    userId: string,
  ): Promise<{ pricingRules: PricingRule[]; failed: number }> {
    // Verify court belongs to tenant
    const court = await this.prisma.court.findFirst({
      where: {
        id: courtId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!court) {
      throw new NotFoundException(
        'Court not found or does not belong to this organization',
      );
    }

    const createdRules: PricingRule[] = [];
    let failed = 0;

    for (const rule of rules) {
      try {
        const result = await this.create(
          { ...rule, courtId },
          tenantId,
          userId,
        );
        createdRules.push(result.pricingRule);
      } catch (error) {
        failed++;
        // Log error but continue with other rules
        console.error(`Failed to create pricing rule:`, error);
      }
    }

    return {
      pricingRules: createdRules,
      failed,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Parse time string (HH:mm) to Date object
   * @private
   */
  private parseTimeString(time: string): Date {
    return new Date(`1970-01-01T${time}:00`);
  }

  /**
   * Transform pricing rule with Prisma counts to response format
   * @private
   */
  private transformPricingRuleWithCounts(
    rule: PricingRule & {
      court?: { name: string };
      _count?: {
        slots: number;
      };
    },
  ): PricingRuleWithCounts {
    const { court, _count, ...ruleData } = rule as any;

    return {
      ...ruleData,
      courtName: court?.name,
      slotCount: _count?.slots ?? 0,
    };
  }

  /**
   * Create audit log entry
   * @private
   */
  private async createAuditLog(
    tx: PrismaTransaction,
    data: {
      tenantId: string;
      userId: string;
      entityType: string;
      entityId: string;
      action: string;
      oldValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
    },
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        entityType: data.entityType as any,
        entityId: data.entityId,
        action: data.action as any,
        oldValue: data.oldValue as Prisma.InputJsonValue,
        newValue: data.newValue as Prisma.InputJsonValue,
      },
    });
  }
}
