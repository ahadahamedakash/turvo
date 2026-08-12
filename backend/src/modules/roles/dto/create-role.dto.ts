import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO for creating a new role
 */
export class CreateRoleDto {
  @ApiProperty({
    example: 'Turf Manager',
    description: 'Human-readable role name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'Can manage courts and bookings',
    description: 'Description of what this role can do',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
