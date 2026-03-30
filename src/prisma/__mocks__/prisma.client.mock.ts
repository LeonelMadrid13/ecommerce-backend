import { jest } from '@jest/globals';

export const PrismaClient = jest.fn().mockImplementation(() => ({
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  product: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  order: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  orderItem: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
}));

export const Prisma = {
  PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, { code }: { code: string }) {
      super(message);
      this.code = code;
      this.name = 'PrismaClientKnownRequestError';
    }
  },
};
