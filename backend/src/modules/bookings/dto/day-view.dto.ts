import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/** Query DTO for GET /bookings/day-view — the calendar grid payload. */
export class DayViewQueryDto {
  @ApiProperty({
    description: 'The calendar day to load, YYYY-MM-DD',
    example: '2026-08-18',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date!: string;
}
