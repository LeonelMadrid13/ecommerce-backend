import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly userSafeSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  async createUser(data: { name: string; email: string; password: string }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new BadRequestException('Email already in use');

    const hashed = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: { ...data, password: hashed },
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: this.userSafeSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSafeSelect,
    });
    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
