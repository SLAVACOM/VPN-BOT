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

  async createUser(
    telegramId: number,
    username?: string,
    config?: {
      wgPublicKey: string;
      wgPrivateKey: string;
      wgAddress: string;
      wgId: string;
    },
    invitedById?: number,
  ) {
    console.log(
      `[UserService] Creating user with TG ID: ${telegramId}, invitedById: ${invitedById}`,
    );

    const userData = {
      telegramId: BigInt(telegramId),
      username,
      wgPublicKey: config?.wgPublicKey,
      wgPrivateKey: config?.wgPrivateKey,
      wgAddress: config?.wgAddress,
      wgId: config?.wgId,
      invitedById: invitedById,
      configIssued: true,
    };

    console.log(`[UserService] User data to create:`, {
      ...userData,
      telegramId: userData.telegramId.toString(),
    });

    const createdUser = await this.prisma.user.create({
      data: userData,
    });

    console.log(`[UserService] User created successfully:`, {
      id: createdUser.id,
      telegramId: createdUser.telegramId.toString(),
      invitedById: createdUser.invitedById,
    });

    return createdUser;
  }

  async getReferralStats(userId: number) {
    console.log(`[UserService] Getting referral stats for user ID: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        invitedUsers: {
          select: {
            telegramId: true,
            username: true,
            createdAt: true,
          },
        },
      },
    });

    console.log(
      `[UserService] Found user:`,
      user
        ? `ID=${user.id}, invited count=${user.invitedUsers.length}`
        : 'not found',
    );

    return {
      totalInvited: user?.invitedUsers.length || 0,
      invitedUsers: user?.invitedUsers || [],
    };
  }

  async checkReferralConnection(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        invitedBy: {
          select: {
            id: true,
            username: true,
            telegramId: true,
          },
        },
      },
    });

    console.log(
      `[UserService] Checking referral connection for user ${userId}:`,
      user?.invitedBy
        ? `Invited by user ${user.invitedBy.id} (${user.invitedBy.username})`
        : 'No referrer',
    );

    return user;
  }

  async activatePromoCode(userId: number, promoCode: string) {
    console.log(
      `[UserService] Activating promo code ${promoCode} for user ${userId}`,
    );
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: promoCode },
    });

    if (!promo) {
      console.log(`[UserService] Promo code ${promoCode} not found`);
      return { success: false, message: 'Промокод не найден' };
    }

    if (!promo.isActive) {
      console.log(`[UserService] Promo code ${promoCode} is not active`);
      return { success: false, message: 'Промокод неактивен' };
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      console.log(`[UserService] Promo code ${promoCode} is expired`);
      return { success: false, message: 'Промокод истёк' };
    }

    if (promo.usedCount >= promo.maxUses) {
      console.log(`[UserService] Promo code ${promoCode} reached max uses`);
      return { success: false, message: 'Промокод исчерпан' };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { promoCodeUsed: true },
    });

    if (!user) {
      return { success: false, message: 'Пользователь не найден' };
    }

    if (user.promoCodeUsed) {
      console.log(
        `[UserService] User ${userId} already used promo code ${user.promoCodeUsed.code}`,
      );
      return {
        success: false,
        message: `Вы уже использовали промокод: ${user.promoCodeUsed.code}`,
      };
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Обновить пользователя
        const newSubscriptionEnd = new Date();
        newSubscriptionEnd.setDate(
          newSubscriptionEnd.getDate() + promo.discountDays,
        );

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            promoCodeUsedId: promo.id,
            subscriptionEnd:
              user.subscriptionEnd && user.subscriptionEnd > new Date()
                ? new Date(
                    user.subscriptionEnd.getTime() +
                      promo.discountDays * 24 * 60 * 60 * 1000,
                  )
                : newSubscriptionEnd,
          },
        });

        await tx.promoCode.update({
          where: { id: promo.id },
          data: { usedCount: { increment: 1 } },
        });

        await tx.eventLog.create({
          data: {
            userId,
            action: 'PROMO_CODE_ACTIVATED',
            metadata: {
              promoCode: promo.code,
              discountDays: promo.discountDays,
              newSubscriptionEnd: updatedUser.subscriptionEnd,
            },
          },
        });

        return updatedUser;
      });

      console.log(
        `[UserService] Promo code ${promoCode} activated successfully for user ${userId}`,
      );

      return {
        success: true,
        message: `Промокод активирован! Добавлено ${promo.discountDays} дней подписки`,
        discountDays: promo.discountDays,
        newSubscriptionEnd: result.subscriptionEnd,
      };
    } catch (error) {
      console.error('Error activating promo code:', error);
      return { success: false, message: 'Ошибка при активации промокода' };
    }
  }

  async getPromoCodeInfo(code: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code },
    });

    if (!promo) {
      return null;
    }

    return {
      code: promo.code,
      description: promo.description,
      discountDays: promo.discountDays,
      usedCount: promo.usedCount,
      maxUses: promo.maxUses,
      isActive: promo.isActive,
      expiresAt: promo.expiresAt,
    };
  }

  async getUserWithPromoCode(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        promoCodeUsed: true,
      },
    });

    return user;
  }

  async createPromoCode(data: {
    code: string;
    description?: string;
    discountDays: number;
    maxUses?: number;
    expiresAt?: Date;
  }) {
    console.log(`[UserService] Creating promo code: ${data.code}`);

    try {
      const promoCode = await this.prisma.promoCode.create({
        data: {
          code: data.code.toUpperCase(),
          description: data.description,
          discountDays: data.discountDays,
          maxUses: data.maxUses || 1000,
          expiresAt: data.expiresAt,
        },
      });

      console.log(`[UserService] Promo code created: ${promoCode.code}`);
      return { success: true, promoCode };
    } catch (error: any) {
      if (error.code === 'P2002') {
        return { success: false, message: 'Промокод уже существует' };
      }
      console.error('Error creating promo code:', error);
      return { success: false, message: 'Ошибка при создании промокода' };
    }
  }

  async listPromoCodes() {
    const promoCodes = await this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return promoCodes;
  }

  /**
   * Добавить дни подписки к пользователю (для платежей)
   */
  async addSubscriptionDays(
    userId: number,
    days: number,
    paymentId?: string,
  ): Promise<{ success: boolean; newSubscriptionEnd: Date | null }> {
    console.log(
      `[UserService] Adding ${days} days to user ${userId}, paymentId: ${paymentId}`,
    );

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        console.log(`[UserService] User ${userId} not found`);
        return { success: false, newSubscriptionEnd: null };
      }

      const now = new Date();
      let newSubscriptionEnd: Date;

      // Если у пользователя уже есть активная подписка, продлеваем её
      if (user.subscriptionEnd && user.subscriptionEnd > now) {
        newSubscriptionEnd = new Date(user.subscriptionEnd);
        newSubscriptionEnd.setDate(newSubscriptionEnd.getDate() + days);
      } else {
        // Если подписки нет или она истекла, создаём новую
        newSubscriptionEnd = new Date();
        newSubscriptionEnd.setDate(newSubscriptionEnd.getDate() + days);
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionEnd: newSubscriptionEnd,
        },
      });

      console.log(
        `[UserService] Subscription updated for user ${userId}, new end date: ${newSubscriptionEnd}`,
      );

      return { success: true, newSubscriptionEnd };
    } catch (error) {
      console.error('Error adding subscription days:', error);
      return { success: false, newSubscriptionEnd: null };
    }
  }

  /**
   * Проверить, есть ли у пользователя активная подписка
   */
  async hasActiveSubscription(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionEnd: true },
    });

    if (!user?.subscriptionEnd) {
      return false;
    }

    return user.subscriptionEnd > new Date();
  }

  /**
   * Получить информацию о подписке пользователя
   */
  async getSubscriptionInfo(userId: number): Promise<{
    isActive: boolean;
    endDate: Date | null;
    daysLeft: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionEnd: true },
    });

    if (!user?.subscriptionEnd) {
      return {
        isActive: false,
        endDate: null,
        daysLeft: 0,
      };
    }

    const now = new Date();
    const isActive = user.subscriptionEnd > now;
    const daysLeft = isActive
      ? Math.ceil(
          (user.subscriptionEnd.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    return {
      isActive,
      endDate: user.subscriptionEnd,
      daysLeft,
    };
  }
}
