import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientEntity, ClientStatus, ClientSource } from './entities/client.entity';

export interface CreateClientDto {
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  birthday?: Date;
  gender?: string;
  notes?: string;
  source?: ClientSource;
  telegramId?: number;
  telegramUsername?: string;
}

export interface UpdateClientDto {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  birthday?: Date;
  gender?: string;
  notes?: string;
  tags?: string[];
  preferredEmployeeId?: string;
  preferredBranchId?: string;
  marketingConsent?: boolean;
  smsConsent?: boolean;
  emailConsent?: boolean;
}

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientRepo: Repository<ClientEntity>,
  ) {}

  async create(dto: CreateClientDto): Promise<ClientEntity> {
    // Check for existing client by phone or email
    if (dto.phone || dto.email) {
      const whereConditions: { tenantId: string; phone?: string; email?: string }[] = [];
      if (dto.phone) whereConditions.push({ tenantId: dto.tenantId, phone: dto.phone });
      if (dto.email) whereConditions.push({ tenantId: dto.tenantId, email: dto.email });
      const existing = whereConditions.length > 0 
        ? await this.clientRepo.findOne({ where: whereConditions })
        : null;
      if (existing) {
        throw new ConflictException('Client with this phone or email already exists');
      }
    }

    const client = this.clientRepo.create({
      ...dto,
      status: ClientStatus.ACTIVE,
      source: dto.source || ClientSource.ONLINE_BOOKING,
    });
    return this.clientRepo.save(client);
  }

  async findById(id: string, tenantId: string): Promise<ClientEntity> {
    const client = await this.clientRepo.findOne({
      where: { id, tenantId },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async findByPhone(tenantId: string, phone: string): Promise<ClientEntity | null> {
    return this.clientRepo.findOne({
      where: { tenantId, phone },
    });
  }

  async findByTelegram(tenantId: string, telegramId: number): Promise<ClientEntity | null> {
    return this.clientRepo.findOne({
      where: { tenantId, telegramId },
    });
  }

  async findOrCreateByPhone(tenantId: string, phone: string, name: string): Promise<ClientEntity> {
    let client = await this.findByPhone(tenantId, phone);
    if (!client) {
      client = await this.create({ tenantId, phone, name, source: ClientSource.PHONE });
    }
    return client;
  }

  async findOrCreateByTelegram(
    tenantId: string,
    telegramId: number,
    name: string,
    username?: string,
  ): Promise<ClientEntity> {
    let client = await this.findByTelegram(tenantId, telegramId);
    if (!client) {
      client = await this.create({
        tenantId,
        telegramId,
        telegramUsername: username,
        name,
        source: ClientSource.TELEGRAM,
      });
    }
    return client;
  }

  async search(tenantId: string, query: string): Promise<ClientEntity[]> {
    return this.clientRepo
      .createQueryBuilder('client')
      .where('client.tenantId = :tenantId', { tenantId })
      .andWhere('client.status = :status', { status: ClientStatus.ACTIVE })
      .andWhere(
        '(client.name ILIKE :query OR client.phone ILIKE :query OR client.email ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('client.name', 'ASC')
      .limit(20)
      .getMany();
  }

  async update(id: string, tenantId: string, dto: UpdateClientDto): Promise<ClientEntity> {
    const client = await this.findById(id, tenantId);
    Object.assign(client, dto);
    return this.clientRepo.save(client);
  }

  async recordVisit(id: string, tenantId: string, amount: number): Promise<void> {
    await this.clientRepo
      .createQueryBuilder()
      .update(ClientEntity)
      .set({
        totalVisits: () => 'total_visits + 1',
        totalSpent: () => `total_spent + ${amount}`,
        lastVisitAt: new Date(),
      })
      .where('id = :id AND tenantId = :tenantId', { id, tenantId })
      .execute();
  }

  async recordNoShow(id: string, tenantId: string): Promise<void> {
    await this.clientRepo
      .createQueryBuilder()
      .update(ClientEntity)
      .set({ noShows: () => 'no_shows + 1' })
      .where('id = :id AND tenantId = :tenantId', { id, tenantId })
      .execute();
  }
}
