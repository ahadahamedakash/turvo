import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, IsNotEmpty } from 'class-validator';

/**
 * DTO for updating permissions assigned to a role
 */
export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: 'Array of permission IDs to assign to the role',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '650e8400-e29b-41d4-a716-446655440001',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  permissionIds: string[];
}
