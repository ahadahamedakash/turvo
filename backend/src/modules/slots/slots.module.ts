import { Module } from '@nestjs/common';
import { SlotsService } from './slots.service';
import { SlotsController } from './slots.controller';
import { SlotsScheduler } from './slots-scheduler.provider';
import { PrismaModule } from '@src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SlotsController],
  providers: [SlotsService, SlotsScheduler],
  exports: [SlotsService],
})
export class SlotsModule {}
