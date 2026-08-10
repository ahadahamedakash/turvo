import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';

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
}
