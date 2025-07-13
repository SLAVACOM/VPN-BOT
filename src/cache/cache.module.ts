import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        ttl: 60 * 60 * 24, // 24 часа по умолчанию
        max: 1000, // максимальное количество ключей в кэше
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
