import { Module } from '@nestjs/common';
import { PrismaModule } from '@src/prisma/prisma.module';
import { SlotsModule } from '@src/modules/slots/slots.module';
import { CustomersModule } from '@src/modules/customers/customers.module';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';

/**
 * Bookings module — the revenue-critical core.
 *
 * Imports SlotsModule (lazy hold release in day-view) and CustomersModule
 * (transaction-aware find-or-create inside the booking transaction).
 * Exports BookingsService: a future standalone payments module must route
 * its writes through this service to keep `paidAmount` maintained.
 */
@Module({
  imports: [PrismaModule, SlotsModule, CustomersModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
