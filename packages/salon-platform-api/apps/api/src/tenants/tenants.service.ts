import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity, TenantStatus, TenantPlan } from './entities/tenant.entity';

export interface CreateTenantDto {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  locale?: string;
  currency?: string;
  timezone?: string;
}

export interface UpdateTenantDto {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  logo?: string;
  locale?: string;
  currency?: string;
  timezone?: string;
  settings?: Record<string, any>;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepo: Repository<TenantEntity>,
  ) {}

  async create(dto: CreateTenantDto): Promise<TenantEntity> {
    // Check slug uniqueness
    const existing = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException('Tenant with this slug already exists');
    }

    const tenant = this.tenantRepo.create({
      ...dto,
      status: TenantStatus.TRIAL,
      plan: TenantPlan.FREE,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
    });

    return this.tenantRepo.save(tenant);
  }

  async findById(id: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepo.findOne({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto): Promise<TenantEntity> {
    const tenant = await this.findById(id);
    Object.assign(tenant, dto);
    return this.tenantRepo.save(tenant);
  }

  async updatePlan(id: string, plan: TenantPlan): Promise<TenantEntity> {
    const tenant = await this.findById(id);
    tenant.plan = plan;
    tenant.status = TenantStatus.ACTIVE;
    return this.tenantRepo.save(tenant);
  }
}
