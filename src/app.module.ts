import { Module } from '@nestjs/common';
import { RateLimiterModule } from 'nestjs-rate-limiter';

import { AppController } from './app.controller.js';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service.js';
import { UserModule } from './user/user.module.js';
import { PrismaService } from './prisma/prisma.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProductModule } from './product/product.module.js';
import { OrderModule } from './order/order.module.js';
import { QueueModule } from './queue/queue.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    RateLimiterModule.register({
      points: 10,
      duration: 60,
    }),
    PrismaModule,
    AuthModule,
    ProductModule,
    OrderModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
