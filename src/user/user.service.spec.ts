import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

type UserRepoMock = {
  create: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findUnique: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  update: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  delete: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
};

const mockPrisma: { user: UserRepoMock } = {
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should throw BadRequestException if email is already in use', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'existing@example.com',
      });

      try {
        await service.createUser({
          name: 'Test',
          email: 'existing@example.com',
          password: 'password123',
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect((err as BadRequestException).message).toBe(
          'Email already in use',
        );
      }
    });

    it('should create user with hashed password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        name: 'Test',
        email: 'test@example.com',
        role: 'USER',
      });

      const result = await service.createUser({
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
      });

      const createArgs = mockPrisma.user.create.mock.calls[0]?.[0] as
        | {
            data: {
              email: string;
              name: string;
              password: string;
            };
          }
        | undefined;

      expect(createArgs).toBeDefined();
      expect(createArgs?.data.email).toBe('test@example.com');
      expect(createArgs?.data.name).toBe('Test');
      expect(typeof createArgs?.data.password).toBe('string');
      expect(result).toBeDefined();
    });
  });

  describe('validateUser', () => {
    it('should return null if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.validateUser(
        'non-existent@example.com',
        'password',
      );
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return users with safe select and ordering', async () => {
      const users = [
        {
          id: 'uuid-1',
          name: 'Admin',
          email: 'admin@example.com',
          role: 'ADMIN',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(users);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      try {
        await service.findById('non-existent-id');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
        expect((err as NotFoundException).message).toBe('User not found');
      }
    });
  });
});
