import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findByTelegramId(telegramId: number) {
    return this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
  }

  async createUser(telegramId: number, username?: string) {
    return this.prisma.user.create({
      data: {
        telegramId: BigInt(telegramId),
        username,
      },
    });
  }
}
