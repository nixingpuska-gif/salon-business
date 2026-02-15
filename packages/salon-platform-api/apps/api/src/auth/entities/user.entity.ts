import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '../../database/entities/base.entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',     // Platform admin
  OWNER = 'OWNER',                  // Salon owner
  ADMIN = 'ADMIN',                  // Salon admin
  MANAGER = 'MANAGER',              // Branch manager
  EMPLOYEE = 'EMPLOYEE',            // Staff member
  CLIENT = 'CLIENT',                // Customer
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED',
}

@Entity('users')
@Index(['tenantId', 'email'], { unique: true, where: '"email" IS NOT NULL' })
@Index(['tenantId', 'phone'], { unique: true, where: '"phone" IS NOT NULL' })
export class UserEntity extends TenantBaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar: string | null;

  @Column({ length: 10, default: 'ru' })
  locale: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;

  @Column({ name: 'employee_id', type: 'uuid', nullable: true })
  employeeId: string | null;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ name: 'phone_verified_at', type: 'timestamp', nullable: true })
  phoneVerifiedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
