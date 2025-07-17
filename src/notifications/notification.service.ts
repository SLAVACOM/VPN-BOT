import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { PrismaService } from 'prisma/prisma.service';
import { escapeUserInput, safeMarkdown } from 'src/utils/format.utils';
import { Telegraf } from 'telegraf';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  /**
   * Отправляет персонализированное уведомление пользователю
   */
  async sendPersonalNotification(
    userId: number,
    message: string,
    options?: {
      parseMode?: 'Markdown' | 'HTML';
      replyMarkup?: any;
      logAction?: string;
    },
  ): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramId: true, isDeleted: true },
      });

      if (!user || user.isDeleted) {
        this.logger.warn(`Пользователь ${userId} не найден или удален`);
        return false;
      }

      await this.bot.telegram.sendMessage(
        user.telegramId.toString(),
        safeMarkdown(message),
        {
          parse_mode: options?.parseMode || 'Markdown',
          reply_markup: options?.replyMarkup,
        },
      );

      // Логируем событие если указан logAction
      if (options?.logAction) {
        await this.prisma.eventLog.create({
          data: {
            userId,
            action: options.logAction,
            metadata: {
              messageLength: message.length,
              sentAt: new Date().toISOString(),
            },
          },
        });
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Ошибка отправки уведомления пользователю ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Отправляет уведомление о успешном платеже
   */
  async sendPaymentSuccessNotification(
    userId: number,
    planName: string,
    days: number,
    newExpiryDate: Date,
  ): Promise<boolean> {
    const message = `🎉 *Платеж успешно обработан!*\n\n✅ Подписка активирована\n📦 План: ${escapeUserInput(planName)}\n⏰ Период: ${days} дней\n📅 Действует до: ${newExpiryDate.toLocaleDateString('ru-RU')}\n\n🚀 Теперь вы можете использовать VPN!`;

    return this.sendPersonalNotification(userId, message, {
      logAction: 'PAYMENT_SUCCESS_NOTIFICATION_SENT',
      replyMarkup: {
        inline_keyboard: [
          [
            { text: '📱 Получить QR-код', callback_data: 'qr' },
            { text: '📄 Скачать конфиг', callback_data: 'config' },
          ],
          [{ text: '🎛️ Главное меню', callback_data: 'back_to_menu' }],
        ],
      },
    });
  }

  /**
   * Отправляет уведомление о активации промокода
   */
  async sendPromoActivationNotification(
    userId: number,
    promoCode: string,
    daysAdded: number,
    newExpiryDate: Date,
  ): Promise<boolean> {
    const message = `🎫 *Промокод активирован!*\n\n✅ Код: ${escapeUserInput(promoCode)}\n⏰ Добавлено дней: ${daysAdded}\n📅 Подписка действует до: ${newExpiryDate.toLocaleDateString('ru-RU')}\n\n🎉 Приятного пользования VPN!`;

    return this.sendPersonalNotification(userId, message, {
      logAction: 'PROMO_ACTIVATION_NOTIFICATION_SENT',
    });
  }

  /**
   * Отправляет приветственное уведомление новому пользователю
   */
  async sendWelcomeNotification(
    userId: number,
    hasReferrer: boolean,
    referrerName?: string,
  ): Promise<boolean> {
    let message = `🎉 *Добро пожаловать в наш VPN-сервис!*\n\n🎁 Ваш пробный период на 7 дней уже активирован!\n📱 Используйте QR-код или скачайте конфигурацию для подключения\n\n🚀 *Что дальше?*\n• Скачайте приложение WireGuard\n• Добавьте нашу конфигурацию\n• Наслаждайтесь быстрым и безопасным интернетом!`;

    if (hasReferrer && referrerName) {
      message += `\n\n👥 Вы были приглашены пользователем ${referrerName}`;
    }

    return this.sendPersonalNotification(userId, message, {
      logAction: 'WELCOME_NOTIFICATION_SENT',
      replyMarkup: {
        inline_keyboard: [
          [
            { text: '📱 QR-код', callback_data: 'qr' },
            { text: '📄 Конфигурация', callback_data: 'config' },
          ],
          [{ text: '🎛️ Главное меню', callback_data: 'back_to_menu' }],
        ],
      },
    });
  }

  /**
   * Отправляет уведомление администратору о новой регистрации
   */
  async sendAdminRegistrationNotification(
    newUserId: number,
    userTelegramId: string,
    username?: string,
    firstName?: string,
    lastName?: string,
    referrerName?: string,
  ): Promise<boolean> {
    const adminIds =
      process.env.ADMIN_IDS?.split(',').map((id) => parseInt(id.trim())) || [];

    if (adminIds.length === 0) {
      this.logger.warn('ADMIN_IDS не настроены в переменных окружения');
      return false;
    }

    const displayName = username
      ? `@${escapeUserInput(username)}`
      : `${escapeUserInput(firstName || '')} ${escapeUserInput(lastName || '')}`.trim() ||
        'Без имени';

    let message = `👤 *Новая регистрация!*\n\n`;
    message += `🆔 ID пользователя: ${newUserId}\n`;
    message += `📱 Telegram ID: ${userTelegramId}\n`;
    message += `👋 Имя: ${displayName}\n`;
    message += `🎁 Пробный период: 7 дней\n`;
    message += `📅 Дата регистрации: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

    if (referrerName) {
      message += `\n👥 Пригласил: ${escapeUserInput(referrerName)}`;
    }

    let successCount = 0;
    for (const adminId of adminIds) {
      try {
        await this.bot.telegram.sendMessage(
          adminId.toString(),
          safeMarkdown(message),
          {
            parse_mode: 'Markdown',
          },
        );
        successCount++;
      } catch (error) {
        this.logger.error(
          `Ошибка отправки уведомления администратору ${adminId}:`,
          error,
        );
      }
    }

    // Логируем событие
    await this.prisma.eventLog.create({
      data: {
        userId: newUserId,
        action: 'ADMIN_REGISTRATION_NOTIFICATION_SENT',
        metadata: {
          adminCount: adminIds.length,
          successCount,
          userTelegramId,
          displayName,
          referrerName: referrerName || null,
        },
      },
    });

    return successCount > 0;
  }

  /**
   * Отправляет уведомление администратору о покупке
   */
  async sendAdminPurchaseNotification(
    userId: number,
    planName: string,
    amount: number,
    currency: string,
    paymentMethod: string,
    username?: string,
    firstName?: string,
    lastName?: string,
  ): Promise<boolean> {
    const adminIds =
      process.env.ADMIN_IDS?.split(',').map((id) => parseInt(id.trim())) || [];

    if (adminIds.length === 0) {
      this.logger.warn('ADMIN_IDS не настроены в переменных окружения');
      return false;
    }

    const displayName = username
      ? `@${escapeUserInput(username)}`
      : `${escapeUserInput(firstName || '')} ${escapeUserInput(lastName || '')}`.trim() ||
        'Без имени';

    let message = `💰 *Новая покупка!*\n\n`;
    message += `🆔 ID пользователя: ${userId}\n`;
    message += `👋 Имя: ${displayName}\n`;
    message += `📦 План: ${escapeUserInput(planName)}\n`;
    message += `💵 Сумма: ${amount} ${escapeUserInput(currency)}\n`;
    message += `💳 Способ оплаты: ${escapeUserInput(paymentMethod)}\n`;
    message += `📅 Дата покупки: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

    let successCount = 0;
    for (const adminId of adminIds) {
      try {
        await this.bot.telegram.sendMessage(
          adminId.toString(),
          safeMarkdown(message),
          {
            parse_mode: 'Markdown',
          },
        );
        successCount++;
      } catch (error) {
        this.logger.error(
          `Ошибка отправки уведомления администратору ${adminId}:`,
          error,
        );
      }
    }

    // Логируем событие
    await this.prisma.eventLog.create({
      data: {
        userId,
        action: 'ADMIN_PURCHASE_NOTIFICATION_SENT',
        metadata: {
          adminCount: adminIds.length,
          successCount,
          planName,
          amount,
          currency,
          paymentMethod,
          displayName,
        },
      },
    });

    return successCount > 0;
  }

  /**
   * Получает настройки уведомлений пользователя
   */
  async getUserNotificationSettings(userId: number) {
    // В будущем можно добавить таблицу настроек уведомлений
    // Пока возвращаем дефолтные настройки
    return {
      expiryReminders: true,
      paymentNotifications: true,
      promoNotifications: true,
      broadcastMessages: true,
    };
  }

  /**
   * Получает статистику уведомлений за период
   */
  async getNotificationStats(fromDate: Date, toDate: Date) {
    const stats = await this.prisma.eventLog.groupBy({
      by: ['action'],
      where: {
        timestamp: {
          gte: fromDate,
          lte: toDate,
        },
        action: {
          in: [
            'EXPIRY_REMINDER_SENT',
            'THREE_DAY_REMINDER_SENT',
            'WEEK_REMINDER_SENT',
            'EXPIRED_NOTIFICATION_SENT',
            'PAYMENT_SUCCESS_NOTIFICATION_SENT',
            'PROMO_ACTIVATION_NOTIFICATION_SENT',
            'WELCOME_NOTIFICATION_SENT',
            'BROADCAST_MESSAGE_SENT',
            'ADMIN_REGISTRATION_NOTIFICATION_SENT',
            'ADMIN_PURCHASE_NOTIFICATION_SENT',
          ],
        },
      },
      _count: {
        action: true,
      },
    });

    return stats.reduce(
      (acc, stat) => {
        acc[stat.action] = stat._count.action;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Планирует отложенное уведомление (для будущей реализации)
   */
  async scheduleDelayedNotification(
    userId: number,
    message: string,
    sendAt: Date,
    notificationType: string,
  ) {
    // В будущем можно добавить таблицу для отложенных уведомлений
    // И обрабатывать их в cron-задаче
    this.logger.log(
      `Запланировано уведомление для пользователя ${userId} на ${sendAt.toISOString()}`,
    );

    // Пока просто логируем
    await this.prisma.eventLog.create({
      data: {
        userId,
        action: 'NOTIFICATION_SCHEDULED',
        metadata: {
          scheduledFor: sendAt.toISOString(),
          notificationType,
          messageLength: message.length,
        },
      },
    });
  }
}
