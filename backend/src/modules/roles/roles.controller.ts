import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '@src/common/guard/jwt-auth.guard';
import { RoleResponseDto } from './dto/role-response.dto';

@ApiTags('roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Get all roles for invitation assignment
   */
  @Get()
  @ApiOperation({
    summary: 'Get all roles',
    description:
      'Returns a list of all available roles that can be assigned when inviting team members to a tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of roles',
    type: [RoleResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll() {
    return this.rolesService.findAll();
  }
}
