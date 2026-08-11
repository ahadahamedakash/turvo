import type { Request } from 'express';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { PrismaService } from '@src/prisma/prisma.service';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
// import { JwtPayload } from '../../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    super({
      // Try to extract from Authorization header first, then fallback to cookie
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          // Fallback: extract from cookie (for middleware and client-side auth)
          if (req && req.cookies) {
            return req.cookies.access_token;
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found!');
    }

    // Check if user account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Attach tenant context from JWT to user object
    // This avoids DB queries on every request for tenant membership
    return {
      ...user,
      tenantContext: payload.tenantContext, // From JWT, not DB query
    };
  }
}
