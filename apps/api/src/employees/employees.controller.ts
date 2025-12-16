import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmployeesService, CreateEmployeeDto, UpdateEmployeeDto } from './employees.service';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({ summary: 'Create employee' })
  async create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get employees by tenant' })
  async findByTenant(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.employeesService.findByTenant(tenantId, branchId);
  }

  @Get('by-service/:serviceId')
  @Public()
  @ApiOperation({ summary: 'Get employees by service' })
  async findByService(
    @Param('serviceId') serviceId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.employeesService.findByService(tenantId, serviceId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get employee by ID' })
  async findById(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.employeesService.findById(id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update employee' })
  async update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete employee' })
  async delete(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.employeesService.delete(id, tenantId);
  }
}
