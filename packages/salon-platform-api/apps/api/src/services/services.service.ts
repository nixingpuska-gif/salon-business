import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceEntity, ServiceCategoryEntity, ServiceStatus } from './entities/service.entity';

export interface CreateServiceDto {
  tenantId: string;
  branchId?: string;
  name: string;
  description?: string;
  categoryId?: string;
  price: number;
  priceFrom?: number;
  priceTo?: number;
  currency?: string;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  image?: string;
  isOnlineBookingEnabled?: boolean;
  requiresDeposit?: boolean;
  depositAmount?: number;
  depositPercent?: number;
}

export interface CreateCategoryDto {
  tenantId: string;
  branchId?: string;
  name: string;
  description?: string;
  parentId?: string;
  image?: string;
}

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly serviceRepo: Repository<ServiceEntity>,
    @InjectRepository(ServiceCategoryEntity)
    private readonly categoryRepo: Repository<ServiceCategoryEntity>,
  ) {}

  // Services
  async createService(dto: CreateServiceDto): Promise<ServiceEntity> {
    const service = this.serviceRepo.create({
      ...dto,
      status: ServiceStatus.ACTIVE,
      currency: dto.currency || 'RUB',
    });
    return this.serviceRepo.save(service);
  }

  async findServiceById(id: string, tenantId: string): Promise<ServiceEntity> {
    const service = await this.serviceRepo.findOne({
      where: { id, tenantId },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async findServicesByTenant(tenantId: string, branchId?: string): Promise<ServiceEntity[]> {
    const where: any = { tenantId, status: ServiceStatus.ACTIVE };
    if (branchId) {
      where.branchId = branchId;
    }
    return this.serviceRepo.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findServicesByCategory(tenantId: string, categoryId: string): Promise<ServiceEntity[]> {
    return this.serviceRepo.find({
      where: { tenantId, categoryId, status: ServiceStatus.ACTIVE },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async updateService(id: string, tenantId: string, dto: Partial<CreateServiceDto>): Promise<ServiceEntity> {
    const service = await this.findServiceById(id, tenantId);
    Object.assign(service, dto);
    return this.serviceRepo.save(service);
  }

  async deleteService(id: string, tenantId: string): Promise<void> {
    const service = await this.findServiceById(id, tenantId);
    service.status = ServiceStatus.INACTIVE;
    await this.serviceRepo.save(service);
  }

  // Categories
  async createCategory(dto: CreateCategoryDto): Promise<ServiceCategoryEntity> {
    const category = this.categoryRepo.create({
      ...dto,
      isActive: true,
    });
    return this.categoryRepo.save(category);
  }

  async findCategoriesByTenant(tenantId: string): Promise<ServiceCategoryEntity[]> {
    return this.categoryRepo.find({
      where: { tenantId, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async updateCategory(id: string, tenantId: string, dto: Partial<CreateCategoryDto>): Promise<ServiceCategoryEntity> {
    const category = await this.categoryRepo.findOne({ where: { id, tenantId } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }
}
