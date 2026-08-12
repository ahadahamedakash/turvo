import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all roles for invitation assignment
   * Returns roles that can be assigned when inviting team members
   */
  async findAll() {
    return this.prisma.role.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get a single role by ID
   */
  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  /**
   * Create a new role
   * Auto-generates slug from the role name
   */
  async create(createRoleDto: CreateRoleDto) {
    const { name, description } = createRoleDto;
    const slug = await this.generateSlug(name);

    return this.prisma.role.create({
      data: {
        name,
        description,
        slug,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
    });
  }

  /**
   * Update an existing role
   * Regenerates slug if name is changed
   */
  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const { name, description } = updateRoleDto;

    // Check if role exists
    const existing = await this.prisma.role.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // If name is being updated, regenerate slug
    const slug = name ? await this.generateSlug(name) : undefined;

    return this.prisma.role.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(slug !== undefined && { slug }),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
    });
  }

  /**
   * Delete a role
   * Blocks deletion if role is assigned to any users
   */
  async delete(id: string) {
    // Check if role exists
    const existing = await this.prisma.role.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Check if role is assigned to any users
    const assignmentCount = await this.prisma.userRole.count({
      where: {
        roleId: id,
        deletedAt: null,
      },
    });

    if (assignmentCount > 0) {
      throw new ConflictException(
        `Cannot delete role "${existing.name}": assigned to ${assignmentCount} user(s). Reassign roles before deletion.`,
      );
    }

    // Delete role permissions first (foreign key constraint)
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: id },
    });

    // Delete the role
    await this.prisma.role.delete({
      where: { id },
    });
  }

  /**
   * Generate a unique slug from a role name
   * Handles conflicts by appending a counter
   */
  private async generateSlug(name: string): Promise<string> {
    // Convert name to kebab-case
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists and append counter if needed
    while (await this.prisma.role.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    return slug;
  }
}
