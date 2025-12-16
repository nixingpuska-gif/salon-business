import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BranchesService, CreateBranchDto } from './branches.service';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @ApiOperation({ summary: 'Create branch' })
  async create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get branches by tenant' })
  async findByTenant(@Query('tenantId') tenantId: string) {
    return this.branchesService.findByTenant(tenantId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get branch by ID' })
  async findById(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.branchesService.findById(id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update branch' })
  async update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: Partial<CreateBranchDto>,
  ) {
    return this.branchesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete branch' })
  async delete(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.branchesService.delete(id, tenantId);
  }
}
