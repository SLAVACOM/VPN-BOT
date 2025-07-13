import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisCacheModule } from '../cache/cache.module';
import { PaymentHistoryService } from './payment-history.service';
import { PaymentService } from './payment.service';
import { PlanAdminService } from './plan-admin.service';

@Module({
  imports: [RedisCacheModule, PrismaModule],
  providers: [PaymentService, PaymentHistoryService, PlanAdminService],
  exports: [PaymentService, PaymentHistoryService, PlanAdminService],
})
export class PaymentModule {}
