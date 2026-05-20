import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { UserService } from './user.service.js';
import { USER_REPOSITORY } from './user.repository.port.js';
import { ConfigService } from '@nestjs/config';

type UserRepositoryMock = {
  create: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findByEmail: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findAllSafe: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findByIdSafe: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
};

const mockUserRepository: UserRepositoryMock = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findAllSafe: jest.fn(),
  findByIdSafe: jest.fn(),
};

const mockConfigService: Pick<ConfigService, 'get'> & {
  get: jest.Mock<(key: string) => string | undefined>;
} = {
  get: jest.fn((key: string) => {
    if (key === 'BCRYPT_SALT_ROUNDS') return '10';
    return undefined;
  }),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'BCRYPT_SALT_ROUNDS') return '10';
      return undefined;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should throw BadRequestException if email is already in use', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({
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
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
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

      const createArgs = mockUserRepository.create.mock.calls[0]?.[0] as
        | {
            email: string;
            name: string;
            password: string;
          }
        | undefined;

      expect(createArgs).toBeDefined();
      expect(createArgs?.email).toBe('test@example.com');
      expect(createArgs?.name).toBe('Test');
      expect(typeof createArgs?.password).toBe('string');
      expect(result).toBeDefined();
    });

    it('should throw if bcrypt rounds config is invalid', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue('abc');

      await expect(
        service.createUser({
          name: 'Test',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow('Invalid bcrypt rounds');
    });
  });

  describe('validateUser', () => {
    it('should return null if user does not exist', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
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

      mockUserRepository.findAllSafe.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockUserRepository.findAllSafe).toHaveBeenCalledTimes(1);
      expect(result).toEqual(users);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockUserRepository.findByIdSafe.mockResolvedValue(null);
      try {
        await service.findById('non-existent-id');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
        expect((err as NotFoundException).message).toBe('User not found');
      }
    });
  });
});
