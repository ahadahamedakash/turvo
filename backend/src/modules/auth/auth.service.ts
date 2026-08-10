import bcrypt from 'bcryptjs';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';

import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth.response.dto';

import { createHash, randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { MailService } from '@src/modules/mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly SALT_ROUND = 5;
  private readonly PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  // Register with tenant-based registration and customer linking
  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const {
      tenantId,
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      gender,
    } = registerDto;

    // Check if user with this email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists. Please login instead.',
      );
    }

    // Verify tenant exists and is active
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, status: true },
    });

    if (!tenant) {
      throw new BadRequestException('Invalid tenant ID');
    }

    if (tenant.status !== 'Active') {
      throw new BadRequestException(
        'Cannot register to an inactive tenant. Please contact support.',
      );
    }

    try {
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUND);

      // Create user within a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the user
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone: phone || null,
            address: address || null,
            gender: (gender as any) || null,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            password: false,
          },
        });

        // Check if customer exists with matching email or phone in this tenant
        const existingCustomer = await tx.customer.findFirst({
          where: {
            tenantId,
            OR: [{ email: email }, { phone: phone || undefined }],
            deletedAt: null,
          },
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        });

        // Link user to existing customer if found
        let linkedCustomerId: string | undefined;
        if (existingCustomer) {
          await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              userId: user.id,
              // Optionally update customer info if user provided more details
              firstName: existingCustomer.firstName || firstName,
              lastName: existingCustomer.lastName || lastName,
              phone: existingCustomer.phone || phone || null,
            },
          });
          linkedCustomerId = existingCustomer.id;
        } else {
          // Create new customer record for this user in the tenant
          const newCustomer = await tx.customer.create({
            data: {
              tenantId,
              userId: user.id,
              firstName,
              lastName,
              email,
              phone: phone || null,
              gender: (gender as any) || null,
              address: address || null,
            },
          });
          linkedCustomerId = newCustomer.id;
        }

        // Create tenant member record
        const tenantMember = await tx.tenantMember.create({
          data: {
            tenantId,
            userId: user.id,
          },
          select: {
            id: true,
          },
          });

        // Find or create default "user" role
        let userRole = await tx.role.findFirst({
          where: { slug: 'user' },
        });

        if (!userRole) {
          // Create default user role if it doesn't exist
          userRole = await tx.role.create({
            data: {
              slug: 'user',
              name: 'User',
              description:
                'Default role for registered users with limited permissions',
            },
          });

          // Assign basic permissions to the user role
          // You may want to seed permissions separately
        }

        // Assign user role to the tenant member
        await tx.userRole.create({
          data: {
            tenantMemberId: tenantMember.id,
            roleId: userRole.id,
            assignedBy: user.id, // Self-assigned during registration
          },
        });

        return { user, linkedCustomerId };
      });

      const tokens = await this.generateTokens(
        result.user.id,
        result.user.email,
        result.user.firstName,
        result.user.lastName,
        false, // isSuperAdmin
        tenantId, // tenantMemberId is actually tenantId for users
      );

      await this.replaceUserSession(
        result.user.id,
        tokens.refreshToken,
        undefined,
        ipAddress,
        userAgent,
      );

      // Get the tenant info for response
      const tenantMember = await this.prisma.tenantMember.findFirst({
        where: {
          tenantId,
          userId: result.user.id,
        },
        include: {
          userRoles: {
            where: { deletedAt: null },
            include: {
              role: {
                include: {
                  rolePermissions: {
                    where: { deletedAt: null },
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      const permissions =
        tenantMember?.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map(
            (rp) => rp.permission.slug,
          ),
        ) || [];

      // Get the user role (should always exist since we just created it)
      const userRole = tenantMember?.userRoles[0]?.role
        ? {
            id: tenantMember.userRoles[0].role.id,
            name: tenantMember.userRoles[0].role.name,
            slug: tenantMember.userRoles[0].role.slug,
          }
        : null;

      return {
        ...tokens,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
        customerId: result.linkedCustomerId,
        tenants: [
          {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            tenantMemberId: tenantMember?.id || '',
            permissions,
            role: userRole || {
              id: 'default',
              name: 'User',
              slug: 'user',
            },
          },
        ],
      };
    } catch (error) {
      console.log('Error during registration: ', error);
      throw new InternalServerErrorException(
        'An error occurred during registration',
      );
    }
  }

  // generate tokens
  private async generateTokens(
    userId: string,
    email: string,
    firstName: string,
    lastName: string,
    isSuperAdmin?: boolean,
    tenantMemberId?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: Record<string, any> = {
      sub: userId,
      email,
      firstName,
      lastName,
      isSuperAdmin,
      // tenantMemberId,
    };

    if (!isSuperAdmin && tenantMemberId) {
      payload.tenantMemberId = tenantMemberId;
    }

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

  private async replaceUserSession(
    userId: string,
    refreshToken: string,
    oldTokenId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ id: string; token: string }> {
    // Hash the refresh token with SHA-256 for storage (deterministic, industry standard)
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

      // If we have an old token ID, link it to the new one for rotation tracking
      if (oldTokenId) {
        await tx.refreshToken.update({
          where: { id: oldTokenId },
          data: { replacedByTokenId: null }, // Will be set below with the new token ID
        });
      }

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

      // If we have an old token ID, now update it with the new token's ID
      if (oldTokenId) {
        await tx.refreshToken.update({
          where: { id: oldTokenId },
          data: { replacedByTokenId: newToken.id },
        });
      }

      return { id: newToken.id, token: refreshToken }; // Return raw token for client
    });

    return result;
  }

  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    try {
      await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Hash the provided token with SHA-256 to match against stored hash
    const hashedToken = createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        token: hashedToken,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: storedToken.userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isSuperAdmin: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user account is active
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is disabled. Please contact support.',
      );
    }

    let tenantMemberId: string | undefined;

    if (!user.isSuperAdmin) {
      const tenantMember = await this.prisma.tenantMember.findFirst({
        where: { userId: user.id },
        select: {
          tenantId: true,
        },
      });

      tenantMemberId = tenantMember?.tenantId;
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.firstName,
      user.lastName,
      user.isSuperAdmin,
      tenantMemberId,
    );

    // Pass old token ID for rotation tracking and client metadata
    await this.replaceUserSession(
      user.id,
      tokens.refreshToken,
      storedToken.id,
      ipAddress,
      userAgent,
    );

    return {
      ...tokens,
      user,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    // Check if user account is active
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is disabled. Please contact support.',
      );
    }

    let tenantMemberId: string | undefined;

    if (!user.isSuperAdmin) {
      const tenantMember = await this.prisma.tenantMember.findFirst({
        where: { userId: user.id },
        select: {
          tenantId: true,
        },
      });

      tenantMemberId = tenantMember?.tenantId;
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.firstName,
      user.lastName,
      user.isSuperAdmin,
      tenantMemberId,
    );
    await this.replaceUserSession(
      user.id,
      tokens.refreshToken,
      undefined,
      ipAddress,
      userAgent,
    );

    // Fetch user's tenant memberships with roles and permissions
    const tenantMemberships = await this.prisma.tenantMember.findMany({
      where: { userId: user.id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        userRoles: {
          where: {
            deletedAt: null, // Only active user roles
          },
          include: {
            role: {
              include: {
                rolePermissions: {
                  where: {
                    deletedAt: null, // Only active role permissions
                  },
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Format tenants for response (filter inactive tenants)
    const tenants = tenantMemberships
      .filter((tm) => tm.tenant.status === 'Active')
      .map((tm) => {
        // Extract all permissions from user's roles
        const permissions = tm.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map(
            (rp) => rp.permission.slug,
          ),
        );

        return {
          id: tm.tenant.id,
          name: tm.tenant.name,
          slug: tm.tenant.slug,
          tenantMemberId: tm.id, // Include for audit trails
          permissions, // Include for frontend authorization
          role: tm.userRoles[0]?.role || null, // Get first role (user can have multiple)
        };
      });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tenants,
    };
  }

  /**
   * Initiate password reset process
   * Generates a reset token and sends it via email
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    // Always return success message to prevent email enumeration
    // Even if user doesn't exist or account is inactive
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return {
        message:
          'If an account exists with this email, a password reset link has been sent',
        success: true,
      };
    }

    if (!user.isActive) {
      console.log(`Password reset requested for inactive account: ${email}`);
      return {
        message:
          'If an account exists with this email, a password reset link has been sent',
        success: true,
      };
    }

    try {
      // Generate secure random token
      const resetToken = randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + this.PASSWORD_RESET_EXPIRY);

      // Store token in database (invalidate any previous tokens)
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: tokenExpiry,
        },
      });

      // Send password reset email
      const fullName = `${user.firstName} ${user.lastName}`.trim();
      await this.mailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        fullName || undefined,
      );

      return {
        message:
          'If an account exists with this email, a password reset link has been sent',
        success: true,
      };
    } catch (error) {
      console.error('Error during password reset request:', error);
      // Still return success to prevent email enumeration
      return {
        message:
          'If an account exists with this email, a password reset link has been sent',
        success: true,
      };
    }
  }

  /**
   * Reset password using valid reset token
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string; success: boolean }> {
    const { token, newPassword } = resetPasswordDto;

    // Find user with valid reset token
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: token },
      select: {
        id: true,
        email: true,
        passwordResetExpires: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new BadRequestException({
        message: 'Invalid or expired reset token',
        error: 'InvalidToken',
      });
    }

    if (!user.isActive) {
      throw new BadRequestException({
        message: 'Account is disabled. Please contact support.',
        error: 'AccountDisabled',
      });
    }

    // Check if token has expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException({
        message:
          'Reset token has expired. Please request a new password reset.',
        error: 'TokenExpired',
      });
    }

    try {
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUND);

      // Update password and clear reset token in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Update user password and clear reset token
        await tx.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpires: null,
          },
        });

        // Revoke all refresh tokens for security
        await tx.refreshToken.updateMany({
          where: { userId: user.id },
          data: { isRevoked: true },
        });
      });

      return {
        message:
          'Password has been reset successfully. Please login with your new password.',
        success: true,
      };
    } catch (error) {
      console.error('Error during password reset:', error);
      throw new InternalServerErrorException(
        'An error occurred while resetting your password. Please try again.',
      );
    }
  }

  /**
   * Verify if a password reset token is valid
   * Useful for frontend to show reset form or error
   */
  async verifyResetToken(token: string): Promise<{ valid: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: token },
      select: {
        passwordResetExpires: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return { valid: false };
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return { valid: false };
    }

    return { valid: true };
  }
}
