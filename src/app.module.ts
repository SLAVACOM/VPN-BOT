import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma.module';
import { AppController } from './app.controller';
import { BotModule } from './bot/bot.module';
import { RedisCacheModule } from './cache/cache.module';
import { PaymentModule } from './payment/payment.module';
import { UserModule } from './user/user.module';
import { WireGuardModule } from './wireGuardService/WireGuard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisCacheModule,
    BotModule,
    UserModule,
    PrismaModule,
    WireGuardModule,
    PaymentModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
