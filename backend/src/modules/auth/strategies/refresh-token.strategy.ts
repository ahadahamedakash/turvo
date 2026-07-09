import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { PrismaService } from '@src/prisma/prisma.service';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as bcrypt from 'bcryptjs';

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
    console.log('Payload: ', { sub: payload.sub, email: payload.email });

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Refresh token not provided!');
    }
    // const refreshToken = authHeader.replace('Bearer', '').trim();
    const refreshToken = authHeader.split(' ')[1];
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Refresh token is empty after extraction!',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
      },
    });

    const usersRefreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user || !usersRefreshToken?.token) {
      throw new UnauthorizedException('Invalid refresh token!');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      usersRefreshToken.token,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Invalid refresh does not match!');
    }

    return { id: user.id, email: user.email };
  }
}
