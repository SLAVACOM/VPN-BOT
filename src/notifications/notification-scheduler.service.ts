import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectBot } from 'nestjs-telegraf';
import { PrismaService } from 'prisma/prisma.service';
import { WireGuardService } from 'src/wireGuardService/WireGuardService.service';
import { Telegraf } from 'telegraf';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectBot() private readonly bot: Telegraf,
    private readonly wireGuardService: WireGuardService,
  ) {}

  /**
   * Проверяет подписки, которые истекают завтра и отправляет уведомления
   * Запускается каждый день в 10:00
   */
  @Cron('0 10 * * *', {
    name: 'subscription-expiry-reminder',
    timeZone: 'Europe/Moscow',
  })
  async sendExpiryReminders() {
    this.logger.log('🔔 Запуск проверки истекающих подписок...');

    try {
      // Находим подписки, которые истекают завтра
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      dayAfterTomorrow.setHours(0, 0, 0, 0);

      const expiringUsers = await this.prisma.user.findMany({
        where: {
          subscriptionEnd: {
            gte: tomorrow,
            lt: dayAfterTomorrow,
          },
          isDeleted: false,
        },
        select: {
          id: true,
          telegramId: true,
          username: true,
          subscriptionEnd: true,
          promoCodeUsedId: true,
          createdAt: true,
        },
      });

      this.logger.log(
        `📊 Найдено пользователей с истекающими подписками: ${expiringUsers.length}`,
      );

      if (expiringUsers.length === 0) {
        this.logger.log('✅ Нет пользователей с истекающими завтра подписками');
        return;
      }

      let sentCount = 0;
      let errorCount = 0;

      for (const user of expiringUsers) {
        try {
          // Определяем тип подписки
          const isTrialPeriod = this.isUserTrialPeriod(user);

          let message: string;
          if (isTrialPeriod) {
            message = this.getTrialExpiryMessage(user);
          } else {
            message = this.getSubscriptionExpiryMessage(user);
          }

          await this.bot.telegram.sendMessage(
            user.telegramId.toString(),
            message,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '💰 Продлить подписку',
                      callback_data: 'buy_subscription',
                    },
                    {
                      text: '🎫 Ввести промокод',
                      callback_data: 'enter_promo',
                    },
                  ],
                  [
                    {
                      text: '📋 Проверить подписку',
                      callback_data: 'subscription',
                    },
                  ],
                ],
              },
            },
          );

          // Логируем событие
          await this.prisma.eventLog.create({
            data: {
              userId: user.id,
              action: 'EXPIRY_REMINDER_SENT',
              metadata: {
                expiryDate: user.subscriptionEnd?.toISOString(),
                isTrialPeriod,
                reminderType: 'one_day_before',
              },
            },
          });

          sentCount++;
          this.logger.log(
            `✅ Отправлено напоминание пользователю ${user.telegramId}`,
          );

          // Небольшая задержка между отправками
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          errorCount++;
          this.logger.error(
            `❌ Ошибка отправки напоминания пользователю ${user.telegramId}:`,
            error,
          );
        }
      }

      this.logger.log(
        `📈 Результат рассылки: отправлено ${sentCount}, ошибок ${errorCount}`,
      );
    } catch (error) {
      this.logger.error('❌ Ошибка в планировщике напоминаний:', error);
    }
  }

  /**
   * Проверяет подписки, которые истекают через 3 дня и отправляет напоминания
   * Запускается каждый день в 11:00
   */
  @Cron('0 11 * * *', {
    name: 'subscription-3day-reminder',
    timeZone: 'Europe/Moscow',
  })
  async sendThreeDayReminders() {
    this.logger.log('🔔 Запуск проверки подписок, истекающих через 3 дня...');

    try {
      // Находим подписки, которые истекают через 3 дня
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(0, 0, 0, 0);

      const fourDaysFromNow = new Date(threeDaysFromNow);
      fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 1);

      const expiringUsers = await this.prisma.user.findMany({
        where: {
          subscriptionEnd: {
            gte: threeDaysFromNow,
            lt: fourDaysFromNow,
          },
          isDeleted: false,
        },
        select: {
          id: true,
          telegramId: true,
          username: true,
          subscriptionEnd: true,
          promoCodeUsedId: true,
          createdAt: true,
        },
      });

      this.logger.log(
        `📊 Найдено пользователей с подписками, истекающими через 3 дня: ${expiringUsers.length}`,
      );

      if (expiringUsers.length === 0) {
        this.logger.log(
          '✅ Нет пользователей с подписками, истекающими через 3 дня',
        );
        return;
      }

      let sentCount = 0;
      let errorCount = 0;

      for (const user of expiringUsers) {
        try {
          // Проверяем, не отправляли ли уже напоминание за 3 дня сегодня
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const existingLog = await this.prisma.eventLog.findFirst({
            where: {
              userId: user.id,
              action: 'THREE_DAY_REMINDER_SENT',
              timestamp: {
                gte: today,
              },
            },
          });

          if (existingLog) {
            this.logger.log(
              `⏭️ Напоминание за 3 дня пользователю ${user.telegramId} уже отправлено сегодня`,
            );
            continue;
          }

          const isTrialPeriod = this.isUserTrialPeriod(user);

          let message: string;
          if (isTrialPeriod) {
            message = this.getTrialThreeDayReminderMessage(user);
          } else {
            message = this.getSubscriptionThreeDayReminderMessage(user);
          }

          await this.bot.telegram.sendMessage(
            user.telegramId.toString(),
            message,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '💰 Продлить подписку',
                      callback_data: 'buy_subscription',
                    },
                    {
                      text: '🎫 Ввести промокод',
                      callback_data: 'enter_promo',
                    },
                  ],
                  [
                    {
                      text: '📋 Проверить подписку',
                      callback_data: 'subscription',
                    },
                  ],
                ],
              },
            },
          );

          // Логируем событие
          await this.prisma.eventLog.create({
            data: {
              userId: user.id,
              action: 'THREE_DAY_REMINDER_SENT',
              metadata: {
                expiryDate: user.subscriptionEnd?.toISOString(),
                isTrialPeriod,
                reminderType: 'three_days_before',
              },
            },
          });

          sentCount++;
          this.logger.log(
            `✅ Отправлено напоминание за 3 дня пользователю ${user.telegramId}`,
          );

          // Небольшая задержка между отправками
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          errorCount++;
          this.logger.error(
            `❌ Ошибка отправки напоминания пользователю ${user.telegramId}:`,
            error,
          );
        }
      }

      this.logger.log(
        `📈 Результат рассылки напоминаний за 3 дня: отправлено ${sentCount}, ошибок ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        '❌ Ошибка в планировщике напоминаний за 3 дня:',
        error,
      );
    }
  }

  /**
   * Проверяет подписки, которые истекают через неделю и отправляет напоминания
   * Запускается каждый день в 09:00
   */
  @Cron('0 9 * * *', {
    name: 'subscription-week-reminder',
    timeZone: 'Europe/Moscow',
  })
  async sendWeekReminders() {
    this.logger.log('🔔 Запуск проверки подписок, истекающих через неделю...');

    try {
      // Находим подписки, которые истекают через 7 дней
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      weekFromNow.setHours(0, 0, 0, 0);

      const eightDaysFromNow = new Date(weekFromNow);
      eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 1);

      const expiringUsers = await this.prisma.user.findMany({
        where: {
          subscriptionEnd: {
            gte: weekFromNow,
            lt: eightDaysFromNow,
          },
          isDeleted: false,
        },
        select: {
          id: true,
          telegramId: true,
          username: true,
          subscriptionEnd: true,
          promoCodeUsedId: true,
          createdAt: true,
        },
      });

      this.logger.log(
        `📊 Найдено пользователей с подписками, истекающими через неделю: ${expiringUsers.length}`,
      );

      if (expiringUsers.length === 0) {
        this.logger.log(
          '✅ Нет пользователей с подписками, истекающими через неделю',
        );
        return;
      }

      let sentCount = 0;
      let errorCount = 0;

      for (const user of expiringUsers) {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const existingLog = await this.prisma.eventLog.findFirst({
            where: {
              userId: user.id,
              action: 'WEEK_REMINDER_SENT',
              timestamp: {
                gte: today,
              },
            },
          });

          if (existingLog) {
            this.logger.log(
              `⏭️ Напоминание за неделю пользователю ${user.telegramId} уже отправлено сегодня`,
            );
            continue;
          }

          const isTrialPeriod = this.isUserTrialPeriod(user);

          let message: string;
          if (isTrialPeriod) {
            this.logger.log(
              `⏭️ Пропускаем пользователя ${user.telegramId} с пробным периодом для напоминания за неделю`,
            );
            continue;
          } else {
            message = this.getSubscriptionWeekReminderMessage(user);
          }

          await this.bot.telegram.sendMessage(
            user.telegramId.toString(),
            message,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '💰 Продлить подписку',
                      callback_data: 'buy_subscription',
                    },
                    {
                      text: '🎫 Ввести промокод',
                      callback_data: 'enter_promo',
                    },
                  ],
                  [
                    {
                      text: '📋 Проверить подписку',
                      callback_data: 'subscription',
                    },
                  ],
                ],
              },
            },
          );

          await this.prisma.eventLog.create({
            data: {
              userId: user.id,
              action: 'WEEK_REMINDER_SENT',
              metadata: {
                expiryDate: user.subscriptionEnd?.toISOString(),
                isTrialPeriod,
                reminderType: 'one_week_before',
              },
            },
          });

          sentCount++;
          this.logger.log(
            `✅ Отправлено напоминание за неделю пользователю ${user.telegramId}`,
          );

          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          errorCount++;
          this.logger.error(
            `❌ Ошибка отправки напоминания пользователю ${user.telegramId}:`,
            error,
          );
        }
      }

      this.logger.log(
        `📈 Результат рассылки напоминаний за неделю: отправлено ${sentCount}, ошибок ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        '❌ Ошибка в планировщике напоминаний за неделю:',
        error,
      );
    }
  }

  /**
   * Проверяет подписки, которые истекли сегодня и отправляет уведомления об истечении
   * Запускается каждый день в 10:00
   */
  @Cron('0 10 * * *', {
    name: 'subscription-expired-notification',
    timeZone: 'Europe/Moscow',
  })
  async sendExpiredNotifications() {
    this.logger.log('🔔 Запуск проверки истекших подписок...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const expiredUsers = await this.prisma.user.findMany({
        where: {
          subscriptionEnd: {
            gte: today,
            lt: tomorrow,
          },
          isDeleted: false,
        },
        select: {
          id: true,
          telegramId: true,
          username: true,
          subscriptionEnd: true,
          promoCodeUsedId: true,
          createdAt: true,
        },
      });

      this.logger.log(
        `📊 Найдено пользователей с истекшими сегодня подписками: ${expiredUsers.length}`,
      );

      if (expiredUsers.length === 0) {
        this.logger.log('✅ Нет пользователей с истекшими сегодня подписками');
        return;
      }

      let sentCount = 0;
      let errorCount = 0;

      for (const user of expiredUsers) {
        try {
          const existingLog = await this.prisma.eventLog.findFirst({
            where: {
              userId: user.id,
              action: 'EXPIRED_NOTIFICATION_SENT',
              timestamp: {
                gte: today,
              },
            },
          });

          if (existingLog) {
            this.logger.log(
              `⏭️ Уведомление пользователю ${user.telegramId} уже отправлено сегодня`,
            );
            continue;
          }

          const isTrialPeriod = this.isUserTrialPeriod(user);

          let message: string;
          if (isTrialPeriod) message = this.getTrialExpiredMessage(user);
          else message = this.getSubscriptionExpiredMessage(user);

          await this.bot.telegram.sendMessage(
            user.telegramId.toString(),
            message,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '💰 Купить подписку',
                      callback_data: 'buy_subscription',
                    },
                    {
                      text: '🎫 Ввести промокод',
                      callback_data: 'enter_promo',
                    },
                  ],
                  [{ text: '🎛️ Главное меню', callback_data: 'back_to_menu' }],
                ],
              },
            },
          );

          await this.prisma.eventLog.create({
            data: {
              userId: user.id,
              action: 'EXPIRED_NOTIFICATION_SENT',
              metadata: {
                expiryDate: user.subscriptionEnd?.toISOString(),
                isTrialPeriod,
                notificationType: 'expired_today',
              },
            },
          });

          sentCount++;
          this.logger.log(
            `✅ Отправлено уведомление об истечении пользователю ${user.telegramId}`,
          );

          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          errorCount++;
          this.logger.error(
            `❌ Ошибка отправки уведомления пользователю ${user.telegramId}:`,
            error,
          );
        }
      }

      this.logger.log(
        `📈 Результат рассылки об истечении: отправлено ${sentCount}, ошибок ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        '❌ Ошибка в планировщике уведомлений об истечении:',
        error,
      );
    }
  }

  /**
   * Отправляет еженедельную статистику администраторам
   * Запускается каждый понедельник в 8:00
   */
  @Cron('0 8 * * 1', {
    name: 'weekly-stats',
    timeZone: 'Europe/Moscow',
  })
  async sendWeeklyStats() {
    this.logger.log('📊 Отправка еженедельной статистики администраторам...');

    try {
      const adminIds =
        process.env.ADMIN_IDS?.split(',').map((id) => parseInt(id.trim())) ||
        [];

      if (adminIds.length === 0) {
        this.logger.log('⚠️ Нет администраторов для отправки статистики');
        return;
      }

      // Получаем статистику за последнюю неделю
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const stats = await this.getWeeklyStatistics(weekAgo);
      const message = this.formatWeeklyStatsMessage(stats);

      for (const adminId of adminIds) {
        try {
          await this.bot.telegram.sendMessage(adminId.toString(), message, {
            parse_mode: 'Markdown',
          });
          this.logger.log(`✅ Статистика отправлена администратору ${adminId}`);
        } catch (error) {
          this.logger.error(
            `❌ Ошибка отправки статистики администратору ${adminId}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('❌ Ошибка отправки еженедельной статистики:', error);
    }
  }

  /**
   * Определяет, является ли подписка пользователя пробным периодом
   */
  private isUserTrialPeriod(user: any): boolean {
    if (!user.subscriptionEnd) return false;

    const now = new Date();
    if (user.subscriptionEnd <= now) return false;

    if (user.promoCodeUsedId) return false;

    const daysSinceCreation =
      (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation < 8;
  }

  /**
   * Сообщение о скором истечении пробного периода
   */
  private getTrialExpiryMessage(user: any): string {
    const expiryDate = user.subscriptionEnd?.toLocaleDateString('ru-RU');
    return `🎁 *Напоминание о пробном периоде*\n\n⚠️ Ваш бесплатный пробный период истекает завтра!\n📅 Дата окончания: ${expiryDate}\n\n💡 *Чтобы продолжить пользоваться VPN:*\n• Купите подписку через /buy\n• Или активируйте промокод /promo\n\n🚀 Не теряйте доступ к быстрому и безопасному интернету!`;
  }

  /**
   * Сообщение о скором истечении обычной подписки
   */
  private getSubscriptionExpiryMessage(user: any): string {
    const expiryDate = user.subscriptionEnd?.toLocaleDateString('ru-RU');
    return `📋 *Напоминание о подписке*\n\n⚠️ Ваша подписка истекает завтра!\n📅 Дата окончания: ${expiryDate}\n\n💡 *Продлите подписку:*\n• Купите новый план через /buy\n• Или активируйте промокод /promo\n\n🔒 Обеспечьте непрерывную защиту вашего интернет-соединения!`;
  }

  /**
   * Сообщение об истечении пробного периода
   */
  private getTrialExpiredMessage(user: any): string {
    return `🎁 *Пробный период завершен*\n\n❌ Ваш бесплатный пробный период истек сегодня\n\n💰 *Продолжите пользоваться VPN:*\n• Выберите подходящий план: /buy\n• Или введите промокод: /promo\n\n✨ Спасибо, что попробовали наш сервис!\n🚀 Продлите подписку, чтобы не потерять доступ к безопасному интернету.`;
  }

  /**
   * Сообщение об истечении обычной подписки
   */
  private getSubscriptionExpiredMessage(user: any): string {
    return `📋 *Подписка истекла*\n\n❌ Ваша подписка истекла сегодня\n\n🔄 *Восстановите доступ:*\n• Продлите подписку: /buy\n• Или активируйте промокод: /promo\n\n💡 Выберите новый план и продолжайте пользоваться защищенным интернетом!`;
  }

  /**
   * Сообщение о пробном периоде, истекающем через 3 дня
   */
  private getTrialThreeDayReminderMessage(user: any): string {
    const expiryDate = user.subscriptionEnd?.toLocaleDateString('ru-RU');
    return `🎁 *Напоминание о пробном периоде*\n\n📅 Ваш бесплатный пробный период истекает через 3 дня!\n📅 Дата окончания: ${expiryDate}\n\n⏰ *Осталось времени подготовиться:*\n• Ознакомьтесь с тарифными планами: /buy\n• Узнайте о промокодах: /promo\n\n💡 Не забудьте продлить доступ к VPN заранее!`;
  }

  /**
   * Сообщение о подписке, истекающей через 3 дня
   */
  private getSubscriptionThreeDayReminderMessage(user: any): string {
    const expiryDate = user.subscriptionEnd?.toLocaleDateString('ru-RU');
    return `📋 *Напоминание о подписке*\n\n📅 Ваша подписка истекает через 3 дня!\n📅 Дата окончания: ${expiryDate}\n\n⏰ *Время подготовиться к продлению:*\n• Выберите подходящий план: /buy\n• Или подготовьте промокод: /promo\n\n🔒 Обеспечьте непрерывную защиту вашего интернет-соединения!`;
  }

  /**
   * Сообщение о подписке, истекающей через неделю
   */
  private getSubscriptionWeekReminderMessage(user: any): string {
    const expiryDate = user.subscriptionEnd?.toLocaleDateString('ru-RU');
    return `📋 *Уведомление о подписке*\n\n📅 Ваша подписка истекает через неделю\n📅 Дата окончания: ${expiryDate}\n\n💡 *У вас есть время:*\n• Ознакомиться с новыми тарифами: /buy\n• Найти промокод со скидкой: /promo\n• Спланировать продление заранее\n\n🎯 Заблаговременное продление гарантирует бесперебойный доступ к VPN!`;
  }

  /**
   * Получает статистику за неделю
   */
  private async getWeeklyStatistics(weekAgo: Date) {
    const now = new Date();

    const [
      newUsers,
      activeSubscriptions,
      expiredSubscriptions,
      totalPayments,
      promoCodesUsed,
    ] = await Promise.all([
      // Новые пользователи
      this.prisma.user.count({
        where: {
          createdAt: { gte: weekAgo },
          isDeleted: false,
        },
      }),

      // Активные подписки
      this.prisma.user.count({
        where: {
          subscriptionEnd: { gt: now },
          isDeleted: false,
        },
      }),

      // Истекшие за неделю подписки
      this.prisma.user.count({
        where: {
          subscriptionEnd: {
            gte: weekAgo,
            lt: now,
          },
          isDeleted: false,
        },
      }),

      // Платежи за неделю
      this.prisma.payment.findMany({
        where: {
          createdAt: { gte: weekAgo },
          status: 'completed',
        },
        select: {
          amount: true,
        },
      }),

      // Использованные промокоды
      this.prisma.eventLog.count({
        where: {
          action: 'PROMO_CODE_ACTIVATED',
          timestamp: { gte: weekAgo },
        },
      }),
    ]);

    const totalRevenue = totalPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    return {
      newUsers,
      activeSubscriptions,
      expiredSubscriptions,
      totalPayments: totalPayments.length,
      totalRevenue,
      promoCodesUsed,
      weekStart: weekAgo,
      weekEnd: now,
    };
  }

  /**
   * Форматирует сообщение со статистикой
   */
  private formatWeeklyStatsMessage(stats: any): string {
    const weekStart = stats.weekStart.toLocaleDateString('ru-RU');
    const weekEnd = stats.weekEnd.toLocaleDateString('ru-RU');
    const revenueRub = (stats.totalRevenue / 100).toFixed(2);

    return `📊 *Еженедельная статистика*\n📅 ${weekStart} - ${weekEnd}\n\n👥 *Пользователи:*\n• Новых: ${stats.newUsers}\n• Активных подписок: ${stats.activeSubscriptions}\n• Истекших подписок: ${stats.expiredSubscriptions}\n\n💰 *Платежи:*\n• Количество: ${stats.totalPayments}\n• Общая сумма: ${revenueRub} ₽\n\n🎫 *Промокоды:*\n• Использовано: ${stats.promoCodesUsed}\n\n📈 Хорошей работы!`;
  }

  /**
   * Отправка кастомного уведомления всем пользователям (для администраторов)
   */
  async sendBroadcastMessage(
    message: string,
    targetType: 'all' | 'active' | 'expired' = 'all',
  ): Promise<{ sent: number; errors: number }> {
    this.logger.log(`📢 Начало массовой рассылки для типа: ${targetType}`);

    let whereClause: any = { isDeleted: false };
    const now = new Date();

    switch (targetType) {
      case 'active':
        whereClause.subscriptionEnd = { gt: now };
        break;
      case 'expired':
        whereClause.subscriptionEnd = { lt: now };
        break;
      // 'all' - без дополнительных условий
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        telegramId: true,
      },
    });

    this.logger.log(`📊 Найдено пользователей для рассылки: ${users.length}`);

    let sentCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        await this.bot.telegram.sendMessage(
          user.telegramId.toString(),
          message,
          { parse_mode: 'Markdown' },
        );
        sentCount++;

        // Логируем событие
        await this.prisma.eventLog.create({
          data: {
            userId: user.id,
            action: 'BROADCAST_MESSAGE_SENT',
            metadata: {
              targetType,
              messageLength: message.length,
              sentAt: new Date().toISOString(),
            },
          },
        });

        // Задержка между отправками для предотвращения лимитов
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        errorCount++;
        this.logger.error(
          `❌ Ошибка отправки сообщения пользователю ${user.telegramId}:`,
          error,
        );
      }
    }

    this.logger.log(
      `📈 Результат массовой рассылки: отправлено ${sentCount}, ошибок ${errorCount}`,
    );
    return { sent: sentCount, errors: errorCount };
  }

  /**
   * Управление доступом пользователей и отправка уведомлений об истечении подписки
   * Запускается каждый день в 00:00
   */
  @Cron('0 0 * * *', {
    name: 'subscription-access-management',
    timeZone: 'Europe/Moscow',
	})
  async manageSubscriptionAccess() {
    this.logger.log('🔐 Запуск управления доступом к подпискам...');

    try {
      const now = new Date();

      // 1. Найти пользователей с истекшими подписками
      const expiredUsers = await this.prisma.user.findMany({
        where: {
          subscriptionEnd: {
            lt: now,
          },
					configIssued: true, 
          isDeleted: false,
          wgId: {
            not: null,
          },
        },
        select: {
          id: true,
          telegramId: true,
          username: true,
          subscriptionEnd: true,
          wgId: true,
          promoCodeUsedId: true,
        },
      });

      const activeUsers = await this.prisma.user.findMany({
        where: {
          subscriptionEnd: {
            gte: now,
          },
          isDeleted: false,
          wgId: {
            not: null,
          },
        },
        select: {
          id: true,
          wgId: true,
        },
      });

      let expiredProcessed = 0;
      let activeProcessed = 0;
      let expiredErrors = 0;
      let activeErrors = 0;

			for (const user of expiredUsers) {
        try {
          if (user.wgId) {
            const disabled = await this.wireGuardService.disableClient(
              user.wgId,
            );
            if (disabled) {
              this.logger.log(
                `🚫 Отключен доступ для пользователя ${user.id} (WG ID: ${user.wgId})`,
              );
            }
          }

          // Определяем тип подписки для сообщения
          const isTrialUser = user.promoCodeUsedId === null;
          const subscriptionType = isTrialUser ? 'пробный период' : 'подписка';

          const message =
            `⏰ *Ваш ${subscriptionType} истек*\n\n` +
            `📅 Дата окончания: ${user.subscriptionEnd?.toLocaleDateString('ru-RU')}\n` +
            `🚫 Доступ к VPN приостановлен\n\n` +
            `💡 *Как продолжить пользоваться VPN?*\n` +
            `• 💳 Купите подписку в главном меню\n` +
            `• 🎫 Активируйте промокод\n` +
            `• 👥 Пригласите друзей для получения бонусов\n\n` +
            `🔄 После продления доступ восстановится автоматически`;

          await this.bot.telegram.sendMessage(
            user.telegramId.toString(),
            message,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '💳 Купить подписку',
                      callback_data: 'buy_subscription',
                    },
                    { text: '🎫 Промокод', callback_data: 'enter_promo' },
                  ],
                  [{ text: '🎛️ Главное меню', callback_data: 'back_to_menu' }],
                ],
              },
            },
          );

          expiredProcessed++;

          // Логируем событие отключения
          await this.prisma.eventLog.create({
            data: {
              userId: user.id,
              action: 'SUBSCRIPTION_EXPIRED_ACCESS_DISABLED',
              metadata: {
                subscriptionEndDate: user.subscriptionEnd?.toISOString(),
                wgId: user.wgId,
                isTrialUser,
                disabledAt: new Date().toISOString(),
              },
            },
          });

          // Задержка между обработкой пользователей
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          expiredErrors++;
          this.logger.error(
            `❌ Ошибка обработки истекшей подписки пользователя ${user.id}:`,
            error,
          );
        }
      }

      // 4. Включить доступ для активных подписок (на случай если были отключены)
      for (const user of activeUsers) {
        try {
          if (user.wgId) {
            const enabled = await this.wireGuardService.enableClient(user.wgId);
            if (enabled) {
              this.logger.log(
                `✅ Включен доступ для пользователя ${user.id} (WG ID: ${user.wgId})`,
              );
              activeProcessed++;
            }
          }

          // Задержка между обработкой пользователей
          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          activeErrors++;
          this.logger.error(
            `❌ Ошибка включения доступа для пользователя ${user.id}:`,
            error,
          );
        }
      }

      const totalExpired = expiredUsers.length;
      const totalActive = activeUsers.length;

      this.logger.log(
        `📊 Результат управления доступом:\n` +
          `🚫 Отключено: ${expiredProcessed}/${totalExpired} (ошибок: ${expiredErrors})\n` +
          `✅ Включено: ${activeProcessed}/${totalActive} (ошибок: ${activeErrors})`,
      );

      // Логируем общую статистику
      await this.prisma.eventLog.create({
        data: {
          userId: 0, // Системное событие
          action: 'DAILY_ACCESS_MANAGEMENT_COMPLETED',
          metadata: {
            totalExpiredUsers: totalExpired,
            expiredProcessed,
            expiredErrors,
            totalActiveUsers: totalActive,
            activeProcessed,
            activeErrors,
            processedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      this.logger.error('❌ Критическая ошибка управления доступом:', error);
    }
  }
}
