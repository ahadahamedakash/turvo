import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  Req,
  Res,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth.response.dto';
import { JwtAuthGuard } from '@src/common/guard/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { GetUser } from '@src/common/decorators/get-user.decorator';
import {
  ThrottleStrict,
  ThrottleMedium,
} from '@src/common/decorators/throttle.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
} from './dto/reset-password-response.dto';
import { setAuthCookies, clearAuthCookies } from './utilities/cookie.config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // Helper method to extract IP and user agent from request
  private getClientInfo(req: Request): {
    ipAddress: string;
    userAgent: string;
  } {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';

    const userAgent = req.headers['user-agent'] || 'unknown';

    return { ipAddress, userAgent };
  }

  @Post('register')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Register a new user account for a specific tenant (turf/venue). If a customer record with matching email or phone exists, the user will be linked to that customer record and can view previous bookings. The user is assigned a default "user" role with limited permissions.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or tenant is inactive',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    const authResponse = await this.authService.register(
      registerDto,
      ipAddress,
      userAgent,
    );

    // Set tokens as httpOnly cookies
    setAuthCookies(
      res,
      this.configService,
      authResponse.accessToken,
      authResponse.refreshToken,
    );

    return authResponse;
  }

  @Post('refresh')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Refreshes the access token using a valid refresh token. Implements token rotation by revoking the old token and issuing a new one. New tokens are set as httpOnly cookies.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed and set as cookies',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @GetUser('refreshToken') refreshToken: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    const authResponse = await this.authService.refreshTokens(
      refreshToken,
      ipAddress,
      userAgent,
    );

    // Set new tokens as httpOnly cookies
    setAuthCookies(
      res,
      this.configService,
      authResponse.accessToken,
      authResponse.refreshToken,
    );

    return authResponse;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Logout the user and revokes all refresh tokens. Access tokens remain valid until expiration (15 minutes). Clears auth cookies.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Successfully logged out' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or expired access token',
  })
  async logout(
    @GetUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId);

    // Clear auth cookies
    clearAuthCookies(res);

    return { message: 'Successfully logged out' };
  }

  @Post('login')
  @ThrottleStrict() // Rate limiting: 5 requests per 15 seconds
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticates a user with email and password. Tokens are set as httpOnly cookies for enhanced security. Rate limited to prevent brute force attacks.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated. Tokens set as cookies.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    const authResponse = await this.authService.login(
      loginDto,
      ipAddress,
      userAgent,
    );

    console.log('[AuthController] Login successful, setting cookies...');
    console.log('[AuthController] Access token length:', authResponse.accessToken.length);
    console.log('[AuthController] Refresh token length:', authResponse.refreshToken.length);

    // Set tokens as httpOnly cookies
    setAuthCookies(
      res,
      this.configService,
      authResponse.accessToken,
      authResponse.refreshToken,
    );

    console.log('[AuthController] Cookies set, returning response');
    return authResponse;
  }

  @Post('forgot-password')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      "Initiates the password reset flow by sending a reset link to the user's email. The link expires in 1 hour. Returns success even if email doesn't exist to prevent enumeration.",
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description:
      'Password reset email sent (or success message returned for security)',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      "Resets the user's password using a valid reset token received via email. Token expires after 1 hour. Upon successful reset, all active sessions are revoked.",
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('verify-reset-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify password reset token',
    description:
      'Checks if a password reset token is valid and not expired. Useful for frontend to determine whether to show the reset form or an error.',
  })
  @ApiQuery({
    name: 'token',
    description: 'Password reset token received via email',
    example: 'a1b2c3d4e5f6...',
  })
  @ApiResponse({
    status: 200,
    description: 'Token validity check result',
    schema: {
      type: 'object',
      properties: {
        valid: {
          type: 'boolean',
          description: 'Whether the token is valid and not expired',
        },
      },
    },
  })
  async verifyResetToken(
    @Query('token') token: string,
  ): Promise<{ valid: boolean }> {
    return this.authService.verifyResetToken(token);
  }

  /**
   * Superadmin: Get all tenants
   */
  @Get('tenants')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all tenants (superadmin only)',
    description:
      'Returns a list of all tenants with member and court counts. Only accessible by superadmins.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'List of all tenants',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string' },
          _count: {
            type: 'object',
            properties: {
              tenantMembers: { type: 'number' },
              courts: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not a superadmin',
  })
  async getTenants(@GetUser('isSuperAdmin') isSuperAdmin: boolean) {
    if (!isSuperAdmin) {
      throw new ForbiddenException('Only superadmins can view all tenants');
    }

    return this.authService.getAllTenants();
  }

  /**
   * Superadmin: Select active tenant
   */
  @Post('select-tenant')
  @UseGuards(JwtAuthGuard)
  @ThrottleMedium()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Superadmin selects active tenant',
    description:
      'Allows superadmin to select which tenant to operate on. Returns new JWT with tenant context. All subsequent API calls will use this tenant context.',
  })
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      required: ['tenantId'],
      properties: {
        tenantId: {
          type: 'string',
          description: 'Tenant ID to select',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant selected successfully, new tokens issued',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or inactive tenant',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not a superadmin',
  })
  async selectTenant(
    @GetUser('id') userId: string,
    @GetUser('email') userEmail: string,
    @GetUser('firstName') userFirstName: string | null,
    @GetUser('lastName') userLastName: string | null,
    @GetUser('isSuperAdmin') isSuperAdmin: boolean,
    @Body('tenantId') tenantId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    // Verify user is superadmin
    if (!isSuperAdmin) {
      throw new ForbiddenException('Only superadmins can select tenants');
    }

    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const { ipAddress, userAgent } = this.getClientInfo(req);

    const authResponse = await this.authService.selectTenantForSuperadmin(
      userId,
      userEmail,
      userFirstName,
      userLastName,
      tenantId,
      ipAddress,
      userAgent,
    );

    // Set new tokens as httpOnly cookies
    setAuthCookies(
      res,
      this.configService,
      authResponse.accessToken,
      authResponse.refreshToken,
    );

    return authResponse;
  }
}
