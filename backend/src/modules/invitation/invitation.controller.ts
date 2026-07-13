import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InvitationService } from './invitation.service';
import { JwtAuthGuard } from '@src/common/guard/jwt-auth.guard';
import { TenantGuard, PermissionGuard, RequirePermissions } from '@src/common/guard/tenant.guard';
import { GetUser } from '@src/common/decorators/get-user.decorator';
import {
  CurrentTenant,
  CurrentMember,
} from '@src/common/decorators/tenant-context.decorator';
import { ThrottleHourly, ThrottleMedium, ThrottlePermissive } from '@src/common/decorators/throttle.decorator';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationResponseDto } from './dto/response-invitation.dto';
import {
  AcceptInvitationDto,
  InvitationTokenDto,
} from './dto/accept-invitation.dto';
import { AcceptInvitationResponseDto } from './dto/accept-invitation-response.dto';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  /**
   * Create a new invitation (tenant-scoped)
   * Requires: JWT authentication, tenant membership
   */
  @Post()
  @ThrottleHourly() // Rate limiting: 20 requests per hour
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
  @RequirePermissions('Users.invite')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new invitation',
    description:
      'Creates an invitation for an email address and sends an email with acceptance link. The invitation is scoped to the current tenant context.',
  })
  @ApiBody({ type: CreateInvitationDto })
  @ApiResponse({
    status: 201,
    description: 'Invitation created and email sent successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        token: { type: 'string' },
        status: { type: 'string', enum: ['Pending'] },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (email failed, invalid data)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Not a member of this organization',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict (pending invitation already exists)',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (insufficient permissions)',
  })
  async create(
    @Body() dto: CreateInvitationDto,
    @GetUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @CurrentMember() tenantMemberId: string,
  ) {
    return this.invitationService.create(dto, tenantMemberId, tenantId);
  }

  /**
   * Verify invitation token (public endpoint)
   * Called by frontend to show invitation details before acceptance
   */
  @Post('verify')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify invitation token',
    description:
      'Verifies an invitation token and returns invitation details without requiring authentication. Used to show invitation details on the signup/accept page.',
  })
  @ApiBody({ type: InvitationTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Invitation is valid',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        tenantId: { type: 'string' },
        tenantName: { type: 'string' },
        roleId: { type: 'string' },
        roleName: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        status: { type: 'string', enum: ['Pending'] },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid, expired, or already accepted invitation',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async verify(@Body() dto: InvitationTokenDto) {
    return this.invitationService.getByToken(dto.token);
  }

  /**
   * Accept an invitation (public endpoint)
   * Creates user account and adds them to tenant
   */
  @Post('accept')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept an invitation',
    description:
      'Accepts an invitation by creating a new user account (or adding existing user) and assigning them to the tenant with the specified role. Performed atomically to prevent race conditions. ' +
      'For new users: password, firstName, lastName are required. For existing users: these fields are optional and ignored.',
  })
  @ApiBody({ type: AcceptInvitationDto })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
    type: AcceptInvitationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid, expired, revoked, or already accepted invitation',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User already member of this tenant',
  })
  async accept(@Body() dto: AcceptInvitationDto) {
    return this.invitationService.accept(dto);
  }

  /**
   * Get all invitations for current tenant (paginated)
   * Requires: JWT authentication, tenant membership
   */
  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all invitations for current tenant',
    description:
      'Returns a paginated list of invitations for the current tenant. Optional filtering by status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['Pending', 'Accepted', 'Revoked', 'Expired'],
    description: 'Filter by invitation status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of invitations',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: 'Pending' | 'Accepted' | 'Revoked' | 'Expired',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
  ) {
    return this.invitationService.findAll(tenantId, status, page, limit);
  }

  /**
   * Get a single invitation by ID (tenant-scoped)
   * Requires: JWT authentication, tenant membership
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get invitation by ID',
    description:
      'Returns a single invitation by ID. Only accessible if the invitation belongs to the current tenant.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invitation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation details',
    type: InvitationResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied (invitation belongs to another tenant)',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.invitationService.findOne(id, tenantId);
  }

  /**
   * Revoke an invitation (tenant-scoped)
   * Requires: JWT authentication, tenant membership
   */
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke an invitation',
    description:
      'Revokes a pending invitation. Only pending invitations can be revoked.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invitation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation revoked successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Invitation revoked successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot revoke non-pending invitation',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Not a member of this organization',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async revoke(
    @Param('id') id: string,
    @CurrentMember() tenantMemberId: string,
  ) {
    return this.invitationService.revoke(id, tenantMemberId);
  }

  /**
   * Cleanup expired invitations (maintenance endpoint)
   * Could be called by a cron job or admin
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Clean up expired invitations',
    description:
      'Marks all pending invitations that have expired as Expired. This is typically called by a scheduled job but can be triggered manually.',
  })
  @ApiResponse({
    status: 200,
    description: 'Expired invitations marked successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Number of invitations updated' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async cleanup() {
    return this.invitationService.cleanupExpired();
  }
}
