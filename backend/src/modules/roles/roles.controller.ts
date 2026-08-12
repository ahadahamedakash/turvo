import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '@src/common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '@src/common/guards/super-admin.guard';
import { RoleResponseDto } from './dto/role-response.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

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

  /**
   * Get a single role by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get role by ID',
    description: 'Returns details of a specific role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Role details',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  /**
   * Create a new role (SuperAdmin only)
   */
  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Create a new role',
    description:
      'Creates a new role with auto-generated slug from the name. Only superadmins can create roles.',
  })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires superadmin privileges',
  })
  async create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  /**
   * Update an existing role (SuperAdmin only)
   */
  @Put(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Update a role',
    description:
      'Updates a role name and/or description. Slug is auto-regenerated if name changes. Only superadmins can update roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires superadmin privileges',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  /**
   * Delete a role (SuperAdmin only)
   */
  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Delete a role',
    description:
      'Permanently deletes a role. Blocked if the role is assigned to any users. Only superadmins can delete roles.',
  })
  @ApiParam({
    name: 'id',
    description: 'Role ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Role deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires superadmin privileges',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - role is assigned to users and cannot be deleted',
  })
  async delete(@Param('id') id: string) {
    await this.rolesService.delete(id);
    return { message: 'Role deleted successfully' };
  }
}
