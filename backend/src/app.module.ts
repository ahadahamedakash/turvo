import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { ThrottlerConfigModule } from './common/throttler/throttler.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { SanitizationMiddleware } from './common/middleware/sanitization.middleware';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    InvitationModule,
    ThrottlerConfigModule,
    HealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SanitizationMiddleware, LoggingMiddleware)
      .exclude('health') // Exclude health check from middleware
      .forRoutes('*');
  }
}
