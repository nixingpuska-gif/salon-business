import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingService, CreateAppointmentDto, AvailableSlotsQuery } from './booking.service';
import { JwtAuthGuard, Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Booking')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('appointments')
  @Public()
  @ApiOperation({ summary: 'Create new appointment' })
  @ApiResponse({ status: 201, description: 'Appointment created' })
  @ApiResponse({ status: 409, description: 'Time slot not available' })
  async createAppointment(@Body() dto: CreateAppointmentDto) {
    return this.bookingService.createAppointment(dto);
  }

  @Get('slots')
  @Public()
  @ApiOperation({ summary: 'Get available time slots' })
  @ApiResponse({ status: 200, description: 'Available slots returned' })
  async getAvailableSlots(
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId: string,
    @Query('employeeId') employeeId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.bookingService.getAvailableSlots({
      tenantId,
      branchId,
      employeeId,
      serviceId,
      date: new Date(date),
    });
  }

  @Put('appointments/:id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm appointment' })
  async confirmAppointment(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.bookingService.confirmAppointment(id, tenantId);
  }

  @Put('appointments/:id/cancel')
  @Public()
  @ApiOperation({ summary: 'Cancel appointment' })
  async cancelAppointment(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body('reason') reason?: string,
  ) {
    return this.bookingService.cancelAppointment(id, tenantId, reason);
  }

  @Get('appointments/client/:clientId')
  @Public()
  @ApiOperation({ summary: 'Get client appointments' })
  async getClientAppointments(
    @Param('clientId') clientId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.bookingService.getAppointmentsByClient(tenantId, clientId);
  }

  @Get('appointments/employee/:employeeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get employee appointments' })
  async getEmployeeAppointments(
    @Param('employeeId') employeeId: string,
    @Query('tenantId') tenantId: string,
    @Query('date') date?: string,
  ) {
    return this.bookingService.getAppointmentsByEmployee(
      tenantId,
      employeeId,
      date ? new Date(date) : undefined,
    );
  }
}
