import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CustomersService } from '../../modules/customers/customers.service';

class StatusDto {
  @IsIn(['ACTIVE', 'BLOCKED'])
  status: 'ACTIVE' | 'BLOCKED';
}

@ApiTags('Admin / Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@Query() query: PaginationDto & { status?: string }) {
    return this.customers.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.customers.findOne(id);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.customers.setStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customers.remove(id);
  }
}
