import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString as IsStringVal,
  MaxLength,
} from 'class-validator';

export class BlockSlotDto {
  @ApiProperty({
    description:
      'Reason for blocking the slot (e.g. maintenance, private event)',
    example: 'Court under maintenance',
  })
  @IsStringVal()
  @IsNotEmpty({ message: 'Reason is required' })
  @MaxLength(255, { message: 'Reason must be at most 255 characters' })
  reason!: string;
}
