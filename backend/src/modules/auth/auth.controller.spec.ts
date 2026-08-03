/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;

  const mockAuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      verifyResetToken: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'strict',
            ttl: 15000,
            limit: 5,
          },
          {
            name: 'medium',
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    configService = module.get(ConfigService);

    // Setup config service mock
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      return null;
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return auth tokens and user data on successful login', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      authService.login.mockResolvedValue(mockAuthResponse);

      const mockReq = {
        headers: {
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'test-agent',
        },
        socket: { remoteAddress: '127.0.0.2' },
      } as unknown as Request;

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.login(loginDto, mockReq, mockRes);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        '127.0.0.1',
        'test-agent',
      );
      expect(result).toEqual(mockAuthResponse);
      expect(mockRes.cookie).toHaveBeenCalled(); // Cookies should be set
    });

    it('should handle login with missing headers gracefully', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      authService.login.mockResolvedValue(mockAuthResponse);

      const mockReq = {
        headers: {},
        socket: {},
      } as Request;

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      await controller.login(loginDto, mockReq, mockRes);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        'unknown',
        'unknown',
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
        phone: '01712345678',
      };

      const mockRegisterResponse = {
        ...mockAuthResponse,
        customerId: 'customer-123',
        tenants: [
          {
            id: 'tenant-123',
            name: 'Test Turf',
            slug: 'test-turf',
            tenantMemberId: 'member-123',
            permissions: [],
            role: {
              id: 'role-123',
              name: 'User',
              slug: 'user',
            },
          },
        ],
      };

      authService.register.mockResolvedValue(mockRegisterResponse);

      const mockReq = {
        headers: {
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'test-agent',
        },
        socket: { remoteAddress: '127.0.0.2' },
      } as unknown as Request;

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.register(registerDto, mockReq, mockRes);

      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        '127.0.0.1',
        'test-agent',
      );
      expect(result).toEqual(mockRegisterResponse);
      expect(result.customerId).toBe('customer-123');
      expect(result.tenants).toHaveLength(1);
    });

    it('should handle registration with existing customer', async () => {
      const registerDto = {
        tenantId: 'tenant-123',
        email: 'existing@example.com',
        password: 'Password123',
        firstName: 'Existing',
        lastName: 'Customer',
        phone: '01712345678',
      };

      const mockRegisterResponse = {
        ...mockAuthResponse,
        customerId: 'existing-customer-123',
      };

      authService.register.mockResolvedValue(mockRegisterResponse);

      const mockReq = {
        headers: {},
        socket: {},
      } as Request;

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.register(registerDto, mockReq, mockRes);

      expect(result.customerId).toBe('existing-customer-123');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockRefreshResponse = {
        ...mockAuthResponse,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      authService.refreshTokens.mockResolvedValue(mockRefreshResponse);

      const mockReq = {
        headers: {
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'test-agent',
        },
        socket: { remoteAddress: '127.0.0.2' },
      } as unknown as Request;

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      // Mock the guard to set the user
      const refreshToken = 'valid-refresh-token';

      const result = await controller.refresh(refreshToken, mockReq, mockRes);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        refreshToken,
        '127.0.0.1',
        'test-agent',
      );
      expect(result).toEqual(mockRefreshResponse);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      authService.logout.mockResolvedValue(undefined);

      const mockRes = {
        clearCookie: jest.fn(),
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.logout('user-123', mockRes);

      expect(authService.logout).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ message: 'Successfully logged out' });
    });
  });

  describe('forgot-password', () => {
    it('should return success message even if email does not exist', async () => {
      const forgotPasswordDto = {
        email: 'nonexistent@example.com',
      };

      authService.forgotPassword.mockResolvedValue({
        message:
          'If an account exists with this email, a password reset link has been sent',
        success: true,
      });

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto,
      );
      expect(result.success).toBe(true);
    });
  });

  describe('reset-password', () => {
    it('should reset password successfully with valid token', async () => {
      const resetPasswordDto = {
        token: 'valid-reset-token',
        newPassword: 'NewPassword123',
      };

      authService.resetPassword.mockResolvedValue({
        message:
          'Password has been reset successfully. Please login with your new password.',
        success: true,
      });

      const result = await controller.resetPassword(resetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(result.success).toBe(true);
    });
  });

  describe('verify-reset-token', () => {
    it('should verify token validity', async () => {
      authService.verifyResetToken.mockResolvedValue({ valid: true });

      const result = await controller.verifyResetToken('valid-token');

      expect(authService.verifyResetToken).toHaveBeenCalledWith('valid-token');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for expired token', async () => {
      authService.verifyResetToken.mockResolvedValue({ valid: false });

      const result = await controller.verifyResetToken('expired-token');

      expect(result.valid).toBe(false);
    });
  });

  describe('IP address extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      authService.login.mockResolvedValue(mockAuthResponse);

      const mockReq = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'test-agent',
        },
        socket: { remoteAddress: '127.0.0.2' },
      } as unknown as Request;

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      await controller.login(loginDto, mockReq, mockRes);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        '192.168.1.1', // Should take first IP from x-forwarded-for
        'test-agent',
      );
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is not present', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      authService.login.mockResolvedValue(mockAuthResponse);

      const mockReq = {
        headers: {
          'x-real-ip': '10.0.0.1',
          'user-agent': 'test-agent',
        },
        socket: { remoteAddress: '127.0.0.2' },
      } as unknown as Request;

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      await controller.login(loginDto, mockReq, mockRes);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        '10.0.0.1',
        'test-agent',
      );
    });

    it('should fall back to socket remote address', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      authService.login.mockResolvedValue(mockAuthResponse);

      const mockReq = {
        headers: {
          'user-agent': 'test-agent',
        },
        socket: { remoteAddress: '172.16.0.1' },
      } as unknown as Request;

      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response;

      await controller.login(loginDto, mockReq, mockRes);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        '172.16.0.1',
        'test-agent',
      );
    });
  });
});
