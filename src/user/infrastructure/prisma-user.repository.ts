import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateUserRecord,
  UserRepositoryPort,
} from '../user.repository.port.js';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  private readonly userSafeSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: CreateUserRecord) {
    return this.prisma.user.create({ data });
  }

  findAllSafe() {
    return this.prisma.user.findMany({
      select: this.userSafeSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdSafe(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.userSafeSelect,
    });
  }
}
