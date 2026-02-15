import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClientsService, CreateClientDto, UpdateClientDto } from './clients.service';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create client' })
  async create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search clients' })
  async search(
    @Query('tenantId') tenantId: string,
    @Query('q') query: string,
  ) {
    return this.clientsService.search(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  async findById(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.clientsService.findById(id, tenantId);
  }

  @Get('phone/:phone')
  @Public()
  @ApiOperation({ summary: 'Get client by phone' })
  async findByPhone(
    @Param('phone') phone: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.clientsService.findByPhone(tenantId, phone);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update client' })
  async update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, tenantId, dto);
  }
}
