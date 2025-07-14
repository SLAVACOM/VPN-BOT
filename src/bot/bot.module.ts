import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { NotificationModule } from 'src/notifications/notification.module';
import { PaymentModule } from 'src/payment/payment.module';
import { UserService } from 'src/user/user.service';
import { WireGuardService } from 'src/wireGuardService/WireGuardService.service';
import { BotUpdate } from './bot.update';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        token: config.get<string>('BOT_TOKEN')!,
      }),
      inject: [ConfigService],
    }),
    PaymentModule,
    NotificationModule,
  ],
  providers: [BotUpdate, UserService, WireGuardService],
})
export class BotModule {}
