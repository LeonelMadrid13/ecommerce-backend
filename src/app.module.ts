import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service.js';
import { UserModule } from './user/user.module.js';
import { PrismaService } from './prisma/prisma.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProductModule } from './product/product.module.js';
<<<<<<< HEAD
import { OrderModule } from './order/order.module.js';
import { QueueModule } from './queue/queue.module.js';
=======
>>>>>>> 8fcf079e211a6783a28180b7f4947a15e547b241

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UserModule,
    PrismaModule,
    AuthModule,
    ProductModule,
<<<<<<< HEAD
    OrderModule,
    QueueModule,
=======
>>>>>>> 8fcf079e211a6783a28180b7f4947a15e547b241
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
