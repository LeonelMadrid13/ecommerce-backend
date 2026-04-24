import type { PrismaService } from '../prisma/prisma.service.js';

export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');

export type DatabaseConnection = PrismaService;
