import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global() // optional: makes PrismaService available in all modules
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
