import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@src/prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class RefreshtokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  // validate refresh token
  async validate(req: Request, payload: { sub: string; email: string }) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Refresh token not provided!');
    }

    const refreshToken = authHeader.split(' ')[1];
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Refresh token is empty after extraction!',
      );
    }

    // Hash the provided token with SHA-256 to match against stored hash
    const hashedToken = createHash('sha256').update(refreshToken).digest('hex');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isSuperAdmin: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Query by the specific token hash (not just any valid token for the user)
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        token: hashedToken,
        userId: payload.sub,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token!');
    }

    return {
      id: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin ?? false,
      refreshToken,
    };
  }
}
