import { ApiProperty } from '@nestjs/swagger';

export class TenantResponseDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the tenant/organization',
    example: 'Acme Sports Complex',
  })
  name!: string;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'acme-sports-complex',
  })
  slug!: string;

  @ApiProperty({
    description: 'Description of the organization',
    example: 'A premium sports facility with multiple courts',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Physical address',
    example: '123 Sports Lane, City, Country',
    required: false,
  })
  address?: string;

  @ApiProperty({
    description: 'Timezone',
    example: 'Asia/Dhaka',
    required: false,
  })
  timezone?: string;

  @ApiProperty({
    description: 'Organization website',
    example: 'https://acmesports.com',
    required: false,
  })
  website?: string;

  @ApiProperty({
    description: 'Opening hour (HH:mm format)',
    example: '06:00',
    required: false,
  })
  openingHour?: string;

  @ApiProperty({
    description: 'Closing hour (HH:mm format)',
    example: '23:00',
    required: false,
  })
  closingHour?: string;

  @ApiProperty({
    description: 'Status of the tenant',
    enum: ['Active', 'Inactive', 'Suspended'],
    example: 'Active',
  })
  status!: string;

  @ApiProperty({
    description: 'Number of members in the tenant',
    example: 15,
  })
  memberCount!: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt!: string;
}

export class TenantListResponseDto {
  @ApiProperty({
    description: 'List of tenants',
    type: [TenantResponseDto],
  })
  data!: TenantResponseDto[];

  @ApiProperty({
    description: 'Total number of tenants',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages!: number;
}
