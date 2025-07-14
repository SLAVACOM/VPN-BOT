import { Injectable } from '@nestjs/common';
import { Payment, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreatePaymentDto {
  userId: number;
  amount: number; // в копейках
  currency: string;
  method: string;
  status: string;
  planId?: number;
  telegramPaymentChargeId?: string;
  providerPaymentChargeId?: string;
  invoicePayload?: string;
  daysAdded?: number;
  description?: string;
  metadata?: any;
}

export interface UpdatePaymentDto {
  status?: string;
  telegramPaymentChargeId?: string;
  providerPaymentChargeId?: string;
  daysAdded?: number;
  description?: string;
  metadata?: any;
}

export interface PaymentWithRelations extends Payment {
  user: {
    id: number;
    telegramId: bigint;
    username: string | null;
  };
  plan?: {
    id: number;
    name: string;
    durationDays: number;
    price: bigint;
  } | null;
}

@Injectable()
export class PaymentHistoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Создать новую запись о платеже
   */
  async createPayment(dto: CreatePaymentDto): Promise<Payment> {
    const payment = await this.prisma.payment.create({
      data: {
        userId: dto.userId,
        amount: dto.amount,
        currency: dto.currency,
        method: dto.method,
        status: dto.status,
        planId: dto.planId,
        telegramPaymentChargeId: dto.telegramPaymentChargeId,
        providerPaymentChargeId: dto.providerPaymentChargeId,
        invoicePayload: dto.invoicePayload,
        daysAdded: dto.daysAdded,
        description: dto.description,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : Prisma.JsonNull,
      },
    });

    console.log(
      `[PAYMENT_HISTORY] Created payment record: ID=${payment.id}, user=${dto.userId}, amount=${dto.amount}, status=${dto.status}`,
    );
    return payment;
  }

  /**
   * Обновить запись о платеже
   */
  async updatePayment(
    paymentId: number,
    dto: UpdatePaymentDto,
  ): Promise<Payment> {
    const updateData: any = {};

    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.telegramPaymentChargeId !== undefined)
      updateData.telegramPaymentChargeId = dto.telegramPaymentChargeId;
    if (dto.providerPaymentChargeId !== undefined)
      updateData.providerPaymentChargeId = dto.providerPaymentChargeId;
    if (dto.daysAdded !== undefined) updateData.daysAdded = dto.daysAdded;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.metadata !== undefined)
      updateData.metadata = JSON.stringify(dto.metadata);

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
    });

    console.log(
      `[PAYMENT_HISTORY] Updated payment record: ID=${payment.id}, status=${payment.status}`,
    );
    return payment;
  }

  /**
   * Найти платеж по Telegram Payment Charge ID
   */
  async findByTelegramChargeId(telegramPaymentChargeId: string): Promise<any> {
    return this.prisma.payment.findFirst({
      where: { telegramPaymentChargeId } as any,
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            durationDays: true,
            price: true,
          },
        },
      },
    });
  }

  /**
   * Найти платеж по Invoice Payload
   */
  async findByInvoicePayload(invoicePayload: string): Promise<any> {
    return this.prisma.payment.findFirst({
      where: { invoicePayload } as any,
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            durationDays: true,
            price: true,
          },
        },
      },
    });
  }

  /**
   * Получить историю платежей пользователя
   */
  async getUserPaymentHistory(
    userId: number,
    limit = 10,
  ): Promise<PaymentWithRelations[]> {
    return this.prisma.payment.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            durationDays: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Получить статистику платежей
   */
  async getPaymentStatistics(startDate?: Date, endDate?: Date) {
    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [
      totalPayments,
      completedPayments,
      totalAmount,
      paymentsByStatus,
      paymentsByMethod,
      recentPayments,
    ] = await Promise.all([
      // Общее количество платежей
      this.prisma.payment.count({ where: whereClause }),

      // Количество успешных платежей
      this.prisma.payment.count({
        where: { ...whereClause, status: 'completed' },
      }),

      // Общая сумма успешных платежей
      this.prisma.payment.aggregate({
        where: { ...whereClause, status: 'completed' },
        _sum: { amount: true },
      }),

      // Группировка по статусам
      this.prisma.payment.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true },
        _sum: { amount: true },
      }),

      // Группировка по методам оплаты
      this.prisma.payment.groupBy({
        by: ['method'],
        where: whereClause,
        _count: { method: true },
        _sum: { amount: true },
      }),

      // Последние платежи
      this.prisma.payment.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
              username: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              durationDays: true,
              price: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalPayments,
      completedPayments,
      failedPayments: totalPayments - completedPayments,
      totalAmount: totalAmount._sum.amount || 0,
      averageAmount:
        completedPayments > 0
          ? (totalAmount._sum.amount || 0) / completedPayments
          : 0,
      paymentsByStatus,
      paymentsByMethod,
      recentPayments,
    };
  }

  /**
   * Получить все платежи (для админки)
   */
  async getAllPayments(
    page = 1,
    limit = 20,
    status?: string,
    method?: string,
    userId?: number,
  ): Promise<{
    payments: PaymentWithRelations[];
    total: number;
    totalPages: number;
  }> {
    const whereClause: any = {};

    if (status) whereClause.status = status;
    if (method) whereClause.method = method;
    if (userId) whereClause.userId = userId;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
              username: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              durationDays: true,
              price: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where: whereClause }),
    ]);

    return {
      payments,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Отметить платеж как завершенный
   */
  async markPaymentCompleted(
    paymentId: number,
    telegramPaymentChargeId: string,
    providerPaymentChargeId: string,
    daysAdded: number,
  ): Promise<Payment> {
    return this.updatePayment(paymentId, {
      status: 'completed',
      telegramPaymentChargeId,
      providerPaymentChargeId,
      daysAdded,
    });
  }

  /**
   * Отметить платеж как неудачный
   */
  async markPaymentFailed(
    paymentId: number,
    reason?: string,
  ): Promise<Payment> {
    return this.updatePayment(paymentId, {
      status: 'failed',
      description: reason,
    });
  }
}
