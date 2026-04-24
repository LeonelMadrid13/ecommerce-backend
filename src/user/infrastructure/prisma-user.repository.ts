import { Inject, Injectable } from '@nestjs/common';

import {
  DATABASE_CONNECTION,
  type DatabaseConnection,
} from '../../database/database.tokens.js';
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

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: DatabaseConnection,
  ) {}

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  create(data: CreateUserRecord) {
    return this.db.user.create({ data });
  }

  findAllSafe() {
    return this.db.user.findMany({
      select: this.userSafeSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdSafe(id: string) {
    return this.db.user.findUnique({
      where: { id },
      select: this.userSafeSelect,
    });
  }
}
