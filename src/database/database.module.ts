import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DATABASE_CONNECTION } from './database.tokens.js';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useExisting: PrismaService,
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
