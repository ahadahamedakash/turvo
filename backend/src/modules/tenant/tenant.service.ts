import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';
import { Tenant, Prisma, PrismaClient } from '../../../generated/prisma/client';
import { AuditAction, TenantStatus } from '../../../generated/prisma/enums';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { QueryTenantDto } from './dto/query-tenant.dto';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Role with basic information
 */
export interface RoleInfo {
  id: string;
  name: string;
  slug: string;
}

/**
 * User information for tenant member response
 */
export interface TenantMemberUserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  isSuperAdmin: boolean | null;
}

/**
 * Tenant member with roles
 */
export interface TenantMemberWithRoles {
  id: string;
  user: TenantMemberUserInfo;
  roles: RoleInfo[];
  joinedAt: Date;
}

/**
 * Tenant with count metadata
 */
export interface TenantWithCounts extends Tenant {
  memberCount: number;
  courtCount: number;
  bookingCount: number;
  customerCount?: number;
}

/**
 * Response type for tenant creation
 */
export interface CreateTenantResponse {
  tenant: Tenant;
  initialAdmin: {
    tenantMemberId: string;
    userId: string;
    role: RoleInfo;
  };
}

/**
 * Paginated tenant list response
 */
export interface TenantListResponse {
  data: TenantWithCounts[];
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
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tenant
   * Only super admins can create tenants
   * When a tenant is created, the creating super admin becomes a member with admin role
   *
   * @param createTenantDto - Tenant creation data
   * @param superAdminId - ID of the super admin creating the tenant
   * @returns Created tenant with initial admin information
   * @throws ConflictException if slug already exists
   */
  async create(
    createTenantDto: CreateTenantDto,
    superAdminId: string,
  ): Promise<CreateTenantResponse> {
    const {
      name,
      slug,
      description,
      address,
      timezone,
      website,
      openingHour,
      closingHour,
    } = createTenantDto;

    // Check if slug already exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      throw new ConflictException(
        `Tenant with slug '${slug}' already exists. Please choose a different slug.`,
      );
    }

    // Get or create the default Admin role for this tenant
    const adminRole = await this.getOrCreateAdminRole();

    // Create tenant and make super admin a member in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug,
          description,
          address,
          timezone: timezone ?? 'UTC',
          website,
          openingHour: openingHour ? this.parseTimeString(openingHour) : null,
          closingHour: closingHour ? this.parseTimeString(closingHour) : null,
          status: TenantStatus.Active,
        },
      });

      // Create tenant membership for the super admin
      const tenantMember = await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: superAdminId,
        },
      });

      // Assign admin role to the super admin for this tenant
      await tx.userRole.create({
        data: {
          tenantMemberId: tenantMember.id,
          roleId: adminRole.id,
          assignedBy: superAdminId,
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        tenantId: tenant.id,
        userId: superAdminId,
        entityType: 'Tenant',
        entityId: tenant.id,
        action: 'Create',
        newValue: {
          tenantId: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          createdBy: superAdminId,
        },
      });

      return { tenant, tenantMember };
    });

    return {
      tenant: result.tenant,
      initialAdmin: {
        tenantMemberId: result.tenantMember.id,
        userId: superAdminId,
        role: this.toRoleInfo(adminRole),
      },
    };
  }

  /**
   * Find all tenants with pagination and filtering
   *
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated list of tenants with counts
   */
  async findAll(query: QueryTenantDto): Promise<TenantListResponse> {
    const { status, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TenantWhereInput = this.buildTenantWhereClause(
      status,
      search,
    );

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        include: {
          _count: {
            select: {
              tenantMembers: true,
              courts: true,
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
      this.prisma.tenant.count({ where }),
    ]);

    return {
      data: tenants.map(this.transformTenantWithCounts),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a single tenant by ID with detailed counts
   *
   * @param id - Tenant ID
   * @returns Tenant with count metadata
   * @throws NotFoundException if tenant not found
   */
  async findOne(id: string): Promise<TenantWithCounts> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tenantMembers: true,
            courts: true,
            bookings: true,
            customers: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.transformTenantWithCounts(tenant);
  }

  /**
   * Update a tenant
   *
   * @param id - Tenant ID
   * @param updateTenantDto - Update data
   * @param superAdminId - ID of the super admin making the update
   * @returns Updated tenant
   * @throws NotFoundException if tenant not found
   * @throws ConflictException if new slug already exists
   */
  async update(
    id: string,
    updateTenantDto: UpdateTenantDto,
    superAdminId: string,
  ): Promise<Tenant> {
    // Check if tenant exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if slug is being changed and if new slug already exists
    if (updateTenantDto.slug && updateTenantDto.slug !== existingTenant.slug) {
      const slugExists = await this.prisma.tenant.findUnique({
        where: { slug: updateTenantDto.slug },
      });

      if (slugExists) {
        throw new ConflictException(
          `Tenant with slug '${updateTenantDto.slug}' already exists`,
        );
      }
    }

    const data: Prisma.TenantUpdateInput =
      this.buildTenantUpdateData(updateTenantDto);

    const updatedTenant = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id },
        data,
      });

      // Create audit log
      await this.createAuditLog(tx, {
        tenantId: tenant.id,
        userId: superAdminId,
        entityType: 'Tenant',
        entityId: tenant.id,
        action: 'Update',
        oldValue: {
          name: existingTenant.name,
          slug: existingTenant.slug,
          status: existingTenant.status,
        },
        newValue: {
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
        },
      });

      return tenant;
    });

    return updatedTenant;
  }

  /**
   * Soft delete a tenant
   *
   * @param id - Tenant ID
   * @param superAdminId - ID of the super admin performing the deletion
   * @returns Success message
   * @throws NotFoundException if tenant not found
   * @throws BadRequestException if tenant has existing bookings
   */
  async remove(id: string, superAdminId: string): Promise<{ message: string }> {
    // Check if tenant exists and get counts
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookings: true,
            courts: true,
            customers: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if tenant has active bookings
    if (tenant._count.bookings > 0) {
      throw new BadRequestException(
        'Cannot delete tenant with existing bookings. Please cancel or complete all bookings first.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft delete by setting deletedAt
      await tx.tenant.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: TenantStatus.Inactive,
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        tenantId: tenant.id,
        userId: superAdminId,
        entityType: 'Tenant',
        entityId: tenant.id,
        action: 'Delete',
        oldValue: {
          name: tenant.name,
          slug: tenant.slug,
        },
      });
    });

    return { message: 'Tenant deleted successfully' };
  }

  /**
   * Get tenant members with their roles
   *
   * @param tenantId - Tenant ID
   * @returns List of tenant members with roles
   */
  async getMembers(tenantId: string): Promise<TenantMemberWithRoles[]> {
    const members = await this.prisma.tenantMember.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            isSuperAdmin: true,
          },
        },
        userRoles: {
          where: { deletedAt: null },
          include: {
            role: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return members.map((member) => ({
      id: member.id,
      user: member.user,
      roles: member.userRoles.map((ur) => ur.role),
      joinedAt: member.createdAt,
    }));
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get or create the default admin role
   * @private
   */
  private async getOrCreateAdminRole(): Promise<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
  }> {
    let adminRole = await this.prisma.role.findFirst({
      where: { slug: 'admin' },
    });

    if (!adminRole) {
      adminRole = await this.prisma.role.create({
        data: {
          slug: 'admin',
          name: 'Admin',
          description: 'Full access to all tenant resources',
        },
      });
    }

    return adminRole;
  }

  /**
   * Build Prisma where clause for tenant queries
   * @private
   */
  private buildTenantWhereClause(
    status?: TenantStatus,
    search?: string,
  ): Prisma.TenantWhereInput {
    const where: Prisma.TenantWhereInput = {};

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Search by name or slug
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Build Prisma update data from DTO
   * @private
   */
  private buildTenantUpdateData(
    dto: UpdateTenantDto,
  ): Prisma.TenantUpdateInput {
    const data: Prisma.TenantUpdateInput = { ...dto };

    if (dto.openingHour) {
      data.openingHour = this.parseTimeString(dto.openingHour);
    }
    if (dto.closingHour) {
      data.closingHour = this.parseTimeString(dto.closingHour);
    }

    return data;
  }

  /**
   * Parse time string (HH:mm) to Date object
   * @private
   */
  private parseTimeString(time: string): Date {
    return new Date(`1970-01-01T${time}:00`);
  }

  /**
   * Transform tenant with Prisma counts to response format
   * @private
   */
  private transformTenantWithCounts(
    tenant: Tenant & {
      _count: {
        tenantMembers: number;
        courts: number;
        bookings: number;
        customers?: number;
      };
    },
  ): TenantWithCounts {
    const { _count, ...tenantData } = tenant;

    return {
      ...tenantData,
      memberCount: _count.tenantMembers,
      courtCount: _count.courts,
      bookingCount: _count.bookings,
      customerCount: _count.customers,
    };
  }

  /**
   * Convert Role entity to RoleInfo
   * @private
   */
  private toRoleInfo(role: {
    id: string;
    name: string;
    slug: string;
  }): RoleInfo {
    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
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
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action as AuditAction,
        oldValue: data.oldValue as Prisma.InputJsonValue,
        newValue: data.newValue as Prisma.InputJsonValue,
      },
    });
  }
}
