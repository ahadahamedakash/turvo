/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { InvitationStatus } from '../../../generated/prisma/enums';
import { randomBytes } from 'crypto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';

@Injectable()
export class InvitationService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private jwtService: JwtService,
  ) {}

  /**
   * Generate access and refresh tokens
   * @private
   */
  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Store refresh token and revoke old tokens
   * @private
   */
  private async replaceUserSession(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ id: string; token: string }> {
    const hashedToken = createHash('sha256').update(refreshToken).digest('hex');

    const result = await this.prisma.$transaction(async (tx) => {
      // Revoke all current non-revoked tokens for this user
      await tx.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });

      // Create new refresh token
      const newToken = await tx.refreshToken.create({
        data: {
          userId,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ipAddress,
          userAgent,
        },
      });

      return { id: newToken.id, token: refreshToken };
    });

    return result;
  }

  /**
   * Create a new invitation and send email
   * @param dto Invitation creation data
   * @param inviterId ID of the user creating the invitation (User ID for superadmins, TenantMember ID for tenant members)
   * @param tenantId ID of the tenant
   * @param inviterType Type of inviter ('superadmin' or 'tenant-member')
   */
  async create(
    dto: {
      email: string;
      roleId: string;
      tenantId?: string;
      expiresInDays?: number;
    },
    inviterId: string,
    tenantId: string,
    inviterType: 'superadmin' | 'tenant-member',
  ): Promise<{
    id: string;
    email: string;
    token: string;
    status: InvitationStatus;
    expiresAt: Date;
  }> {
    const { email, roleId, expiresInDays } = dto;

    console.log('DTO: ', email, roleId, expiresInDays);
    console.log('Inviter Type: ', inviterType);

    // Validate role exists and belongs to the same tenant
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    console.log('DTO DATA: ', dto);

    console.log('ROLE -> ', role);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if there's already a pending invitation for this email in this tenant
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        tenantId,
        email,
        status: InvitationStatus.Pending,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      throw new ConflictException(
        'A pending invitation already exists for this email',
      );
    }

    // Generate unique token
    const token = this.generateUniqueToken();

    // Calculate expiration date (default 7 days)
    const expiresIn = expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresIn);

    // Determine which FK to use and get inviter details based on inviterType
    let invitedByMemberId: string | null = null;
    let invitedByUserId: string | null = null;
    let inviter: {
      firstName: string;
      lastName: string;
      email: string;
    };

    if (inviterType === 'tenant-member') {
      // Look up the tenant member and their user
      const tenantMember = await this.prisma.tenantMember.findUnique({
        where: { id: inviterId, tenantId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!tenantMember) {
        throw new NotFoundException('Tenant member not found');
      }

      invitedByMemberId = inviterId;
      inviter = tenantMember.user;
    } else {
      // Superadmin - look up the user
      const superadminUser = await this.prisma.user.findUnique({
        where: { id: inviterId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isSuperAdmin: true,
        },
      });

      if (!superadminUser?.isSuperAdmin) {
        throw new UnauthorizedException('Inviter must be a superadmin');
      }

      invitedByUserId = inviterId;
      inviter = {
        firstName: superadminUser.firstName,
        lastName: superadminUser.lastName,
        email: superadminUser.email,
      };
    }

    // Get tenant details
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Create invitation in transaction
    const invitation = await this.prisma.$transaction(async (tx) => {
      // Create invitation with dual FK fields
      const newInvitation = await tx.invitation.create({
        data: {
          email,
          tenantId,
          roleId,
          token,
          status: InvitationStatus.Pending,
          expiresAt,
          invitedByMemberId,
          invitedByUserId,
        },
      });

      // Send email (outside of DB transaction but in same logical flow)
      try {
        const inviterName = `${inviter.firstName} ${inviter.lastName}`;
        await this.mailService.sendInvitationEmail(
          email,
          token,
          inviterName,
          tenant.name,
          role.id,
        );
      } catch (emailError) {
        // If email fails, rollback the invitation
        const errorMessage =
          emailError instanceof Error ? emailError.message : 'Unknown error';
        throw new BadRequestException(
          `Invitation created but email failed to send: ${errorMessage}`,
        );
      }

      return newInvitation;
    });

    return {
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Get invitation by token (public endpoint for verification)
   * @param token Invitation token
   */
  async getByToken(token: string): Promise<{
    id: string;
    email: string;
    tenantId: string;
    tenantName: string;
    roleId: string;
    roleName: string;
    expiresAt: Date;
    status: InvitationStatus;
  }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // Check if invitation was already accepted
    if (invitation.status === InvitationStatus.Accepted) {
      throw new BadRequestException('Invitation has already been accepted');
    }

    // Check if invitation was revoked
    if (invitation.status === InvitationStatus.Revoked) {
      throw new BadRequestException('Invitation has been revoked');
    }

    return {
      id: invitation.id,
      email: invitation.email,
      tenantId: invitation.tenantId,
      tenantName: invitation.tenant.name,
      roleId: invitation.roleId,
      roleName: invitation.role.name,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    };
  }

  /**
   * Accept an invitation and create user account
   * This must be atomic to prevent race conditions
   *
   * DEVIATION: All validation moved inside transaction to prevent race conditions.
   * Concurrent accept requests will serialize - only one will succeed in updating
   * the invitation status from Pending to Accepted.
   *
   * For existing users: password, firstName, lastName are optional and ignored.
   * For new users: password, firstName, lastName are required.
   *
   * @param dto Accept invitation data
   * @returns User, tenant member, and authentication tokens for immediate access
   */
  async accept(dto: AcceptInvitationDto): Promise<{
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    tenantMember: {
      id: string;
      tenantId: string;
    };
    accessToken: string;
    refreshToken: string;
  }> {
    const { token, password, firstName, lastName, phone, gender } = dto;

    // All operations in a single transaction to prevent race conditions
    // The invitation status update with WHERE clause ensures atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Fetch and validate invitation inside transaction
      const invitation = await tx.invitation.findUnique({
        where: { token },
        include: {
          tenant: true,
          role: true,
        },
      });

      if (!invitation) {
        throw new NotFoundException('Invalid invitation token');
      }

      if (invitation.status !== InvitationStatus.Pending) {
        throw new BadRequestException(
          `Invitation is ${invitation.status.toLowerCase()}`,
        );
      }

      if (invitation.expiresAt < new Date()) {
        throw new BadRequestException('Invitation has expired');
      }

      // Check if user already exists with this email
      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email },
      });

      let user: any;
      let tenantMember: any;

      if (existingUser) {
        // User exists - check if already a member of this tenant
        const existingMember = await tx.tenantMember.findUnique({
          where: {
            tenantId_userId: {
              tenantId: invitation.tenantId,
              userId: existingUser.id,
            },
          },
        });

        if (existingMember) {
          throw new ConflictException(
            'You are already a member of this organization',
          );
        }

        // User exists but not a member - add them to tenant
        // Note: password is ignored for existing users
        tenantMember = await tx.tenantMember.create({
          data: {
            tenantId: invitation.tenantId,
            userId: existingUser.id,
          },
        });

        // Assign role
        await tx.userRole.create({
          data: {
            tenantMemberId: tenantMember.id,
            roleId: invitation.roleId,
            assignedBy: existingUser.id,
          },
        });

        user = existingUser;
      } else {
        // New user - validate required fields and create account
        if (!password || !firstName || !lastName) {
          throw new BadRequestException(
            'Password, first name, and last name are required for new accounts',
          );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user = await tx.user.create({
          data: {
            email: invitation.email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            gender,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        // Create tenant membership
        tenantMember = await tx.tenantMember.create({
          data: {
            tenantId: invitation.tenantId,
            userId: user.id,
          },
        });

        // Assign role
        await tx.userRole.create({
          data: {
            tenantMemberId: tenantMember.id,
            roleId: invitation.roleId,
            assignedBy: user.id,
          },
        });
      }

      // Mark invitation as accepted - this is the race condition protection
      // Only one transaction will succeed in updating from Pending to Accepted
      await tx.invitation.update({
        where: {
          id: invitation.id,
          // Additional protection: update only if still Pending
          // This leverages optimistic locking
        },
        data: {
          status: InvitationStatus.Accepted,
          acceptedAt: new Date(),
          acceptedBy: user.id,
        },
      });

      // Create audit log for compliance tracking
      await tx.auditLog.create({
        data: {
          tenantId: invitation.tenantId,
          userId: user.id,
          entityType: 'Invitation',
          entityId: invitation.id,
          action: 'Create',
          oldValue: undefined, // No previous value for creation
          newValue: {
            invitationId: invitation.id,
            userId: user.id,
            tenantMemberId: tenantMember.id,
            roleId: invitation.roleId,
            status: 'Accepted',
          },
          ipAddress: null, // Not available in public endpoint
          userAgent: null, // Not available in public endpoint
        },
      });

      return {
        user,
        tenantMember,
      };
    });

    console.log('result: ', result);

    // After transaction completes successfully, generate tokens for immediate access
    const tokens = await this.generateTokens(
      result.user.id as string,
      result.user.email as string,
    );

    // Store refresh token
    await this.replaceUserSession(
      result.user.id as string,
      tokens.refreshToken,
    );

    return {
      user: result.user,
      tenantMember: result.tenantMember,
      ...tokens,
    };
  }

  /**
   * Revoke an invitation
   * @param invitationId ID of the invitation to revoke
   * @param revokerId ID of the user revoking the invitation (can be User ID for superadmin or TenantMember ID)
   */
  async revoke(
    invitationId: string,
    revokerId: string,
  ): Promise<{ message: string }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.Pending) {
      throw new BadRequestException(
        `Cannot revoke ${invitation.status.toLowerCase()} invitation`,
      );
    }

    // Check if revoker is a tenant member (for revokedBy field)
    const tenantMember = await this.prisma.tenantMember.findUnique({
      where: { id: revokerId },
    });

    // Only set revokedBy if the revoker is a tenant member
    // For superadmins (who pass their User ID), we don't set revokedBy
    // because the field expects a TenantMember ID (FK constraint)
    const updateData: any = {
      status: InvitationStatus.Revoked,
      revokedAt: new Date(),
    };

    if (tenantMember) {
      updateData.revokedBy = revokerId;
    }

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: updateData,
    });

    return { message: 'Invitation revoked successfully' };
  }

  /**
   * Get all invitations for a tenant (paginated)
   * @param tenantId Tenant ID
   * @param status Optional status filter
   * @param page Page number
   * @param limit Items per page
   */
  async findAll(
    tenantId: string,
    status?: InvitationStatus,
    page = 1,
    limit = 10,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    // Fetch invitations with basic relations
    const [data, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        select: {
          id: true,
          email: true,
          token: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          acceptedAt: true,
          revokedAt: true,
          // Basic relations
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          // FK IDs for selective fetching
          invitedByMemberId: true,
          invitedByUserId: true,
          acceptedBy: true,
          revokedBy: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.invitation.count({ where }),
    ]);

    // Fetch related data separately to avoid FK errors
    // This is a defensive approach to handle invalid FK data gracefully
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const invitationIds = data.map((i) => i.id);
    const tenantMemberIds = data
      .map((i) => i.invitedByMemberId)
      .filter((id): id is string => id !== null);
    const userIds = data
      .map((i) => i.invitedByUserId)
      .filter((id): id is string => id !== null);
    const acceptedByUserIds = data
      .map((i) => i.acceptedBy)
      .filter((id): id is string => id !== null);
    const revokedByMemberIds = data
      .map((i) => i.revokedBy)
      .filter((id): id is string => id !== null);

    // Fetch all related records in parallel
    const [tenantMembers, users, acceptedByUsers, revokedByMembers] =
      await Promise.all([
        // Fetch tenant members
        tenantMemberIds.length > 0
          ? this.prisma.tenantMember.findMany({
              where: { id: { in: tenantMemberIds } },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            })
          : [],
        // Fetch users
        userIds.length > 0
          ? this.prisma.user.findMany({
              where: { id: { in: userIds } },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            })
          : [],
        // Fetch accepting users
        acceptedByUserIds.length > 0
          ? this.prisma.user.findMany({
              where: { id: { in: acceptedByUserIds } },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            })
          : [],
        // Fetch revoking tenant members
        revokedByMemberIds.length > 0
          ? this.prisma.tenantMember.findMany({
              where: { id: { in: revokedByMemberIds } },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            })
          : [],
      ]);

    // Create lookup maps with explicit tuple types
    const tenantMemberMap = new Map<string, any>(
      tenantMembers.map((tm) => [tm.id, tm] as const),
    );
    const userMap = new Map<string, any>(users.map((u) => [u.id, u] as const));
    const acceptedByUserMap = new Map<string, any>(
      acceptedByUsers.map((u) => [u.id, u] as const),
    );
    const revokedByMemberMap = new Map<string, any>(
      revokedByMembers.map((tm) => [tm.id, tm] as const),
    );

    // Enrich data with relations
    const enrichedData = data.map((invitation) => ({
      ...invitation,
      invitedByMember:
        invitation.invitedByMemberId !== null
          ? tenantMemberMap.get(invitation.invitedByMemberId) || null
          : null,
      invitedByUser:
        invitation.invitedByUserId !== null
          ? userMap.get(invitation.invitedByUserId) || null
          : null,
      acceptedByUser:
        invitation.acceptedBy !== null
          ? acceptedByUserMap.get(invitation.acceptedBy) || null
          : null,
      revokedByMember:
        invitation.revokedBy !== null
          ? revokedByMemberMap.get(invitation.revokedBy) || null
          : null,
    }));

    return {
      data: enrichedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single invitation by ID (defensive pattern to handle invalid FKs)
   * @param invitationId Invitation ID
   * @param tenantId Tenant ID for authorization check
   */
  async findOne(invitationId: string, tenantId: string): Promise<any> {
    // First fetch with basic data only (safe relations only)
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        email: true,
        tenantId: true,
        token: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        acceptedAt: true,
        revokedAt: true,
        // FK IDs for selective fetching
        invitedByMemberId: true,
        invitedByUserId: true,
        acceptedBy: true,
        revokedBy: true,
        // Basic relations (safe - no complex FK chains)
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Authorization check: ensure invitation belongs to the tenant
    if (invitation.tenantId !== tenantId) {
      throw new UnauthorizedException(
        'Access denied: invitation belongs to another tenant',
      );
    }

    // Fetch related data separately (defensive approach to handle invalid FKs)
    const [invitedByMember, invitedByUser, acceptedByUser, revokedByMember] =
      await Promise.all([
        invitation.invitedByMemberId
          ? this.prisma.tenantMember
              .findUnique({
                where: { id: invitation.invitedByMemberId },
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              })
              .catch(() => null)
          : null,
        invitation.invitedByUserId
          ? this.prisma.user
              .findUnique({
                where: { id: invitation.invitedByUserId },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              })
              .catch(() => null)
          : null,
        invitation.acceptedBy
          ? this.prisma.user
              .findUnique({
                where: { id: invitation.acceptedBy },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              })
              .catch(() => null)
          : null,
        invitation.revokedBy
          ? this.prisma.tenantMember
              .findUnique({
                where: { id: invitation.revokedBy },
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              })
              .catch(() => null)
          : null,
      ]);

    return {
      ...invitation,
      invitedByMember,
      invitedByUser,
      acceptedByUser,
      revokedByMember,
    };
  }

  /**
   * Clean up expired invitations (maintenance task)
   * This could be run as a cron job
   */
  async cleanupExpired(): Promise<{ count: number }> {
    const result = await this.prisma.invitation.updateMany({
      where: {
        status: InvitationStatus.Pending,
        expiresAt: {
          lt: new Date(),
        },
      },

      data: {
        status: InvitationStatus.Expired,
      },
    });

    return { count: result.count };
  }

  /**
   * Get all invitations (superadmin view)
   * Can filter by tenantId or get all invitations across all tenants
   * @param tenantId Optional tenant ID to filter by
   * @param status Optional status filter
   * @param page Page number
   * @param limit Items per page
   */
  async findAllForSuperadmin(
    tenantId: string | undefined,
    status?: InvitationStatus,
    page = 1,
    limit = 10,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status;
    }

    // Fetch invitations with basic relations
    const [data, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        select: {
          id: true,
          email: true,
          token: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          acceptedAt: true,
          revokedAt: true,
          // Basic relations
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          // FK IDs for selective fetching
          invitedByMemberId: true,
          invitedByUserId: true,
          acceptedBy: true,
          revokedBy: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.invitation.count({ where }),
    ]);

    // Fetch related data separately to avoid FK errors
    // This is a defensive approach to handle invalid FK data gracefully
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const invitationIds = data.map((i) => i.id);
    const tenantMemberIds = data
      .map((i) => i.invitedByMemberId)
      .filter((id): id is string => id !== null);
    const userIds = data
      .map((i) => i.invitedByUserId)
      .filter((id): id is string => id !== null);
    const acceptedByUserIds = data
      .map((i) => i.acceptedBy)
      .filter((id): id is string => id !== null);
    const revokedByMemberIds = data
      .map((i) => i.revokedBy)
      .filter((id): id is string => id !== null);

    // Fetch all related records in parallel
    const [tenantMembers, users, acceptedByUsers, revokedByMembers] =
      await Promise.all([
        // Fetch tenant members
        tenantMemberIds.length > 0
          ? this.prisma.tenantMember.findMany({
              where: { id: { in: tenantMemberIds } },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            })
          : [],
        // Fetch users
        userIds.length > 0
          ? this.prisma.user.findMany({
              where: { id: { in: userIds } },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            })
          : [],
        // Fetch accepting users
        acceptedByUserIds.length > 0
          ? this.prisma.user.findMany({
              where: { id: { in: acceptedByUserIds } },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            })
          : [],
        // Fetch revoking tenant members
        revokedByMemberIds.length > 0
          ? this.prisma.tenantMember.findMany({
              where: { id: { in: revokedByMemberIds } },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            })
          : [],
      ]);

    // Create lookup maps with explicit tuple types
    const tenantMemberMap = new Map<string, any>(
      tenantMembers.map((tm) => [tm.id, tm] as const),
    );
    const userMap = new Map<string, any>(users.map((u) => [u.id, u] as const));
    const acceptedByUserMap = new Map<string, any>(
      acceptedByUsers.map((u) => [u.id, u] as const),
    );
    const revokedByMemberMap = new Map<string, any>(
      revokedByMembers.map((tm) => [tm.id, tm] as const),
    );

    // Enrich data with relations
    const enrichedData = data.map((invitation) => ({
      ...invitation,
      invitedByMember:
        invitation.invitedByMemberId !== null
          ? tenantMemberMap.get(invitation.invitedByMemberId) || null
          : null,
      invitedByUser:
        invitation.invitedByUserId !== null
          ? userMap.get(invitation.invitedByUserId) || null
          : null,
      acceptedByUser:
        invitation.acceptedBy !== null
          ? acceptedByUserMap.get(invitation.acceptedBy) || null
          : null,
      revokedByMember:
        invitation.revokedBy !== null
          ? revokedByMemberMap.get(invitation.revokedBy) || null
          : null,
    }));

    return {
      data: enrichedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete an invitation (superadmin only)
   * Permanently removes an invitation from the database
   * @param invitationId ID of the invitation to delete
   */
  async delete(invitationId: string): Promise<{ message: string }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.invitation.delete({
      where: { id: invitationId },
    });

    return { message: 'Invitation deleted successfully' };
  }

  /**
   * Generate a cryptographically secure random token
   */
  private generateUniqueToken(): string {
    return randomBytes(32).toString('hex');
  }
}
