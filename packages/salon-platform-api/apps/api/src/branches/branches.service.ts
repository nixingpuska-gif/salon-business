import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity, BranchStatus, WorkingHours } from './entities/branch.entity';

export interface CreateBranchDto {
  tenantId: string;
  name: string;
  slug?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  timezone?: string;
  workingHours?: WorkingHours;
  isMain?: boolean;
}

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepo: Repository<BranchEntity>,
  ) {}

  async create(dto: CreateBranchDto): Promise<BranchEntity> {
    const branch = this.branchRepo.create({
      ...dto,
      status: BranchStatus.ACTIVE,
      workingHours: dto.workingHours || this.getDefaultWorkingHours(),
    });
    return this.branchRepo.save(branch);
  }

  async findById(id: string, tenantId: string): Promise<BranchEntity> {
    const branch = await this.branchRepo.findOne({
      where: { id, tenantId },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }

  async findByTenant(tenantId: string): Promise<BranchEntity[]> {
    return this.branchRepo.find({
      where: { tenantId, status: BranchStatus.ACTIVE },
      order: { isMain: 'DESC', name: 'ASC' },
    });
  }

  async update(id: string, tenantId: string, dto: Partial<CreateBranchDto>): Promise<BranchEntity> {
    const branch = await this.findById(id, tenantId);
    Object.assign(branch, dto);
    return this.branchRepo.save(branch);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const branch = await this.findById(id, tenantId);
    branch.status = BranchStatus.INACTIVE;
    await this.branchRepo.save(branch);
  }

  private getDefaultWorkingHours(): WorkingHours {
    const defaultDay = { isOpen: true, openTime: '09:00', closeTime: '20:00' };
    return {
      monday: defaultDay,
      tuesday: defaultDay,
      wednesday: defaultDay,
      thursday: defaultDay,
      friday: defaultDay,
      saturday: { isOpen: true, openTime: '10:00', closeTime: '18:00' },
      sunday: { isOpen: false },
    };
  }
}
