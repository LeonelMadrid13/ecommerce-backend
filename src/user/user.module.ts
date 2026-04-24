import { Module } from '@nestjs/common';

import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository.js';
import { USER_REPOSITORY } from './user.repository.port.js';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    PrismaUserRepository,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
