import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.client.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.client.user.create({
      data: { email: dto.email, password: hashed },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token: this.jwtService.sign({ sub: user.id, email: user.email }),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.client.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token: this.jwtService.sign({ sub: user.id, email: user.email }),
    };
  }

  async getMe(userId: number) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }
}
