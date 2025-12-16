import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ServicesService, CreateServiceDto, CreateCategoryDto } from './services.service';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Services
  @Post()
  @ApiOperation({ summary: 'Create service' })
  async createService(@Body() dto: CreateServiceDto) {
    return this.servicesService.createService(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get services by tenant' })
  async findServices(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.servicesService.findServicesByTenant(tenantId, branchId);
  }

  @Get('by-category/:categoryId')
  @Public()
  @ApiOperation({ summary: 'Get services by category' })
  async findByCategory(
    @Param('categoryId') categoryId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.servicesService.findServicesByCategory(tenantId, categoryId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get service by ID' })
  async findServiceById(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.servicesService.findServiceById(id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update service' })
  async updateService(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: Partial<CreateServiceDto>,
  ) {
    return this.servicesService.updateService(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete service' })
  async deleteService(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.servicesService.deleteService(id, tenantId);
  }

  // Categories
  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.servicesService.createCategory(dto);
  }

  @Get('categories/list')
  @Public()
  @ApiOperation({ summary: 'Get categories by tenant' })
  async findCategories(@Query('tenantId') tenantId: string) {
    return this.servicesService.findCategoriesByTenant(tenantId);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: Partial<CreateCategoryDto>,
  ) {
    return this.servicesService.updateCategory(id, tenantId, dto);
  }
}
