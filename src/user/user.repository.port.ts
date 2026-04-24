import type { User } from '@prisma/client';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export type UserPublic = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'createdAt' | 'updatedAt'
>;

export type CreateUserRecord = {
  name: string;
  email: string;
  password: string;
};

export interface UserRepositoryPort {
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserRecord): Promise<User>;
  findAllSafe(): Promise<UserPublic[]>;
  findByIdSafe(id: string): Promise<UserPublic | null>;
}
