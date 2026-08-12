import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';
import type { CreatePermissionDto } from './dto/create-permission.dto';
import type { UpdatePermissionDto } from './dto/update-permission.dto';

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
   * Note: deletedAt filter removed as we now use hard delete
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
   * Uses hard DELETE for junction table cleanup
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
      // Get current role permissions
      const currentRolePermissions = await tx.rolePermission.findMany({
        where: { roleId },
        select: { permissionId: true },
      });

      const currentPermissionIds = new Set(
        currentRolePermissions.map((rp) => rp.permissionId),
      );

      // Calculate permissions to DELETE (exist in DB but not in new list)
      const toDelete = currentRolePermissions
        .filter((rp) => !permissionIds.includes(rp.permissionId))
        .map((rp) => rp.permissionId);

      // Calculate permissions to CREATE (in new list but don't exist in DB)
      const toCreate = permissionIds.filter((id) => !currentPermissionIds.has(id));

      // Hard DELETE permissions that are being removed
      if (toDelete.length > 0) {
        await tx.rolePermission.deleteMany({
          where: {
            roleId,
            permissionId: { in: toDelete },
          },
        });
      }

      // CREATE new permissions that are being added
      if (toCreate.length > 0) {
        await tx.rolePermission.createMany({
          data: toCreate.map((permissionId) => ({
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
            // Note: deletedAt filter removed as we now use hard delete
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
              // Note: deletedAt filter removed as we now use hard delete for role permissions
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

  /**
   * Get a single permission by ID
   */
  async findOnePermission(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return permission;
  }

  /**
   * Create a new permission
   */
  async createPermission(data: CreatePermissionDto) {
    // Check if slug already exists
    const existing = await this.prisma.permission.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Permission with slug "${data.slug}" already exists`,
      );
    }

    return this.prisma.permission.create({
      data: {
        module: data.module,
        slug: data.slug,
        name: data.name,
        description: data.description,
      },
    });
  }

  /**
   * Update an existing permission
   */
  async updatePermission(id: string, data: UpdatePermissionDto) {
    // Check if permission exists
    const existing = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    // If slug is being updated, check for conflicts
    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await this.prisma.permission.findUnique({
        where: { slug: data.slug },
      });

      if (slugConflict) {
        throw new ConflictException(
          `Permission with slug "${data.slug}" already exists`,
        );
      }
    }

    return this.prisma.permission.update({
      where: { id },
      data: {
        ...(data.module !== undefined && { module: data.module }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
      },
    });
  }

  /**
   * Delete a permission
   * Blocks deletion if permission is assigned to any roles
   */
  async deletePermission(id: string) {
    // Check if permission exists
    const existing = await this.prisma.permission.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });

    if (!existing) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    // Check if permission is assigned to any roles
    // Note: deletedAt filter removed as we now use hard delete
    const assignmentCount = await this.prisma.rolePermission.count({
      where: {
        permissionId: id,
      },
    });

    if (assignmentCount > 0) {
      throw new ConflictException(
        `Cannot delete permission "${existing.name}": assigned to ${assignmentCount} role(s). Remove from roles before deletion.`,
      );
    }

    // Delete the permission
    await this.prisma.permission.delete({
      where: { id },
    });
  }
}
