import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';
import { Court, CourtStatus, Prisma, PrismaClient } from '../../../generated/prisma/client';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { QueryCourtDto } from './dto/query-court.dto';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Court with count metadata
 */
export interface CourtWithCounts extends Court {
  pricingRuleCount: number;
  slotCount: number;
  bookingCount: number;
}

/**
 * Response type for court creation
 */
export interface CreateCourtResponse {
  court: Court;
}

/**
 * Paginated court list response
 */
export interface CourtListResponse {
  data: CourtWithCounts[];
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
export class CourtsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new court for a tenant
   * Courts are tenant-scoped and require tenant context
   *
   * @param createCourtDto - Court creation data
   * @param tenantId - Tenant ID from context
   * @param userId - User ID creating the court
   * @returns Created court
   * @throws ConflictException if court name already exists in tenant
   */
  async create(
    createCourtDto: CreateCourtDto,
    tenantId: string,
    userId: string,
  ): Promise<CreateCourtResponse> {
    const { name, description, status = CourtStatus.Available } =
      createCourtDto;

    // Check if court with same name exists in this tenant
    const existingCourt = await this.prisma.court.findFirst({
      where: {
        tenantId,
        name,
        deletedAt: null,
      },
    });

    if (existingCourt) {
      throw new ConflictException(
        `Court with name '${name}' already exists in this organization`,
      );
    }

    const court = await this.prisma.$transaction(async (tx) => {
      // Create the court
      const newCourt = await tx.court.create({
        data: {
          name,
          description,
          status,
          tenantId,
          createdBy: userId,
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        tenantId,
        userId,
        entityType: 'Court',
        entityId: newCourt.id,
        action: 'Create',
        newValue: {
          courtId: newCourt.id,
          name: newCourt.name,
          status: newCourt.status,
        },
      });

      return newCourt;
    });

    return { court };
  }

  /**
   * Find all courts for a tenant with pagination and filtering
   * Results are scoped to the tenant from context
   *
   * @param tenantId - Tenant ID from context
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated list of courts with counts
   */
  async findAll(
    tenantId: string,
    query: QueryCourtDto,
  ): Promise<CourtListResponse> {
    const { status, search, includeDeleted = false, page = 1, limit = 10 } =
      query;
    const skip = (page - 1) * limit;

    const where: Prisma.CourtWhereInput = this.buildCourtWhereClause(
      tenantId,
      status,
      search,
      includeDeleted,
    );

    const [courts, total] = await Promise.all([
      this.prisma.court.findMany({
        where,
        include: {
          _count: {
            select: {
              pricingRules: true,
              slots: true,
              bookings: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.court.count({ where }),
    ]);

    return {
      data: courts.map((court) => this.transformCourtWithCounts(court)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a single court by ID
   * Tenant-scoped - only returns courts belonging to the tenant
   *
   * @param id - Court ID
   * @param tenantId - Tenant ID from context for authorization
   * @returns Court with count metadata
   * @throws NotFoundException if court not found or not in tenant
   */
  async findOne(
    id: string,
    tenantId: string,
  ): Promise<CourtWithCounts> {
    const court = await this.prisma.court.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        _count: {
          select: {
            pricingRules: true,
            slots: true,
            bookings: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    return this.transformCourtWithCounts(court);
  }

  /**
   * Update a court
   * Tenant-scoped - can only update courts belonging to the tenant
   *
   * @param id - Court ID
   * @param updateCourtDto - Update data
   * @param tenantId - Tenant ID from context for authorization
   * @param userId - User ID making the update
   * @returns Updated court
   * @throws NotFoundException if court not found
   * @throws ConflictException if new name already exists in tenant
   */
  async update(
    id: string,
    updateCourtDto: UpdateCourtDto,
    tenantId: string,
    userId: string,
  ): Promise<Court> {
    // Get existing court
    const existingCourt = await this.prisma.court.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existingCourt) {
      throw new NotFoundException('Court not found');
    }

    // Check if name is being changed and if new name already exists
    if (updateCourtDto.name && updateCourtDto.name !== existingCourt.name) {
      const nameExists = await this.prisma.court.findFirst({
        where: {
          tenantId,
          name: updateCourtDto.name,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (nameExists) {
        throw new ConflictException(
          `Court with name '${updateCourtDto.name}' already exists in this organization`,
        );
      }
    }

    const updatedCourt = await this.prisma.$transaction(async (tx) => {
      const court = await tx.court.update({
        where: { id },
        data: {
          ...updateCourtDto,
          updatedBy: userId,
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        tenantId,
        userId,
        entityType: 'Court',
        entityId: court.id,
        action: 'Update',
        oldValue: {
          name: existingCourt.name,
          status: existingCourt.status,
        },
        newValue: {
          name: court.name,
          status: court.status,
        },
      });

      return court;
    });

    return updatedCourt;
  }

  /**
   * Soft delete a court
   * Tenant-scoped - can only delete courts belonging to the tenant
   * Cannot delete court with existing bookings
   *
   * @param id - Court ID
   * @param tenantId - Tenant ID from context for authorization
   * @param userId - User ID performing the deletion
   * @returns Success message
   * @throws NotFoundException if court not found
   * @throws BadRequestException if court has existing bookings
   */
  async remove(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<{ message: string }> {
    // Check if court exists and get counts
    const court = await this.prisma.court.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    // Check if court has active bookings
    if (court._count.bookings > 0) {
      throw new BadRequestException(
        'Cannot delete court with existing bookings. Please cancel or complete all bookings first.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft delete by setting deletedAt
      await tx.court.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        tenantId,
        userId,
        entityType: 'Court',
        entityId: court.id,
        action: 'Delete',
        oldValue: {
          name: court.name,
          status: court.status,
        },
      });
    });

    return { message: 'Court deleted successfully' };
  }

  /**
   * Restore a soft deleted court
   * Tenant-scoped - can only restore courts belonging to the tenant
   *
   * @param id - Court ID
   * @param tenantId - Tenant ID from context for authorization
   * @param userId - User ID performing the restoration
   * @returns Restored court
   * @throws NotFoundException if court not found
   */
  async restore(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<Court> {
    // Check if deleted court exists
    const deletedCourt = await this.prisma.court.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: { not: null },
      },
    });

    if (!deletedCourt) {
      throw new NotFoundException('Deleted court not found');
    }

    const restoredCourt = await this.prisma.$transaction(async (tx) => {
      const court = await tx.court.update({
        where: { id },
        data: {
          deletedAt: null,
          deletedBy: null,
          updatedBy: userId,
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        tenantId,
        userId,
        entityType: 'Court',
        entityId: court.id,
        action: 'Create', // Using Create for restore as it brings back the record
        newValue: {
          courtId: court.id,
          name: court.name,
          status: court.status,
          restored: true,
        },
      });

      return court;
    });

    return restoredCourt;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Build Prisma where clause for court queries
   * @private
   */
  private buildCourtWhereClause(
    tenantId: string,
    status?: CourtStatus,
    search?: string,
    includeDeleted = false,
  ): Prisma.CourtWhereInput {
    const where: Prisma.CourtWhereInput = {
      tenantId,
    };

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Search by name or description
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter out deleted courts unless explicitly requested
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return where;
  }

  /**
   * Transform court with Prisma counts to response format
   * @private
   */
  private transformCourtWithCounts(
    court: Court & {
      _count: {
        pricingRules: number;
        slots: number;
        bookings: number;
      };
    },
  ): CourtWithCounts {
    const { _count, ...courtData } = court;

    return {
      ...courtData,
      pricingRuleCount: _count.pricingRules,
      slotCount: _count.slots,
      bookingCount: _count.bookings,
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
