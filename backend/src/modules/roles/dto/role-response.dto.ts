import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({
    description: 'Role ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Unique slug for the role',
    example: 'admin',
  })
  slug!: string;

  @ApiProperty({
    description: 'Display name of the role',
    example: 'Admin',
  })
  name!: string;

  @ApiProperty({
    description: 'Description of what this role can do',
    example: 'Tenant administrator with full tenant access',
    required: false,
  })
  description?: string | null;
}
