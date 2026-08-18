import { Module } from '@nestjs/common';
import { PrismaModule } from '@src/prisma/prisma.module';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';

/**
 * Deliberately MINIMAL customers module — only what the Bookings module
 * needs (typeahead search + transaction-aware find-or-create). Full
 * customer CRUD/management is a separate future task.
 *
 * Exports CustomersService: BookingsModule imports it to resolve the
 * customer inside its booking transaction.
 */
@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
