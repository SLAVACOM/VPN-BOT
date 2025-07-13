import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateInvoiceResult,
  PaymentCallbackData,
  PaymentPlan,
} from './interfaces';
import { PaymentHistoryService } from './payment-history.service';

@Injectable()
export class PaymentService {
  private readonly providerToken: string;
  private readonly CACHE_KEY_PLANS = 'payment_plans';
  private readonly CACHE_TTL = 0;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private prisma: PrismaService,
    private paymentHistoryService: PaymentHistoryService,
  ) {
    this.providerToken = process.env.TELEGRAM_PAYMENT_PROVIDER_TOKEN || '';

    if (!this.providerToken) {
      console.warn(
        '[PAYMENT] Telegram payment provider token not found in environment variables',
      );
      console.warn(
        '[PAYMENT] Set TELEGRAM_PAYMENT_PROVIDER_TOKEN to enable payments',
      );
    } else {
      console.log(
        '[PAYMENT] Telegram Payments service initialized with database and Redis cache',
      );
    }
  }

  /**
   * Преобразовать план из базы данных в формат PaymentPlan
   */
  private transformDatabasePlan(dbPlan: SubscriptionPlan): PaymentPlan {
    return {
      id: dbPlan.id.toString(),
      name: dbPlan.name,
      description:
        dbPlan.description || `${dbPlan.durationDays} дней VPN доступа`,
      price: Number(dbPlan.price),
      days: dbPlan.durationDays,
      popular: dbPlan.name.includes('Стандарт'), // Можно добавить поле в БД
    };
  }

  /**
   * Получить все доступные планы с кэшированием
   */
  async getPlans(): Promise<PaymentPlan[]> {
    try {
      // Попытаемся получить из кэша
      const cachedPlans = await this.cacheManager.get<PaymentPlan[]>(
        this.CACHE_KEY_PLANS,
      );

      if (cachedPlans) {
        console.log('[PAYMENT] Plans loaded from cache');
        return cachedPlans;
      }

      // Если в кэше нет, получаем из базы данных
      console.log('[PAYMENT] Loading plans from database');
      const dbPlans = await this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { durationDays: 'asc' },
      });

      const plans = dbPlans.map((plan) => this.transformDatabasePlan(plan));

      // Сохраняем в кэш
      await this.cacheManager.set(this.CACHE_KEY_PLANS, plans, this.CACHE_TTL);
      console.log('[PAYMENT] Plans cached for', this.CACHE_TTL, 'seconds');

      return plans;
    } catch (error) {
      console.error('[PAYMENT] Error loading plans:', error);
      // Возвращаем пустой массив или fallback планы
      return [];
    }
  }

  /**
   * Получить план по ID с кэшированием
   */
  async getPlanById(planId: string): Promise<PaymentPlan | undefined> {
    const plans = await this.getPlans();
    return plans.find((plan) => plan.id === planId);
  }

  /**
   * Очистить кэш планов (для админских операций)
   */
  async clearPlansCache(): Promise<void> {
    await this.cacheManager.del(this.CACHE_KEY_PLANS);
    console.log('[PAYMENT] Plans cache cleared');
  }

  /**
   * Создать invoice для Telegram Payments
   */
  async createInvoice(
    userId: number,
    planId: string,
  ): Promise<CreateInvoiceResult> {
    if (!this.providerToken) {
      return {
        success: false,
        message: 'Сервис платежей недоступен. Обратитесь к администратору.',
      };
    }

    const plan = await this.getPlanById(planId);
    if (!plan) {
      return {
        success: false,
        message: 'Выбранный план не найден.',
      };
    }

    try {
      // Создаем уникальный payload для отслеживания платежа
      const invoicePayload = `${userId}_${planId}_${Date.now()}`;

      // Создаем запись о платеже в статусе pending
      const paymentRecord = await this.paymentHistoryService.createPayment({
        userId,
        amount: plan.price,
        currency: 'RUB',
        method: 'telegram_payments',
        status: 'pending',
        planId: parseInt(planId),
        invoicePayload,
        description: `Оплата плана: ${plan.name}`,
        metadata: {
          planName: plan.name,
          planDays: plan.days,
          createTimestamp: Date.now(),
        },
      });

      console.log('[PAYMENT] Creating invoice:', {
        userId,
        planId,
        amount: plan.price,
        invoicePayload,
        paymentRecordId: paymentRecord.id,
      });

      return {
        success: true,
        invoicePayload,
      };
    } catch (error) {
      console.error('[PAYMENT] Error creating invoice:', error);
      return {
        success: false,
        message: 'Произошла ошибка при создании счета. Попробуйте позже.',
      };
    }
  }

  /**
   * Обработать успешный платеж
   */
  async handleSuccessfulPayment(
    telegramPaymentChargeId: string,
    providerPaymentChargeId: string,
    invoicePayload: string,
    totalAmount: number,
    currency: string,
  ): Promise<PaymentCallbackData | null> {
    try {
      console.log('[PAYMENT] Processing successful payment:', {
        telegramPaymentChargeId,
        providerPaymentChargeId,
        invoicePayload,
        totalAmount,
        currency,
      });

      // Ищем существующую запись о платеже по payload
      const existingPayment =
        await this.paymentHistoryService.findByInvoicePayload(invoicePayload);

      if (existingPayment) {
        // Обновляем существующую запись
        await this.paymentHistoryService.updatePayment(existingPayment.id, {
          status: 'completed',
          telegramPaymentChargeId,
          providerPaymentChargeId,
          metadata: {
            completedTimestamp: Date.now(),
            actualAmount: totalAmount,
            actualCurrency: currency,
          },
        });

        console.log(
          '[PAYMENT] Updated existing payment record:',
          existingPayment.id,
        );
      } else {
        console.warn(
          '[PAYMENT] No existing payment record found for payload:',
          invoicePayload,
        );
      }

      // Разбираем payload для получения информации о пользователе и плане
      const payloadParts = invoicePayload.split('_');
      const userId = payloadParts[0];
      const planId = payloadParts.slice(1, -1).join('_'); // Объединяем все части кроме первой и последней

      if (!userId || !planId) {
        console.error('[PAYMENT] Invalid invoice payload:', invoicePayload);
        return null;
      }

      return {
        telegramPaymentChargeId,
        providerPaymentChargeId,
        userId: parseInt(userId),
        planId,
        totalAmount,
        currency,
      };
    } catch (error) {
      console.error('[PAYMENT] Error handling successful payment:', error);
      return null;
    }
  }

  /**
   * Получить токен провайдера платежей
   */
  getProviderToken(): string {
    return this.providerToken;
  }

  /**
   * Получить красивый список планов для отображения
   */
  async getPlansText(): Promise<string> {
    const plans = await this.getPlans();
    let text = '💰 **Планы подписки:**\n\n';

    plans.forEach((plan, index) => {
      const popular = plan.popular ? ' 🔥 **ПОПУЛЯРНЫЙ**' : '';
      const priceRub = plan.price / 100; // конвертируем копейки в рубли
      const pricePerDay = Math.round(priceRub / plan.days);

      text += `**${plan.name}**${popular}\n`;
      text += `${plan.description}\n`;
      text += `💵 ${priceRub} ₽ (${pricePerDay} ₽/день)\n`;
      text += `⏰ ${plan.days} дней\n`;

      if (index < plans.length - 1) {
        text += '\n';
      }
    });

    return text;
  }
}
