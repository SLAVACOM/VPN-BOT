import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { WireGuardService } from './WireGuardService.service';

@Module({
  imports: [PrismaModule],
  providers: [WireGuardService],
  exports: [WireGuardService],
})
export class WireGuardModule {}
