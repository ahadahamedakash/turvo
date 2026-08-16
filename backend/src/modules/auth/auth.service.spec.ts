import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '@src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '@src/modules/mail/mail.service';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any;
  let jwtService: any;
  let mailService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    isSuperAdmin: false,
    password: 'hashedPassword',
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
      tenantMember: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      customer: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      userRole: {
        create: jest.fn(),
      },
      refreshToken: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    mailService = {
      sendPasswordResetEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const mockTenantMember = {
        id: 'member-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
      };

      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Turf',
        slug: 'test-turf',
        status: 'Active',
      };

      const mockRole = {
        id: 'role-123',
        name: 'User',
        slug: 'user',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.tenantMember.findMany.mockResolvedValue([
        {
          ...mockTenantMember,
          tenant: mockTenant,
          userRoles: [
            {
              role: {
                ...mockRole,
                rolePermissions: [
                  {
                    permission: { module: 'Booking', slug: 'create' },
                  },
                ],
              },
            },
          ],
        },
      ]);
      (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValueOnce(
        true as any,
      );
      // Mock generateTokens to return proper token objects
      jwtService.signAsync.mockImplementation((payload, options) => {
        if (options?.expiresIn === '15m') {
          return Promise.resolve('mock-access-token');
        }
        if (options?.expiresIn === '7d') {
          return Promise.resolve('mock-refresh-token');
        }
        return Promise.resolve('mock-token');
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValueOnce(
        false as any,
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'Password123',
      };

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const loginDto = {
        email: 'inactive@example.com',
        password: 'Password123',
      };

      const inactiveUser = { ...mockUser, isActive: false };

      prismaService.user.findUnique.mockResolvedValue(inactiveUser);
      (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValueOnce(
        true as any,
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        tenantId: 'tenant-123',
        email: 'newuser@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
      };

      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Turf',
        slug: 'test-turf',
        status: 'Active',
      };

      const mockRole = {
        id: 'role-123',
        name: 'User',
        slug: 'user',
      };

      const mockTenantMember = {
        id: 'member-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
      };

      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);

      // Mock transaction to create user
      prismaService.$transaction.mockImplementation(async (callback) => {
        const txPrisma = {
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          customer: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'customer-123' }),
          },
          tenantMember: {
            create: jest.fn().mockResolvedValue(mockTenantMember),
          },
          role: {
            findFirst: jest.fn().mockResolvedValue(mockRole),
          },
          userRole: {
            create: jest.fn().mockResolvedValue({}),
          },
          refreshToken: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            update: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({ id: 'token-123' }),
          },
        };
        return await callback(txPrisma);
      });

      prismaService.tenantMember.findFirst.mockResolvedValue({
        ...mockTenantMember,
        userRoles: [
          {
            role: {
              ...mockRole,
              rolePermissions: [],
            },
          },
        ],
      });

      jwtService.signAsync.mockImplementation((payload, options) => {
        if (options?.expiresIn === '15m') {
          return Promise.resolve('mock-access-token');
        }
        if (options?.expiresIn === '7d') {
          return Promise.resolve('mock-refresh-token');
        }
        return Promise.resolve('mock-token');
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('customerId');
    });

    it('should link to existing customer if found', async () => {
      const registerDto = {
        tenantId: 'tenant-123',
        email: 'existing@example.com',
        password: 'Password123',
        firstName: 'Existing',
        lastName: 'Customer',
        phone: '01712345678',
      };

      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Turf',
        slug: 'test-turf',
        status: 'Active',
      };

      const mockExistingCustomer = {
        id: 'existing-customer-123',
        email: 'existing@example.com',
        phone: '01712345678',
        firstName: 'Existing',
        lastName: 'Customer',
      };

      const mockRole = {
        id: 'role-123',
        name: 'User',
        slug: 'user',
      };

      const mockTenantMember = {
        id: 'member-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
      };

      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.tenant.findUnique.mockResolvedValue(mockTenant);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const txPrisma = {
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          customer: {
            findFirst: jest.fn().mockResolvedValue(mockExistingCustomer),
            update: jest.fn().mockResolvedValue(mockExistingCustomer),
            create: jest.fn(),
          },
          tenantMember: {
            create: jest.fn().mockResolvedValue(mockTenantMember),
          },
          role: {
            findFirst: jest.fn().mockResolvedValue(mockRole),
          },
          userRole: {
            create: jest.fn().mockResolvedValue({}),
          },
          refreshToken: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            update: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({ id: 'token-123' }),
          },
        };
        return await callback(txPrisma);
      });

      prismaService.tenantMember.findFirst.mockResolvedValue({
        ...mockTenantMember,
        userRoles: [
          {
            role: {
              ...mockRole,
              rolePermissions: [],
            },
          },
        ],
      });

      jwtService.signAsync.mockImplementation((payload, options) => {
        if (options?.expiresIn === '15m') {
          return Promise.resolve('mock-access-token');
        }
        if (options?.expiresIn === '7d') {
          return Promise.resolve('mock-refresh-token');
        }
        return Promise.resolve('mock-token');
      });

      const result = await service.register(registerDto);

      expect(result.customerId).toBe('existing-customer-123');
    });

    it('should throw ConflictException if user already exists', async () => {
      const registerDto = {
        tenantId: 'tenant-123',
        email: 'existing@example.com',
        password: 'Password123',
        firstName: 'Existing',
        lastName: 'User',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException for invalid tenant', async () => {
      const registerDto = {
        tenantId: 'invalid-tenant',
        email: 'newuser@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
      };

      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for inactive tenant', async () => {
      const registerDto = {
        tenantId: 'tenant-123',
        email: 'newuser@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
      };

      const mockInactiveTenant = {
        id: 'tenant-123',
        name: 'Inactive Turf',
        slug: 'inactive-turf',
        status: 'Inactive',
      };

      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.tenant.findUnique.mockResolvedValue(mockInactiveTenant);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid-refresh-token';

      const mockStoredToken = {
        id: 'token-123',
        userId: 'user-123',
        token: createHash('sha256').update(refreshToken).digest('hex'),
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
      };

      prismaService.refreshToken.findFirst.mockResolvedValue(mockStoredToken);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jwtService.verifyAsync.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('new-token');

      const result = await service.refreshTokens(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid token signature', async () => {
      const refreshToken = 'invalid-refresh-token';

      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      const refreshToken = 'revoked-refresh-token';

      const mockRevokedToken = {
        id: 'token-123',
        userId: 'user-123',
        token: createHash('sha256').update(refreshToken).digest('hex'),
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000),
      };

      jwtService.verifyAsync.mockResolvedValue(true);
      prismaService.refreshToken.findFirst.mockResolvedValue(mockRevokedToken);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const refreshToken = 'expired-refresh-token';

      const mockExpiredToken = {
        id: 'token-123',
        userId: 'user-123',
        token: createHash('sha256').update(refreshToken).digest('hex'),
        isRevoked: false,
        expiresAt: new Date(Date.now() - 86400000), // 24 hours ago
      };

      jwtService.verifyAsync.mockResolvedValue(true);
      prismaService.refreshToken.findFirst.mockResolvedValue(mockExpiredToken);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      prismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.logout('user-123')).resolves.not.toThrow();

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });

  describe('forgotPassword', () => {
    it('should return success for existing email', async () => {
      const forgotPasswordDto = {
        email: 'test@example.com',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.success).toBe(true);
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return success for non-existing email (security)', async () => {
      const forgotPasswordDto = {
        email: 'nonexistent@example.com',
      };

      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.success).toBe(true);
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return success for inactive account (security)', async () => {
      const forgotPasswordDto = {
        email: 'inactive@example.com',
      };

      const inactiveUser = { ...mockUser, isActive: false };

      prismaService.user.findUnique.mockResolvedValue(inactiveUser);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.success).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      const resetPasswordDto = {
        token: 'valid-token',
        newPassword: 'NewPassword123',
      };

      const mockUserWithToken = {
        id: 'user-123',
        passwordResetToken: 'valid-token',
        passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUserWithToken);
      (jest.spyOn(bcrypt, 'hash') as jest.Mock).mockResolvedValue(
        'hashed-new-password',
      );
      prismaService.$transaction.mockImplementation(async (callback) => {
        const txPrisma = {
          user: {
            update: jest.fn().mockResolvedValue({}),
          },
          refreshToken: {
            updateMany: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(txPrisma);
      });

      const result = await service.resetPassword(resetPasswordDto);

      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException for invalid token', async () => {
      const resetPasswordDto = {
        token: 'invalid-token',
        newPassword: 'NewPassword123',
      };

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const resetPasswordDto = {
        token: 'expired-token',
        newPassword: 'NewPassword123',
      };

      const mockUserWithExpiredToken = {
        id: 'user-123',
        passwordResetToken: 'expired-token',
        passwordResetExpires: new Date(Date.now() - 3600000), // 1 hour ago
        isActive: true,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUserWithExpiredToken);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyResetToken', () => {
    it('should return valid for good token', async () => {
      const mockUserWithToken = {
        passwordResetExpires: new Date(Date.now() + 3600000),
        isActive: true,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUserWithToken);

      const result = await service.verifyResetToken('valid-token');

      expect(result.valid).toBe(true);
    });

    it('should return invalid for expired token', async () => {
      const mockUserWithExpiredToken = {
        passwordResetExpires: new Date(Date.now() - 3600000),
        isActive: true,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUserWithExpiredToken);

      const result = await service.verifyResetToken('expired-token');

      expect(result.valid).toBe(false);
    });

    it('should return invalid for non-existent token', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.verifyResetToken('nonexistent-token');

      expect(result.valid).toBe(false);
    });
  });
});
