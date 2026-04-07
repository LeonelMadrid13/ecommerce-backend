import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService, RolesGuard],
  exports: [UserService],
})
export class UserModule {}
