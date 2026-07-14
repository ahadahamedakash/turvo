import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsUrl,
} from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Name of the tenant/organization',
    example: 'Acme Sports Complex',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tenant name is required' })
  name!: string;

  @ApiProperty({
    description: 'URL-friendly slug (unique identifier for the organization)',
    example: 'acme-sports-complex',
  })
  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @ApiProperty({
    description: 'Description of the organization',
    example: 'A premium sports facility with multiple courts',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Physical address of the organization',
    example: '123 Sports Lane, City, Country',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Timezone for the organization',
    example: 'Asia/Dhaka',
    required: false,
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({
    description: 'Organization website',
    example: 'https://acmesports.com',
    required: false,
  })
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @IsOptional()
  website?: string;

  @ApiProperty({
    description: 'Opening hour (HH:mm format)',
    example: '06:00',
    required: false,
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Opening hour must be in HH:mm format',
  })
  @IsOptional()
  openingHour?: string;

  @ApiProperty({
    description: 'Closing hour (HH:mm format)',
    example: '23:00',
    required: false,
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Closing hour must be in HH:mm format',
  })
  @IsOptional()
  closingHour?: string;
}
