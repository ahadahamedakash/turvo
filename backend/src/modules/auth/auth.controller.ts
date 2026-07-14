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
import type { Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
// RegisterDto import removed - registration is disabled
// import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth.response.dto';
import { JwtAuthGuard } from '@src/common/guard/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { GetUser } from '@src/common/decorators/get-user.decorator';
import { RegistrationDisabledPipe } from '@src/common/pipes/registration-disabled.pipe';
import { ThrottleStrict, ThrottleMedium } from '@src/common/decorators/throttle.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
} from './dto/reset-password-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  // Register API (DEPRECATED)
  @Post('register')
  @HttpCode(HttpStatus.BAD_REQUEST)
  @ApiOperation({
    summary: 'Register a new user (DEPRECATED)',
    description: 'DEPRECATED: Public registration is disabled. Users must join via invitation link from existing tenant members. This endpoint will be removed in v2.',
    deprecated: true,
  })
  @ApiResponse({
    status: 400,
    description: 'Public registration disabled - use invitation flow instead',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Public registration is disabled. Please use an invitation link to join an organization.',
        },
        error: {
          type: 'string',
          example: 'RegistrationDisabled',
        },
      },
    },
  })
  async register(@Req() _req: Request): Promise<never> {
    throw new BadRequestException({
      message: 'Public registration is disabled. Please use an invitation link to join an organization.',
      error: 'RegistrationDisabled',
    });
  }

  @Post('refresh')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Refreshes the access token using a valid refresh token. Implements token rotation by revoking the old token and issuing a new one.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @GetUser('refreshToken') refreshToken: string,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.authService.refreshTokens(refreshToken, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Logout the user and revokes all refresh tokens. Access tokens remain valid until expiration (15 minutes).',
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
  async logout(@GetUser('id') userId: string): Promise<{ message: string }> {
    await this.authService.logout(userId);
    return { message: 'Successfully logged out' };
  }

  @Post('login')
  @ThrottleStrict() // Rate limiting: 5 requests per 15 seconds
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticates a user with email and password, returns access and refresh tokens. Rate limited to prevent brute force attacks.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
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
  ): Promise<AuthResponseDto> {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('forgot-password')
  @ThrottleMedium() // Rate limiting: 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Initiates the password reset flow by sending a reset link to the user\'s email. The link expires in 1 hour. Returns success even if email doesn\'t exist to prevent enumeration.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (or success message returned for security)',
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
      'Resets the user\'s password using a valid reset token received via email. Token expires after 1 hour. Upon successful reset, all active sessions are revoked.',
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
}
