import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, IsNotEmpty } from 'class-validator';

/**
 * DTO for updating roles assigned to a tenant member
 */
export class UpdateMemberRolesDto {
  @ApiProperty({
    description: 'Array of role IDs to assign to the member',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  roleIds: string[];
}
