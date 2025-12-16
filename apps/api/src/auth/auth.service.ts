import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity, UserRole, UserStatus } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';

export interface TokenPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
  email?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterDto {
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role?: UserRole;
}

export interface LoginDto {
  tenantId: string;
  email?: string;
  phone?: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: UserEntity; tokens: AuthTokens }> {
    // Check if user exists
    const existing = await this.userRepo.findOne({
      where: [
        { tenantId: dto.tenantId, email: dto.email },
        { tenantId: dto.tenantId, phone: dto.phone },
      ].filter(w => w.email || w.phone),
    });

    if (existing) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = this.userRepo.create({
      tenantId: dto.tenantId,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: dto.role || UserRole.CLIENT,
      status: UserStatus.ACTIVE,
    });

    await this.userRepo.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Remove password from response
    delete (user as any).passwordHash;

    return { user, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: UserEntity; tokens: AuthTokens }> {
    console.log('Login attempt:', { tenantId: dto.tenantId, email: dto.email, phone: dto.phone });
    
    // Find user
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.tenantId = :tenantId', { tenantId: dto.tenantId })
      .andWhere(dto.email ? 'u.email = :email' : 'u.phone = :phone', 
        dto.email ? { email: dto.email } : { phone: dto.phone })
      .getOne();

    console.log('User found:', user ? 'YES' : 'NO');
    if (!user) {
      console.log('User not found for tenantId:', dto.tenantId, 'email:', dto.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isValid = await bcrypt.compare(dto.password, user.passwordHash || '');
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Remove password from response
    delete (user as any).passwordHash;

    return { user, tokens };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(payload: TokenPayload): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { id: payload.sub } });
  }

  private async generateTokens(user: UserEntity): Promise<AuthTokens> {
    const payload: TokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email || undefined,
    };

    const expiresIn = 15 * 60; // 15 minutes

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken, expiresIn };
  }
}
