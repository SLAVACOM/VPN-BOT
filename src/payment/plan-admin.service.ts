import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreatePlanDto {
  name: string;
  durationDays: number;
  price: number; // в копейках
  currency: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePlanDto {
  name?: string;
  durationDays?: number;
  price?: number; // в копейках
  currency?: string;
  description?: string;
  isActive?: boolean;
}

@Injectable()
export class PlanAdminService {
  private readonly CACHE_KEY_PLANS = 'payment_plans';

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private prisma: PrismaService,
  ) {}

  /**
   * Создать новый план (админский метод)
   */
  async createPlan(dto: CreatePlanDto): Promise<SubscriptionPlan> {
    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        durationDays: dto.durationDays,
        price: BigInt(dto.price),
        currency: dto.currency,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });

    // Очищаем кэш после создания
    await this.clearPlansCache();

    console.log(`[ADMIN] Created new plan: ${plan.name} (ID: ${plan.id})`);
    return plan;
  }

  /**
   * Обновить план (админский метод)
   */
  async updatePlan(
    planId: number,
    dto: UpdatePlanDto,
  ): Promise<SubscriptionPlan> {
    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.durationDays !== undefined)
      updateData.durationDays = dto.durationDays;
    if (dto.price !== undefined) updateData.price = BigInt(dto.price);
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: updateData,
    });

    // Очищаем кэш после обновления
    await this.clearPlansCache();

    console.log(`[ADMIN] Updated plan: ${plan.name} (ID: ${plan.id})`);
    return plan;
  }

  /**
   * Удалить план (деактивировать)
   */
  async deletePlan(planId: number): Promise<SubscriptionPlan> {
    const plan = await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { isActive: false },
    });

    // Очищаем кэш после деактивации
    await this.clearPlansCache();

    console.log(`[ADMIN] Deactivated plan: ${plan.name} (ID: ${plan.id})`);
    return plan;
  }

  /**
   * Получить все планы (включая неактивные) для админки
   */
  async getAllPlans(): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { durationDays: 'asc' },
    });
  }

  /**
   * Получить статистику по планам
   */
  async getPlansStatistics() {
    const [totalPlans, activePlans, payments] = await Promise.all([
      this.prisma.subscriptionPlan.count(),
      this.prisma.subscriptionPlan.count({ where: { isActive: true } }),
      this.prisma.payment.groupBy({
        by: ['planId'],
        _count: { planId: true },
        _sum: { amount: true },
        where: {
          status: 'completed',
          planId: { not: null },
        },
      }),
    ]);

    return {
      totalPlans,
      activePlans,
      inactivePlans: totalPlans - activePlans,
      paymentsByPlan: payments,
    };
  }

  /**
   * Очистить кэш планов
   */
  private async clearPlansCache(): Promise<void> {
    await this.cacheManager.del(this.CACHE_KEY_PLANS);
    console.log('[ADMIN] Plans cache cleared');
  }
}
