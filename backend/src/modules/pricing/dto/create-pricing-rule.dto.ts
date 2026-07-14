import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsEnum,
  IsUUID,
  IsString as IsStringVal,
  Matches,
  IsNotEmpty as IsNotEmptyVal,
  IsNumber,
  Min,
} from 'class-validator';
import { DayType } from '../../../../generated/prisma/enums';
import { Type } from 'class-transformer';

export class CreatePricingRuleDto {
  @ApiProperty({
    description: 'Court ID to apply pricing rule to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'Court ID is required' })
  courtId!: string;

  @ApiProperty({
    description: 'Day type for this pricing rule',
    enum: DayType,
    example: DayType.Weekday,
  })
  @IsEnum(DayType, {
    message: 'Day type must be one of: Weekday, Weekend, Holiday',
  })
  @IsNotEmpty({ message: 'Day type is required' })
  dayType!: DayType;

  @ApiProperty({
    description: 'Start time in HH:mm format (24-hour format)',
    example: '06:00',
  })
  @IsStringVal()
  @IsNotEmptyVal({ message: 'Start time is required' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format (24-hour)',
  })
  startTime!: string;

  @ApiProperty({
    description: 'End time in HH:mm format (24-hour format)',
    example: '23:00',
  })
  @IsStringVal()
  @IsNotEmptyVal({ message: 'End time is required' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format (24-hour)',
  })
  endTime!: string;

  @ApiProperty({
    description: 'Price per hour in decimal format',
    example: 500.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Price must be a number' })
  @Min(0, { message: 'Price cannot be negative' })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Price is required' })
  price!: number;
}
