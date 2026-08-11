import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all permissions in the system
   * Returns all available permissions grouped by module
   */
  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get all permissions for a specific role
   */
  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        rolePermissions: {
          where: { deletedAt: null },
          select: {
            permission: {
              select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                module: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      ...role,
      permissions: role.rolePermissions.map((rp) => rp.permission),
    };
  }

  /**
   * Update permissions assigned to a role
   * Replaces all existing permissions with the new set
   */
  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
    assignedByUserId: string,
  ) {
    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Verify all permission IDs exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Use transaction to update permissions
    return this.prisma.$transaction(async (tx) => {
      // Soft delete existing role permissions
      await tx.rolePermission.updateMany({
        where: { roleId, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      // Create new role permissions
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      // Get updated role with permissions
      const updatedRole = await tx.role.findUnique({
        where: { id: roleId },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          rolePermissions: {
            where: { deletedAt: null },
            select: {
              permission: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  description: true,
                  module: true,
                },
              },
            },
          },
        },
      });

      if (!updatedRole) {
        throw new NotFoundException('Role not found after update');
      }

      return {
        ...updatedRole,
        permissions: updatedRole.rolePermissions.map((rp) => rp.permission),
      };
    });
  }

  /**
   * Get roles assigned to a specific tenant member
   */
  async getMemberRoles(tenantId: string, tenantMemberId: string) {
    // Verify member belongs to the tenant
    const member = await this.prisma.tenantMember.findFirst({
      where: {
        id: tenantMemberId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Tenant member not found');
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        tenantMemberId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantMemberId: true,
        roleId: true,
        assignedBy: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return userRoles;
  }

  /**
   * Update roles assigned to a tenant member
   * Replaces all existing roles with the new set
   */
  async updateMemberRoles(
    tenantId: string,
    tenantMemberId: string,
    roleIds: string[],
    assignedByUserId: string,
  ) {
    // Verify member belongs to the tenant
    const member = await this.prisma.tenantMember.findFirst({
      where: {
        id: tenantMemberId,
        tenantId,
        deletedAt: null,
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Tenant member not found');
    }

    // Verify all role IDs exist
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, slug: true, name: true },
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more role IDs are invalid');
    }

    // Prevent self-modification of roles (users shouldn't be able to remove their own admin access)
    if (member.userId === assignedByUserId) {
      // Check if user is trying to remove all roles or their own admin role
      const currentUserRoles = await this.prisma.userRole.findMany({
        where: {
          tenantMemberId,
          deletedAt: null,
        },
        include: {
          role: true,
        },
      });

      const hasAdminRole = currentUserRoles.some(
        (ur) => ur.role.slug === 'admin' || ur.role.slug === 'superadmin',
      );

      if (
        hasAdminRole &&
        !roleIds.some((id) => roles.find((r) => r.id === id)?.slug === 'admin')
      ) {
        throw new ForbiddenException('You cannot remove your own admin role');
      }
    }

    // Use transaction to update roles
    return this.prisma.$transaction(async (tx) => {
      // Soft delete existing user roles
      await tx.userRole.updateMany({
        where: { tenantMemberId, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      // Create new user roles
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            tenantMemberId,
            roleId,
            assignedBy: assignedByUserId,
          })),
          skipDuplicates: true,
        });
      }

      // Get updated user roles
      const updatedRoles = await tx.userRole.findMany({
        where: {
          tenantMemberId,
          deletedAt: null,
        },
        select: {
          id: true,
          tenantMemberId: true,
          roleId: true,
          assignedBy: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: {
              id: true,
              slug: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return updatedRoles;
    });
  }

  /**
   * Get all permissions for a specific tenant member
   * Aggregates permissions from all assigned roles
   */
  async getMemberPermissions(tenantId: string, tenantMemberId: string) {
    // Verify member belongs to the tenant
    const member = await this.prisma.tenantMember.findFirst({
      where: {
        id: tenantMemberId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!member) {
      throw new NotFoundException('Tenant member not found');
    }

    // Get user's roles with permissions
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        tenantMemberId,
        deletedAt: null,
      },
      select: {
        role: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            rolePermissions: {
              where: { deletedAt: null },
              select: {
                permission: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                    description: true,
                    module: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Aggregate all unique permissions
    const permissionsMap = new Map();
    const roles: Array<{
      id: string;
      slug: string;
      name: string;
      description?: string;
    }> = [];

    for (const userRole of userRoles) {
      if (userRole.role) {
        roles.push({
          id: userRole.role.id,
          slug: userRole.role.slug,
          name: userRole.role.name,
          description: userRole.role.description || undefined,
        });

        for (const rolePermission of userRole.role.rolePermissions) {
          const perm = rolePermission.permission;
          permissionsMap.set(perm.id, perm);
        }
      }
    }

    const permissions = Array.from(permissionsMap.values());
    const permissionSlugs = permissions.map((p) => p.slug);

    return {
      tenantMemberId,
      permissions,
      permissionSlugs,
      roles,
    };
  }
}
