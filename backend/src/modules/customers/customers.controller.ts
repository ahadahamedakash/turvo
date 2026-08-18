import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '@src/common/guards/jwt-auth.guard';
import {
  TenantGuard,
  RequirePermissions,
  PermissionGuard,
} from '@src/common/guards/tenant.guard';
import { CurrentTenant } from '@src/common/decorators/tenant-context.decorator';
import { ThrottlePermissive } from '@src/common/decorators/throttle.decorator';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { CustomerSearchResponseDto } from './dto/customer-response.dto';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * Typeahead search for the booking dialog (Tenant-scoped)
   */
  @Get()
  @ThrottlePermissive()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('Customer.view')
  @ApiOperation({
    summary: 'Search customers (typeahead)',
    description:
      'Phone-first typeahead search for the booking dialog. The search ' +
      'term is matched case-insensitively against phone (send digits only, ' +
      'e.g. "01711" — the frontend strips non-digits) and first/last name. ' +
      'Omit the term to list the most recent customers. Requires ' +
      'Customer.view permission.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Free-text search: phone digits or name fragment',
    example: '01711',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results (1-20)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Matching customers, most recently created first',
    type: CustomerSearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (invalid search or limit)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async search(
    @Query() dto: QueryCustomersDto,
    @CurrentTenant() tenantId: string,
  ): Promise<CustomerSearchResponseDto> {
    const data = await this.customersService.search(
      tenantId,
      dto.search,
      dto.limit,
    );
    return { data };
  }
}
