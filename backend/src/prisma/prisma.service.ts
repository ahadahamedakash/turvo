import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });

    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();

    console.log('Datebase connected successfully!');
  }

  async onModuleDestroy() {
    await this.$disconnect();

    console.log('Database disconnected!');
  }

  // async cleanDatabase() {
  //   if (process.env.NODE_ENV === 'production') {
  //     throw new Error('Cannot clean database in production');
  //   }

  //   const delegates = Object.values(this).filter(
  //     (value): value is { deleteMany: () => Promise<unknown> } =>
  //       typeof value === 'object' &&
  //       value !== null &&
  //       'deleteMany' in value &&
  //       typeof value.deleteMany === 'function',
  //   );

  //   await Promise.all(delegates.map((delegate) => delegate.deleteMany()));
  // }
}
