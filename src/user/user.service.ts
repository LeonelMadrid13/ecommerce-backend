import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from './user.repository.port.js';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async createUser(data: { name: string; email: string; password: string }) {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) throw new BadRequestException('Email already in use');

    const hashed = await bcrypt.hash(data.password, 10);
    return this.userRepository.create({ ...data, password: hashed });
  }

  async validateUser(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }

  async findAll() {
    return this.userRepository.findAllSafe();
  }

  async findById(id: string) {
    const user = await this.userRepository.findByIdSafe(id);
    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
