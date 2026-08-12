import { PartialType } from '@nestjs/swagger';
import { CreatePermissionDto } from './create-permission.dto';

/**
 * DTO for updating an existing permission
 * All fields are optional
 */
export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {}
