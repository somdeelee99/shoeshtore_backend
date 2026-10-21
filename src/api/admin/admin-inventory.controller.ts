import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InventoryService } from '../../modules/inventory/inventory.service';

class AdjustStockDto {
  @IsIn(['IN', 'OUT', 'ADJUST'])
  type: 'IN' | 'OUT' | 'ADJUST';

  @Type(() => Number)
  @IsInt()
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('Admin / Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@Query() query: PaginationDto & { productId?: string; lowOnly?: string }) {
    return this.inventory.list(query);
  }

  @Get('summary')
  summary() {
    return this.inventory.summary();
  }

  @Get('logs')
  logs(@Query() query: PaginationDto & { variantId?: string }) {
    return this.inventory.logs(query);
  }

  @Post(':variantId/adjust')
  adjust(@Param('variantId') variantId: string, @Body() dto: AdjustStockDto, @CurrentUser() user: AuthUser) {
    return this.inventory.adjust(variantId, dto.type, dto.quantity, dto.note, user.id);
  }
}
