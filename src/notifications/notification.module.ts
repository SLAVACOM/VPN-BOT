import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from 'prisma/prisma.module';
import { WireGuardService } from 'src/wireGuardService/WireGuardService.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [
    NotificationSchedulerService,
    NotificationService,
    WireGuardService,
  ],
  exports: [NotificationSchedulerService, NotificationService],
})
export class NotificationModule {}
