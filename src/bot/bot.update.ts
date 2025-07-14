import { Action, Command, Ctx, Help, On, Start, Update } from 'nestjs-telegraf';
import { PrismaService } from 'prisma/prisma.service';
import { NotificationSchedulerService } from 'src/notifications/notification-scheduler.service';
import { NotificationService } from 'src/notifications/notification.service';
import { PaymentHistoryService } from 'src/payment/payment-history.service';
import { PaymentService } from 'src/payment/payment.service';
import { PlanAdminService } from 'src/payment/plan-admin.service';
import { UserService } from 'src/user/user.service';
import { escapeMarkdown } from 'src/utils/format.utils';
import { WireGuardService } from 'src/wireGuardService/WireGuardService.service';
import { Context } from 'telegraf';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';

// Добавляем интерфейс для контекста с match
interface CallbackContext extends Context {
  match?: RegExpMatchArray;
}

@Update()
export class BotUpdate {
  private readonly adminIds =
    process.env.ADMIN_IDS?.split(',').map((id) => parseInt(id.trim())) || [];
  private readonly trialPeriodDays = Number(process.env.TRIAL_PERIOD_DAYS) || 7;

  constructor(
    private readonly userService: UserService,
    private readonly wgService: WireGuardService,
    private readonly paymentService: PaymentService,
    private readonly paymentHistoryService: PaymentHistoryService,
    private readonly planAdminService: PlanAdminService,
    private readonly notificationScheduler: NotificationSchedulerService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {
    this.setupBotCommands();
  }

  private async setupBotCommands() {
    try {
      // Основные команды для всех пользователей
      const userCommands = [
        { command: 'start', description: 'Начать работу с ботом' },
        { command: 'help', description: 'Показать справку по командам' },
        { command: 'ref', description: 'Получить реферальную ссылку' },
        { command: 'stats', description: 'Статистика рефералов' },
        { command: 'subscription', description: 'Информация о подписке' },
        { command: 'buy', description: 'Купить подписку' },
        { command: 'payments', description: 'История платежей' },
        { command: 'qr', description: 'QR-код для WireGuard' },
        { command: 'config', description: 'Конфигурация WireGuard' },
        { command: 'promo', description: 'Активировать промокод' },
        { command: 'checkref', description: 'Проверить реферера' },
      ];

      // Админские команды
      const adminCommands = [
        ...userCommands,
        { command: 'createpromo', description: 'Создать промокод [ADMIN]' },
        { command: 'listpromos', description: 'Список промокодов [ADMIN]' },
        { command: 'listplans', description: 'Список планов [ADMIN]' },
        { command: 'paymentstats', description: 'Статистика платежей [ADMIN]' },
        {
          command: 'clearplanscache',
          description: 'Очистить кэш планов [ADMIN]',
        },
        { command: 'broadcast', description: 'Массовая рассылка [ADMIN]' },
        {
          command: 'notifstats',
          description: 'Статистика уведомлений [ADMIN]',
        },
      ];

      console.log('[BOT] Setting up bot commands...');

      console.log('[BOT] User commands:', userCommands);
      console.log('[BOT] Admin commands:', adminCommands);
    } catch (error) {
      console.error('Error setting up bot commands:', error);
    }
  }

  // Методы для создания клавиатур
  private getUserMainKeyboard(): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '🔗 Реферальная ссылка', callback_data: 'ref' },
          { text: '📊 Статистика', callback_data: 'stats' },
        ],
        [
          { text: '📱 QR-код', callback_data: 'qr' },
          { text: '📄 Конфигурация', callback_data: 'config' },
        ],
        [
          { text: '🎫 Промокод', callback_data: 'promo_help' },
          { text: '📋 Подписка', callback_data: 'subscription' },
        ],
        [
          { text: '💰 Купить подписку', callback_data: 'buy_subscription' },
          { text: '💳 История платежей', callback_data: 'payment_history' },
        ],
        [
          { text: '❓ Помощь', callback_data: 'show_help_menu' },
          { text: '⚡ Быстрые действия', callback_data: 'quick_actions' },
        ],
      ],
    };
  }

  private getAdminKeyboard(): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '🔗 Реферальная ссылка', callback_data: 'ref' },
          { text: '📊 Статистика', callback_data: 'stats' },
        ],
        [
          { text: '📱 QR-код', callback_data: 'qr' },
          { text: '📄 Конфигурация', callback_data: 'config' },
        ],
        [
          { text: '🎫 Промокод', callback_data: 'promo_help' },
          { text: '📋 Подписка', callback_data: 'subscription' },
        ],
        [
          { text: '💰 Купить подписку', callback_data: 'buy_subscription' },
          { text: '💳 История платежей', callback_data: 'payment_history' },
        ],
        [
          { text: '🔧 Создать промокод', callback_data: 'admin_createpromo' },
          { text: '📝 Список промокодов', callback_data: 'admin_listpromos' },
        ],
        [
          { text: '📋 Список планов', callback_data: 'admin_listplans' },
          {
            text: '📊 Статистика платежей',
            callback_data: 'admin_paymentstats',
          },
        ],
        [
          { text: '📢 Массовая рассылка', callback_data: 'admin_broadcast' },
          {
            text: '📈 Статистика уведомлений',
            callback_data: 'admin_notifstats',
          },
        ],
        [{ text: '🗑️ Очистить кэш', callback_data: 'admin_clearplanscache' }],
        [
          { text: '❓ Помощь', callback_data: 'show_help_menu' },
          { text: '⚡ Быстрые действия', callback_data: 'quick_actions' },
        ],
      ],
    };
  }

  private getHelpKeyboard(): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          {
            text: '💡 Что такое реферальная ссылка?',
            callback_data: 'help_ref',
          },
        ],
        [{ text: '📊 Как работает статистика?', callback_data: 'help_stats' }],
        [
          {
            text: '🎫 Как использовать промокоды?',
            callback_data: 'help_promo',
          },
        ],
        [
          {
            text: '📱 Как установить WireGuard?',
            callback_data: 'help_wireguard',
          },
        ],
        [
          {
            text: '💰 Как работает подписка?',
            callback_data: 'help_subscription',
          },
        ],
        [{ text: '🔧 Техническая поддержка', callback_data: 'help_support' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }],
      ],
    };
  }

  private getQuickActionsKeyboard(): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '⚡ Быстрое подключение', callback_data: 'quick_connect' },
          { text: '🔗 Поделиться ссылкой', callback_data: 'quick_share' },
        ],
        [
          { text: '� Купить подписку', callback_data: 'buy_subscription' },
          { text: '🎯 Ввести промокод', callback_data: 'enter_promo' },
        ],
        [
          { text: '📋 Статус подписки', callback_data: 'subscription' },
          { text: '📖 Подсказки', callback_data: 'show_help_menu' },
        ],
        [{ text: '🎛️ Главное меню', callback_data: 'back_to_menu' }],
      ],
    };
  }

  private async getPaymentPlansKeyboard(): Promise<InlineKeyboardMarkup> {
    const plans = await this.paymentService.getPlans();
    const keyboard: any[] = [];

    plans.forEach((plan) => {
      const planText = plan.popular
        ? `🔥 ${plan.name} - ${plan.price / 100} ₽`
        : `${plan.name} - ${plan.price / 100} ₽`;

      keyboard.push([
        {
          text: planText,
          callback_data: `buy_plan_${plan.id}`,
        },
      ]);
    });

    keyboard.push([{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]);

    return { inline_keyboard: keyboard };
  }

  private getPaymentConfirmKeyboard(planId: string): InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          {
            text: '💳 Оплатить через Telegram',
            callback_data: `confirm_payment_${planId}`,
          },
        ],
        [
          { text: '❌ Отмена', callback_data: 'buy_subscription' },
          { text: '🔙 Назад в меню', callback_data: 'back_to_menu' },
        ],
      ],
    };
  }

  @Start()
  async onStart(ctx: Context) {
    const tgId = ctx.from?.id;
    const username = ctx.from?.username;

    if (!tgId) return;

    console.log(`[START] User ${tgId} (${username}) started the bot`);

    let referrerUserId: number | undefined;
    let referrerUsername: string | undefined;

    if ('text' in ctx.message!) {
      const parts = ctx.message.text.split(' ');
      console.log(`[START] Message parts:`, parts);

      if (parts.length > 1) {
        const referrerTgId = parseInt(parts[1]);
        console.log(`[START] Parsed referrer TG ID: ${referrerTgId}`);

        if (!isNaN(referrerTgId) && referrerTgId !== tgId) {
          const referrerUser =
            await this.userService.findByTelegramId(referrerTgId);
          console.log(
            `[START] Found referrer user:`,
            referrerUser
              ? `ID=${referrerUser.id}, username=${referrerUser.username}`
              : 'not found',
          );

          if (referrerUser) {
            referrerUserId = referrerUser.id;
            referrerUsername = referrerUser.username || undefined;
          }
        } else {
          console.log(`[START] Invalid referrer TG ID or same as user`);
        }
      }
    }

    let user = await this.userService.findByTelegramId(tgId);

    if (user) {
      await ctx.reply('Вы уже зарегистрированы ✅');

      const isAdmin = this.isAdmin(tgId);
      const keyboard = isAdmin
        ? this.getAdminKeyboard()
        : this.getUserMainKeyboard();

      await ctx.reply('🎛️ Главное меню:', {
        reply_markup: keyboard,
      });
      return;
    }

    try {
      const config = await this.wgService.registerClient(tgId.toString());
      const wgId = await this.wgService.findClientIdByPublicKey(
        config.publicKey,
      );

      console.log(`[START] Creating user with referrer ID: ${referrerUserId}`);

      const createdUser = await this.userService.createUser(
        tgId,
        username,
        {
          wgAddress: config.address,
          wgPublicKey: config.publicKey,
          wgPrivateKey: config.privateKey,
          wgId: wgId,
        },
        referrerUserId,
      );

      console.log(
        `[START] User created with ID: ${createdUser.id}, invitedById: ${createdUser.invitedById}`,
      );

      // Отправляем уведомление администратору о новой регистрации
      try {
        const referrerName = referrerUsername ? `@${referrerUsername}` : null;
        await this.notificationService.sendAdminRegistrationNotification(
          createdUser.id,
          tgId.toString(),
          username,
          ctx.from?.first_name,
          ctx.from?.last_name,
          referrerName!,
        );
      } catch (error) {
        console.error('Error sending admin registration notification:', error);
      }

      let welcomeMessage = `Добро пожаловать! 🎉\nКонфигурация WireGuard выдана ✅\n\n🎁 *Пробный период активирован!*\n⏰ У вас есть 7 дней бесплатного доступа к VPN\n📅 Пробный период действует до: ${createdUser.subscriptionEnd?.toLocaleDateString('ru-RU')}`;
      if (referrerUserId) {
        const referrerDisplay = referrerUsername
          ? `@${referrerUsername}`
          : `#${referrerUserId}`;
        welcomeMessage += `\n👥 Вы приглашены пользователем ${referrerDisplay}`;
      }

      await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });

      // Показать главное меню для нового пользователя
      const isAdmin = this.isAdmin(tgId);
      const keyboard = isAdmin
        ? this.getAdminKeyboard()
        : this.getUserMainKeyboard();

      await ctx.reply(
        '🎛️ Главное меню:\n💡 *Ваш пробный период уже активен!* Используйте QR-код или конфигурацию для подключения к VPN.',
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      console.error('Error during user registration:', error);
      await ctx.reply('Произошла ошибка при регистрации. Попробуйте позже.');
    }
  }

  @Help()
  async onHelp(ctx: Context) {
    const tgId = ctx.from?.id;
    let helpMessage =
      'ℹ️ Команды:\n/start — начать\n/menu — главное меню\n/help — помощь\n/ref — реферальная ссылка\n/статистика (или /stats) — подробная статистика рефералов\n/checkref — проверить своего реферера\n/qr — получить QR-код для WireGuard\n/config — получить конфигурацию WireGuard\n/promo <код> — активировать промокод\n/subscription — информация о подписке\n/buy — купить подписку';

    // Добавить админские команды для администраторов
    if (tgId && this.isAdmin(tgId)) {
      helpMessage +=
        '\n\n🔧 Админские команды:\n/createpromo <код> <дни> [макс] [описание] — создать промокод\n/listpromos — список промокодов';
    }

    await ctx.reply(helpMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎛️ Главное меню', callback_data: 'back_to_menu' }],
        ],
      },
    });
  }

  @Command(['menu', 'меню', 'главная'])
  async onMenu(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const user = await this.userService.findByTelegramId(tgId);
    if (!user) {
      await ctx.reply(
        'Вы ещё не зарегистрированы. Используйте /start для регистрации.',
        {
          reply_markup: {
            inline_keyboard: [[{ text: '🚀 Начать', callback_data: 'start' }]],
          },
        },
      );
      return;
    }

    const isAdmin = this.isAdmin(tgId);
    const keyboard = isAdmin
      ? this.getAdminKeyboard()
      : this.getUserMainKeyboard();

    const welcomeText = isAdmin
      ? `👋 Добро пожаловать, администратор!\n\n🎛️ Главное меню:\nВыберите нужное действие из списка ниже.`
      : `👋 Добро пожаловать!\n\n🎛️ Главное меню:\nВыберите нужное действие из списка ниже.`;

    await ctx.reply(welcomeText, {
      reply_markup: keyboard,
    });
  }

  @Command('ref')
  async onRef(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const user = await this.userService.findByTelegramId(tgId);
    if (!user) {
      await ctx.reply('Вы ещё не зарегистрированы.');
      return;
    }

    // Правильно конвертируем BigInt в строку для ссылки
    const refLink = `https://t.me/${ctx.me}?start=${user.telegramId.toString()}`;

    console.log(`[REF] User ${user.id} requested referral link: ${refLink}`);

    // Отправляем реферальную ссылку первым сообщением
    await ctx.reply(`🔗 Ваша реферальная ссылка:\n${refLink}`);

    // Получаем статистику и отправляем вторым сообщением
    const stats = await this.userService.getReferralStats(user.id);
    console.log(`[REF] Referral stats:`, stats);

    let statsMessage = `👥 Статистика рефералов:\n`;
    statsMessage += `Всего приглашено: ${stats.totalInvited}\n`;

    if (stats.invitedUsers.length > 0) {
      statsMessage += `\n📝 Приглашённые пользователи:\n`;
      stats.invitedUsers.forEach((invitedUser, index) => {
        const username = invitedUser.username
          ? `@${invitedUser.username}`
          : `ID: ${invitedUser.telegramId}`;
        const date = new Date(invitedUser.createdAt).toLocaleDateString(
          'ru-RU',
        );
        statsMessage += `${index + 1}. ${username} (${date})\n`;
      });
    } else {
      statsMessage += `\n📭 Пока никого не приглашено`;
    }

    await ctx.reply(statsMessage);
  }

  @Command(['статистика', 'stats', 'stat'])
  async onStats(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const user = await this.userService.findByTelegramId(tgId);
    if (!user) {
      await ctx.reply('Вы ещё не зарегистрированы.');
      return;
    }

    const stats = await this.userService.getReferralStats(user.id);
    console.log(`[STATS] User ${user.id} requested stats:`, stats);

    let statsMessage = `📊 Подробная статистика рефералов:\n`;
    statsMessage += `👥 Всего приглашено: ${stats.totalInvited}\n`;

    if (stats.invitedUsers.length > 0) {
      statsMessage += `\n📝 Список приглашённых пользователей:\n`;
      stats.invitedUsers.forEach((invitedUser, index) => {
        const username = invitedUser.username
          ? `@${invitedUser.username}`
          : `Пользователь без username`;
        const date = new Date(invitedUser.createdAt).toLocaleDateString(
          'ru-RU',
        );
        const time = new Date(invitedUser.createdAt).toLocaleTimeString(
          'ru-RU',
          { hour: '2-digit', minute: '2-digit' },
        );
        statsMessage += `${index + 1}. ${username}\n`;
        statsMessage += `   📅 Дата: ${date} в ${time}\n`;
        statsMessage += `   🆔 ID: @${invitedUser.telegramId}\n\n`;
      });
    } else {
      statsMessage += `\n📭 Пока никого не приглашено\n`;
      statsMessage += `💡 Поделитесь своей реферальной ссылкой, чтобы пригласить друзей!`;
    }

    await ctx.reply(statsMessage);
  }

  @Command(['qr', 'qrcode', 'кюар'])
  async onQRCode(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const user = await this.userService.findByTelegramId(tgId);
    if (!user) {
      await ctx.reply(
        'Вы ещё не зарегистрированы. Используйте /start для регистрации.',
      );
      return;
    }

    if (!user.wgId) {
      await ctx.reply('❌ У вас нет WireGuard конфигурации.');
      return;
    }

    try {
      console.log(
        `[QR] User ${user.id} requested QR code for WG ID: ${user.wgId}`,
      );

      await ctx.reply('🔄 Генерирую QR-код...');

      const qrBuffer = await this.wgService.getClientQRCode(user.wgId);

      console.log(`[QR] QR code generated, size: ${qrBuffer.length} bytes`);

      await ctx.replyWithPhoto(
        { source: qrBuffer },
        {
          caption:
            '📱 QR-код для подключения WireGuard\n\nОтсканируйте этот код в приложении WireGuard для быстрого подключения.',
        },
      );
    } catch (error) {
      console.error('Error generating QR code:', error);
      await ctx.reply(
        '❌ Произошла ошибка при генерации QR-кода. Попробуйте позже.',
      );
    }
  }

  @Command(['config', 'конфиг', 'configuration'])
  async onConfig(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const user = await this.userService.findByTelegramId(tgId);
    if (!user) {
      await ctx.reply(
        'Вы ещё не зарегистрированы. Используйте /start для регистрации.',
      );
      return;
    }

    if (!user.wgId) {
      await ctx.reply('❌ У вас нет WireGuard конфигурации.');
      return;
    }

    try {
      console.log(
        `[CONFIG] User ${user.id} requested config for WG ID: ${user.wgId}`,
      );

      await ctx.reply('🔄 Получаю конфигурацию...');

      const config = await this.wgService.getClientConfiguration(user.wgId);

      console.log(
        `[CONFIG] Configuration retrieved, length: ${config.length} chars`,
      );

      const configBuffer = Buffer.from(config, 'utf-8');

      await ctx.reply(
        `📋 Конфигурация WireGuard:\n\n\`\`\`\n${config}\n\`\`\``,
        { parse_mode: 'Markdown' },
      );

      await ctx.replyWithDocument(
        {
          source: configBuffer,
          filename: `wireguard-${user.wgId.substring(0, 8)}.conf`,
        },
        {
          caption:
            '📄 Конфигурация WireGuard\n\nСкачайте файл и импортируйте его в приложение WireGuard.',
        },
      );
    } catch (error) {
      console.error('Error getting configuration:', error);
      await ctx.reply(
        '❌ Произошла ошибка при получении конфигурации. Попробуйте позже.',
      );
    }
  }

  @Command(['promo', 'промокод', 'promocode'])
  async onPromoCode(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const user = await this.userService.findByTelegramId(tgId);
    if (!user) {
      await ctx.reply(
        'Вы ещё не зарегистрированы. Используйте /start для регистрации.',
      );
      return;
    }

    if (!('text' in ctx.message!)) {
      await ctx.reply(
        '❓ Использование: /promo <код>\n\nПример: /promo WELCOME2024\n\nВведите промокод после команды.',
      );
      return;
    }

    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) {
      await ctx.reply(
        '❓ Использование: /promo <код>\n\nПример: /promo WELCOME2024\n\nВведите промокод после команды.',
      );
      return;
    }

    const promoCode = parts[1].toUpperCase().trim();

    console.log(
      `[PROMO] User ${user.id} trying to activate promo code: ${promoCode}`,
    );

    try {
      await ctx.reply('🔄 Проверяю промокод...');

      const result = await this.userService.activatePromoCode(
        user.id,
        promoCode,
      );

      if (result.success) {
        let message = `🎉 ${result.message}!\n\n`;
        if (result.newSubscriptionEnd) {
          const endDate = new Date(
            result.newSubscriptionEnd,
          ).toLocaleDateString('ru-RU');
          message += `📅 Подписка действует до: ${endDate}`;
        }
        await ctx.reply(message);
      } else {
        await ctx.reply(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Error in promo code command:', error);
      await ctx.reply(
        '❌ Произошла ошибка при обработке промокода. Попробуйте позже.',
      );
    }
  }

  @Command(['subscription', 'подписка', 'sub'])
  async onSubscription(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const user = await this.userService.findByTelegramId(tgId);
    if (!user) {
      await ctx.reply(
        'Вы ещё не зарегистрированы. Используйте /start для регистрации.',
      );
      return;
    }

    const userWithPromo = await this.userService.getUserWithPromoCode(user.id);

    let message = `📋 Информация о подписке:\n\n`;

    if (userWithPromo?.subscriptionEnd) {
      const now = new Date();
      const endDate = new Date(userWithPromo.subscriptionEnd);

      if (endDate > now) {
        const daysLeft = Math.ceil(
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        const endDateStr = endDate.toLocaleDateString('ru-RU');

        // Проверяем, является ли это пробным периодом (если нет использованного промокода и пользователь новый)
        const isTrialPeriod =
          !userWithPromo.promoCodeUsed &&
          userWithPromo.createdAt &&
          now.getTime() - userWithPromo.createdAt.getTime() <
            8 * 24 * 60 * 60 * 1000; // создан менее 8 дней назад

        if (isTrialPeriod) {
          message += `🎁 Пробный период активен\n`;
          message += `📅 Действует до: ${endDateStr}\n`;
          message += `⏰ Осталось дней: ${daysLeft}\n`;
          message += `💡 Это ваш бесплатный пробный период на 7 дней\n`;
        } else {
          message += `✅ Подписка активна\n`;
          message += `📅 Действует до: ${endDateStr}\n`;
          message += `⏰ Осталось дней: ${daysLeft}\n`;
        }
      } else {
        message += `❌ Подписка истекла\n`;
        message += `📅 Истекла: ${endDate.toLocaleDateString('ru-RU')}\n`;
      }
    } else {
      message += `❌ Подписка отсутствует\n`;
    }

    // Показать информацию о промокоде
    if (userWithPromo?.promoCodeUsed) {
      message += `\n🎫 Использованный промокод: ${userWithPromo.promoCodeUsed.code}`;
      if (userWithPromo.promoCodeUsed.description) {
        message += `\n📝 Описание: ${userWithPromo.promoCodeUsed.description}`;
      }
    }

    // Добавляем разные подсказки в зависимости от статуса подписки
    if (userWithPromo?.subscriptionEnd) {
      const now = new Date();
      const endDate = new Date(userWithPromo.subscriptionEnd);

      if (endDate <= now) {
        message += `\n\n� Для продления доступа используйте /buy`;
        message += `\n🎫 Или активируйте промокод: /promo <код>`;
      } else {
        message += `\n\n🎫 Используйте /promo <код> для активации промокода`;
        message += `\n💰 Продлить подписку: /buy`;
      }
    } else {
      message += `\n\n💰 Купить подписку: /buy`;
      message += `\n🎫 Или используйте промокод: /promo <код>`;
    }

    await ctx.reply(message);
  }

  @Command(['buy', 'купить', 'payment', 'оплата'])
  async onBuySubscription(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const user = await this.userService.findByTelegramId(tgId);
    if (!user) {
      await ctx.reply(
        'Вы ещё не зарегистрированы. Используйте /start для регистрации.',
      );
      return;
    }

    const plansText = await this.paymentService.getPlansText();
    const keyboard = await this.getPaymentPlansKeyboard();

    await ctx.reply(
      `💰 *Покупка подписки VPN*\n\n${plansText}\n\n💳 Оплата через ЮKassa\n🔒 Безопасные платежи\n⚡ Мгновенная активация\n\nВыберите подходящий план:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    );
  }

  // Обработчики callback'ов для inline-кнопок
  @Action('ref')
  async handleRefCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.onRef(ctx);
  }

  @Action('stats')
  async handleStatsCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.onStats(ctx);
  }

  @Action('qr')
  async handleQRCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.onQRCode(ctx);
  }

  @Action('config')
  async handleConfigCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.onConfig(ctx);
  }

  @Action('subscription')
  async handleSubscriptionCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.onSubscription(ctx);
  }

  @Action('help')
  async handleHelpCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.onHelp(ctx);
  }

  @Action('promo_help')
  async handlePromoHelpCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(
      '🎫 Активация промокода:\n\nВведите команду: /promo <код>\n\nПример: /promo WELCOME30\n\n💡 Промокоды дают дополнительные дни подписки!',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }],
          ],
        },
      },
    );
  }

  @Action('start')
  async handleStartCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.onStart(ctx);
  }

  @Action('back_to_menu')
  async handleBackToMenuCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.onMenu(ctx);
  }

  @Action('admin_createpromo')
  async handleAdminCreatePromoCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const tgId = ctx.from?.id;
    if (!tgId || !this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }

    await ctx.reply(
      '🔧 Создание промокода:\n\nВведите команду: /createpromo <код> <дни> [макс] [описание]\n\nПример: /createpromo SUMMER30 30 500 Летняя акция',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }],
          ],
        },
      },
    );
  }

  @Action('admin_listpromos')
  async handleAdminListPromosCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const tgId = ctx.from?.id;
    if (!tgId || !this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }
    await this.onListPromos(ctx);
  }

  // Новые обработчики для подсказок и быстрых действий
  @Action('show_help_menu')
  async handleShowHelpMenuCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(
      '❓ Помощь и подсказки:\n\nВыберите тему, по которой нужна помощь:',
      {
        reply_markup: this.getHelpKeyboard(),
      },
    );
  }

  @Action('quick_actions')
  async handleQuickActionsCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply('⚡ Быстрые действия:\n\nВыберите нужное действие:', {
      reply_markup: this.getQuickActionsKeyboard(),
    });
  }

  @Action('help_ref')
  async handleHelpRefCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(
      '💡 *Реферальная система:*\n\n🔗 Ваша реферальная ссылка позволяет приглашать друзей\n👥 За каждого приглашенного друга вы получаете бонусы\n📊 В статистике видно всех приглашенных пользователей\n💰 Рефералы могут давать дополнительные дни подписки\n\n*Как использовать:*\n1. Получите ссылку через кнопку "Реферальная ссылка"\n2. Поделитесь ей с друзьями\n3. Когда друг зарегистрируется по ссылке, он станет вашим рефералом',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 Получить ссылку', callback_data: 'ref' }],
            [
              {
                text: '🔙 Назад к подсказкам',
                callback_data: 'show_help_menu',
              },
            ],
          ],
        },
      },
    );
  }

  @Action('help_stats')
  async handleHelpStatsCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(
      '📊 *Статистика рефералов:*\n\n📈 Показывает количество приглашенных пользователей\n📅 Дату регистрации каждого реферала\n👤 Username или ID приглашенных\n⏰ Время регистрации\n\n*Два вида статистики:*\n• Краткая - в реферальной ссылке\n• Подробная - через команду /статистика\n\n*Зачем нужна:*\n• Отслеживать успешность приглашений\n• Видеть активность рефералов\n• Планировать маркетинговые активности',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Посмотреть статистику', callback_data: 'stats' }],
            [
              {
                text: '🔙 Назад к подсказкам',
                callback_data: 'show_help_menu',
              },
            ],
          ],
        },
      },
    );
  }

  @Action('help_promo')
  async handleHelpPromoCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(
      '🎫 *Промокоды:*\n\n💰 Дают дополнительные дни подписки\n🔢 Имеют ограниченное количество использований\n⏱️ Могут иметь срок действия\n👤 Каждый пользователь может использовать только один промокод\n\n*Как использовать:*\n1. Введите команду `/promo КОДПРОМО`\n2. Если код верный, дни добавятся к подписке\n3. Проверить статус можно в разделе "Подписка"\n\n*Примеры промокодов:*\n• WELCOME30 - приветственный\n• SUMMER50 - сезонный\n• FRIEND10 - для друзей',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎯 Ввести промокод', callback_data: 'enter_promo' }],
            [
              {
                text: '🔙 Назад к подсказкам',
                callback_data: 'show_help_menu',
              },
            ],
          ],
        },
      },
    );
  }

  @Action('help_wireguard')
  async handleHelpWireguardCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(
      '📱 *Установка WireGuard:*\n\n*1. Скачайте приложение:*\n• [Android](https://play.google.com/store/apps/details?id=com.wireguard.android)\n• [iOS](https://apps.apple.com/app/wireguard/id1441195209)\n• [Windows](https://www.wireguard.com/install/)\n• [macOS](https://apps.apple.com/app/wireguard/id1451685025)\n\n*2. Добавьте конфигурацию:*\n• Сканируйте QR-код через приложение\n• Или импортируйте .conf файл\n\n*3. Подключитесь:*\n• Нажмите переключатель в приложении\n• Проверьте подключение на любом сайте\n\n💡 *Совет:* QR-код удобнее для мобильных устройств, файл - для компьютера',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📱 QR-код', callback_data: 'qr' },
              { text: '📄 Файл конфига', callback_data: 'config' },
            ],
            [
              {
                text: '🔙 Назад к подсказкам',
                callback_data: 'show_help_menu',
              },
            ],
          ],
        },
      },
    );
  }

  @Action('help_subscription')
  async handleHelpSubscriptionCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(
      '💰 *Подписка:*\n\n⏰ *Как работает:*\n• Подписка дает доступ к VPN\n• Измеряется в днях\n• Продлевается промокодами или оплатой\n\n📅 *Статусы:*\n• ✅ Активна - VPN работает\n• ❌ Истекла - нужно продлить\n• ❌ Отсутствует - никогда не была активирована\n\n🔄 *Продление:*\n• Промокодами через /promo\n• Покупкой дополнительного времени\n• Реферальными бонусами\n\n📊 *Отслеживание:*\n• Дата окончания\n• Количество оставшихся дней\n• История использованных промокодов',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Проверить подписку', callback_data: 'subscription' }],
            [
              {
                text: '🔙 Назад к подсказкам',
                callback_data: 'show_help_menu',
              },
            ],
          ],
        },
      },
    );
  }

  @Action('help_support')
  async handleHelpSupportCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(
      '🔧 *Техническая поддержка:*\n\n*Частые проблемы:*\n\n🔌 *Не подключается VPN:*\n• Проверьте интернет-соединение\n• Переподключитесь к другому серверу\n• Обновите конфигурацию\n\n⚡ *Медленная скорость:*\n• Попробуйте другой сервер\n• Проверьте нагрузку на сеть\n• Перезапустите приложение\n\n📱 *Проблемы с приложением:*\n• Обновите WireGuard до последней версии\n• Перезагрузите устройство\n• Переимпортируйте конфигурацию\n\n*Контакты поддержки:*\n• Telegram direct: @slavacom\\_vpn\n• Время работы: 24/7',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🔙 Назад к подсказкам',
                callback_data: 'show_help_menu',
              },
            ],
          ],
        },
      },
    );
  }

  @Action('quick_connect')
  async handleQuickConnectCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(
      '⚡ *Быстрое подключение:*\n\nВыберите способ получения конфигурации:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 QR-код (для телефона)', callback_data: 'qr' }],
            [{ text: '📄 Файл конфига (для ПК)', callback_data: 'config' }],
            [{ text: '📋 Проверить подписку', callback_data: 'subscription' }],
            [
              {
                text: '🔙 Назад к быстрым действиям',
                callback_data: 'quick_actions',
              },
            ],
          ],
        },
      },
    );
  }

  @Action('quick_share')
  async handleQuickShareCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.onRef(ctx);
  }

  @Action('enter_promo')
  async handleEnterPromoCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(
      '🎯 *Ввести промокод:*\n\nВведите команду в формате:\n`/promo ВАШ_ПРОМОКОД`\n\nПример:\n`/promo WELCOME30`\n\n💡 Промокод нужно вводить без пробелов, большими буквами',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🔙 Назад к быстрым действиям',
                callback_data: 'quick_actions',
              },
            ],
          ],
        },
      },
    );
  }

  // Обработчики платежей
  @Action('buy_subscription')
  async handleBuySubscriptionCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.onBuySubscription(ctx);
  }

  @Action(/buy_plan_(.+)/)
  async handleBuyPlanCallback(@Ctx() ctx: CallbackContext) {
    await ctx.answerCbQuery();

    if (!ctx.match) return;
    const planId = ctx.match[1];

    const plan = await this.paymentService.getPlanById(planId);
    if (!plan) {
      await ctx.reply('❌ План не найден');
      return;
    }

    const keyboard = this.getPaymentConfirmKeyboard(planId);

    await ctx.reply(
      `💰 *Подтверждение покупки:*\n\n📦 *${plan.name}*\n${plan.description}\n\n💵 *Цена:* ${plan.price / 100} ₽\n⏰ *Период:* ${plan.days} дней\n\n🔒 Оплата проходит через безопасный сервис ЮKassa\n⚡ Подписка активируется автоматически после оплаты`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    );
  }

  @Action(/confirm_payment_(.+)/)
  async handleConfirmPaymentCallback(@Ctx() ctx: CallbackContext) {
    await ctx.answerCbQuery();

    if (!ctx.match) return;
    const planId = ctx.match[1];
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const user = await this.userService.findByTelegramId(tgId);
    if (!user) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }

    const plan = await this.paymentService.getPlanById(planId);
    if (!plan) {
      await ctx.reply('❌ План не найден');
      return;
    }

    try {
      const result = await this.paymentService.createInvoice(user.id, planId);

      if (result.success && result.invoicePayload) {
        const providerToken = this.paymentService.getProviderToken();

        if (!providerToken) {
          await ctx.reply(
            '❌ Сервис платежей недоступен. Обратитесь к администратору.',
          );
          return;
        }

        await ctx.replyWithInvoice({
          title: plan.name,
          description: plan.description,
          payload: result.invoicePayload,
          provider_token: providerToken,
          currency: 'RUB',
          prices: [
            {
              label: plan.name,
              amount: plan.price,
            },
          ],
          need_email: false,
          need_phone_number: false,
          need_shipping_address: false,
          is_flexible: false,
        });

        console.log(
          `[PAYMENT] Created invoice for user ${user.id}, plan ${planId}, payload: ${result.invoicePayload}`,
        );
      } else {
        await ctx.reply(`❌ ${result.message || 'Не удалось создать счет'}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      await ctx.reply(
        '❌ Произошла ошибка при создании счета. Попробуйте позже.',
      );
    }
  }

  // Обработчики платежей Telegram
  @On('pre_checkout_query')
  async handlePreCheckoutQuery(@Ctx() ctx: Context) {
    try {
      console.log(
        '[PAYMENT] Pre-checkout query received:',
        ctx.preCheckoutQuery,
      );

      // Здесь можно добавить дополнительную валидацию
      // Например, проверить что план еще доступен

      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      console.error('Error in pre-checkout query:', error);
      await ctx.answerPreCheckoutQuery(
        false,
        'Произошла ошибка при обработке платежа',
      );
    }
  }

  @On('successful_payment')
  async handleSuccessfulPayment(@Ctx() ctx: Context) {
    try {
      const payment = (ctx.message as any)?.successful_payment;
      if (!payment) return;

      console.log('[PAYMENT] Successful payment received:', payment);

      const paymentData = await this.paymentService.handleSuccessfulPayment(
        payment.telegram_payment_charge_id,
        payment.provider_payment_charge_id,
        payment.invoice_payload,
        payment.total_amount,
        payment.currency,
      );

      if (paymentData) {
        const plan = await this.paymentService.getPlanById(paymentData.planId);
        const result = await this.userService.addSubscriptionDays(
          paymentData.userId,
          plan?.days || 0,
          payment.telegram_payment_charge_id,
        );

        // Обновляем запись о платеже информацией о добавленных днях
        try {
          const paymentRecord =
            await this.paymentHistoryService.findByTelegramChargeId(
              payment.telegram_payment_charge_id,
            );
          if (paymentRecord) {
            await this.paymentHistoryService.updatePayment(paymentRecord.id, {
              daysAdded: plan?.days || 0,
            });
          }
        } catch (error) {
          console.error(
            '[PAYMENT] Error updating payment record with days added:',
            error,
          );
        }

        if (result.success && plan) {
          const endDate =
            result.newSubscriptionEnd?.toLocaleDateString('ru-RU');

          // Активируем доступ к WireGuard после покупки
          try {
            const user = await this.userService.findByTelegramId(
              ctx.from?.id || 0,
            );
            if (user?.wgId) {
              const enabled = await this.wgService.enableClient(user.wgId);
              if (enabled) {
                console.log(
                  `[PAYMENT] Активирован доступ WireGuard для пользователя ${user.id}`,
                );
              } else {
                console.warn(
                  `[PAYMENT] Не удалось активировать доступ WireGuard для пользователя ${user.id}`,
                );
              }
            }
          } catch (error) {
            console.error(
              'Error enabling WireGuard access after payment:',
              error,
            );
          }

          // Отправляем уведомление администратору о покупке
          try {
            const user = await this.userService.findByTelegramId(
              ctx.from?.id || 0,
            );
            if (user) {
              await this.notificationService.sendAdminPurchaseNotification(
                user.id,
                plan.name,
                payment.total_amount / 100, // Конвертируем из копеек в рубли
                payment.currency,
                'Telegram Payments',
                ctx.from?.username,
                ctx.from?.first_name,
                ctx.from?.last_name,
              );
            }
          } catch (error) {
            console.error('Error sending admin purchase notification:', error);
          }

          await ctx.reply(
            `🎉 *Платеж успешно обработан!*\n\n✅ Подписка активирована\n📦 План: ${plan.name}\n⏰ Период: ${plan.days} дней\n📅 Действует до: ${endDate}\n\n🚀 Теперь вы можете использовать VPN!`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '📱 Получить QR-код', callback_data: 'qr' },
                    { text: '📄 Скачать конфиг', callback_data: 'config' },
                  ],
                  [{ text: '🎛️ Главное меню', callback_data: 'back_to_menu' }],
                ],
              },
            },
          );
        } else {
          await ctx.reply(
            '❌ Ошибка при активации подписки. Обратитесь в поддержку.',
          );
        }
      } else {
        await ctx.reply(
          '❌ Ошибка при обработке платежа. Обратитесь в поддержку.',
        );
      }
    } catch (error) {
      console.error('Error handling successful payment:', error);
      await ctx.reply(
        '❌ Ошибка при обработке платежа. Обратитесь в поддержку.',
      );
    }
  }

  // Админские команды
  private isAdmin(userId: number): boolean {
    return this.adminIds.includes(userId);
  }

  @Command(['createpromo', 'создатьпромо'])
  async onCreatePromo(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    if (!this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }

    if (!('text' in ctx.message!)) {
      await ctx.reply(
        '❓ Использование: /createpromo <код> <дни> [макс_использований] [описание]\n\nПример: /createpromo WELCOME30 30 100 Приветственный промокод',
      );
      return;
    }

    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) {
      await ctx.reply(
        '❓ Использование: /createpromo <код> <дни> [макс_использований] [описание]\n\nПример: /createpromo WELCOME30 30 100 Приветственный промокод',
      );
      return;
    }

    const code = parts[1].toUpperCase();
    const discountDays = parseInt(parts[2]);
    const maxUses = parts[3] ? parseInt(parts[3]) : 1000;
    const description = parts.slice(4).join(' ') || undefined;

    if (isNaN(discountDays) || discountDays <= 0) {
      await ctx.reply('❌ Неверное количество дней');
      return;
    }

    if (parts[3] && (isNaN(maxUses) || maxUses <= 0)) {
      await ctx.reply('❌ Неверное максимальное количество использований');
      return;
    }

    try {
      const result = await this.userService.createPromoCode({
        code,
        discountDays,
        maxUses,
        description,
      });

      if (result.success) {
        let message = `✅ Промокод создан!\n\n`;
        message += `🎫 Код: ${result.promoCode?.code}\n`;
        message += `⏰ Дней: ${result.promoCode?.discountDays}\n`;
        message += `🔢 Макс. использований: ${result.promoCode?.maxUses}\n`;
        if (result.promoCode?.description) {
          message += `📝 Описание: ${result.promoCode.description}\n`;
        }

        await ctx.reply(message);
      } else {
        await ctx.reply(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating promo code:', error);
      await ctx.reply('❌ Произошла ошибка при создании промокода.');
    }
  }

  @Command(['listpromos', 'списокпромо'])
  async onListPromos(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    if (!this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }

    try {
      const promoCodes = await this.userService.listPromoCodes();

      if (promoCodes.length === 0) {
        await ctx.reply('📭 Промокоды не найдены');
        return;
      }

      let message = `📋 Список промокодов (последние 10):\n\n`;

      promoCodes.forEach((promo, index) => {
        const status = promo.isActive ? '✅' : '❌';
        const usage = `${promo.usedCount}/${promo.maxUses}`;
        const expiry = promo.expiresAt
          ? promo.expiresAt < new Date()
            ? ' (истёк)'
            : ` (до ${promo.expiresAt.toLocaleDateString('ru-RU')})`
          : '';

        message += `${index + 1}. ${status} ${promo.code}\n`;
        message += `   ⏰ ${promo.discountDays} дней\n`;
        message += `   📊 Использовано: ${usage}${expiry}\n`;
        if (promo.description) {
          message += `   📝 ${promo.description}\n`;
        }
        message += `\n`;
      });

      await ctx.reply(message);
    } catch (error) {
      console.error('Error listing promo codes:', error);
      await ctx.reply('❌ Произошла ошибка при получении списка промокодов.');
    }
  }

  // Новые админские команды для планов
  @Command(['listplans', 'планы'])
  async onListPlans(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    if (!this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }

    try {
      const plans = await this.planAdminService.getAllPlans();
      const stats = await this.planAdminService.getPlansStatistics();

      let message = `📋 *Планы подписки:*\n\n`;
      message += `📊 *Статистика:*\n`;
      message += `• Всего планов: ${stats.totalPlans}\n`;
      message += `• Активных: ${stats.activePlans}\n`;
      message += `• Неактивных: ${stats.inactivePlans}\n\n`;

      if (plans.length === 0) {
        message += '📭 Планы не найдены';
      } else {
        plans.forEach((plan, index) => {
          const status = plan.isActive ? '✅' : '❌';
          const priceRub = Number(plan.price) / 100;

          message += `${index + 1}. ${status} *${plan.name}* (ID: ${plan.id})\n`;
          message += `   💵 ${priceRub} ₽ за ${plan.durationDays} дней\n`;
          message += `   💱 ${plan.currency}\n`;
          if (plan.description) {
            message += `   📝 ${plan.description}\n`;
          }
          message += `   📅 Создан: ${plan.createdAt.toLocaleDateString('ru-RU')}\n\n`;
        });
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error listing plans:', error);
      await ctx.reply('❌ Произошла ошибка при получении списка планов.');
    }
  }

  @Command(['clearplanscache', 'очиститькэш'])
  async onClearPlansCache(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    if (!this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }

    try {
      await this.paymentService.clearPlansCache();
      await ctx.reply('✅ Кэш планов успешно очищен!');
    } catch (error) {
      console.error('Error clearing plans cache:', error);
      await ctx.reply('❌ Произошла ошибка при очистке кэша.');
    }
  }

  // Обработчики callback для админских действий с планами
  @Action('admin_listplans')
  async handleAdminListPlansCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const tgId = ctx.from?.id;
    if (!tgId || !this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }
    await this.onListPlans(ctx);
  }

  @Action('admin_clearplanscache')
  async handleAdminClearPlansCacheCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const tgId = ctx.from?.id;
    if (!tgId || !this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }
    await this.onClearPlansCache(ctx);
  }

  // Команды для работы с историей платежей
  @Command(['payments', 'платежи', 'history'])
  async onPaymentHistory(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    const user = await this.userService.findByTelegramId(tgId);
    if (!user) {
      await ctx.reply('❌ Пользователь не найден');
      return;
    }

    try {
      const payments = await this.paymentHistoryService.getUserPaymentHistory(
        user.id,
        5,
      );

      if (payments.length === 0) {
        await ctx.reply('📭 У вас пока нет платежей');
        return;
      }

      let message = `💳 *История платежей:*\n\n`;

      payments.forEach((payment, index) => {
        const status =
          payment.status === 'completed'
            ? '✅'
            : payment.status === 'pending'
              ? '⏳'
              : payment.status === 'failed'
                ? '❌'
                : '❓';
        const amount = payment.amount / 100; // конвертируем копейки в рубли
        const date = payment.createdAt.toLocaleDateString('ru-RU');
        const planName = payment.plan?.name || 'Неизвестный план';

        message += `${index + 1}. ${status} *${planName}*\n`;
        message += `   💵 ${amount} ₽\n`;
        message += `   📅 ${date}\n`;
        message += `\n`;
      });

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error getting payment history:', error);
      await ctx.reply('❌ Произошла ошибка при получении истории платежей.');
    }
  }

  @Command(['paymentstats', 'статистикаплатежей'])
  async onPaymentStats(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    if (!this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }

    try {
      const stats = await this.paymentHistoryService.getPaymentStatistics();

      let message = `📊 *Статистика платежей:*\n\n`;
      message += `📈 *Общая статистика:*\n`;
      message += `• Всего платежей: ${stats.totalPayments.toString()}\n`;
      message += `• Успешных: ${stats.completedPayments.toString()}\n`;
      message += `• Неуспешных: ${stats.failedPayments.toString()}\n`;
      message += `• Общая сумма: ${(stats.totalAmount / 100).toFixed(2)} ₽\n`;
      message += `• Средняя сумма: ${(stats.averageAmount / 100).toFixed(2)} ₽\n\n`;

      message += `📋 **По статусам:**\n`;
      stats.paymentsByStatus.forEach((stat) => {
        const amount = (stat._sum.amount || 0) / 100;
        message += `• ${stat.status}: ${stat._count.status.toString()} (${amount.toFixed(2)} ₽)\n`;
      });

      message += `\n💳 *По методам оплаты:*\n`;
      stats.paymentsByMethod.forEach((stat) => {
        const amount = (stat._sum.amount || 0) / 100;
        message += `• ${stat.method}: ${stat._count.method.toString()} (${amount.toFixed(2)} ₽)\n`;
      });

      await ctx.reply(escapeMarkdown(message), { parse_mode: 'MarkdownV2' });
    } catch (error) {
      console.error('Error getting payment statistics:', error);
      await ctx.reply('❌ Произошла ошибка при получении статистики.');
    }
  }

  // Обработчики callback для истории платежей
  @Action('payment_history')
  async handlePaymentHistoryCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.onPaymentHistory(ctx);
  }

  @Action('admin_paymentstats')
  async handleAdminPaymentStatsCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const tgId = ctx.from?.id;
    if (!tgId || !this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }
    await this.onPaymentStats(ctx);
  }

  // Команды для управления рассылками и уведомлениями
  @Command(['broadcast', 'рассылка'])
  async onBroadcast(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    if (!this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }

    if (!('text' in ctx.message!)) {
      await ctx.reply(
        '📢 *Массовая рассылка*\n\n❓ Использование:\n/broadcast <тип> <сообщение>\n\n📋 *Типы получателей:*\n• `all` - все пользователи\n• `active` - с активной подпиской\n• `expired` - с истекшей подпиской\n\n💡 *Пример:*\n`/broadcast all Привет! У нас новые сервера!`',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) {
      await ctx.reply(
        '❌ Неверный формат команды.\n\nИспользование: /broadcast <тип> <сообщение>',
      );
      return;
    }

    const targetType = parts[1] as 'all' | 'active' | 'expired';
    const message = parts.slice(2).join(' ');

    if (!['all', 'active', 'expired'].includes(targetType)) {
      await ctx.reply(
        '❌ Неверный тип получателей. Используйте: all, active, expired',
      );
      return;
    }

    try {
      await ctx.reply('🔄 Начинаю массовую рассылку...');

      const result = await this.notificationScheduler.sendBroadcastMessage(
        message,
        targetType,
      );

      let resultMessage = `📊 *Результат рассылки:*\n\n`;
      resultMessage += `✅ Отправлено: ${result.sent}\n`;
      resultMessage += `❌ Ошибок: ${result.errors}\n`;
      resultMessage += `📋 Тип: ${targetType}\n`;
      resultMessage += `📝 Сообщение: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;

      await ctx.reply(resultMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in broadcast command:', error);
      await ctx.reply('❌ Произошла ошибка при выполнении рассылки.');
    }
  }

  @Command(['notifstats', 'статистикауведомлений'])
  async onNotificationStats(@Ctx() ctx: Context) {
    const tgId = ctx.from?.id;
    if (!tgId) return;

    if (!this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }

    try {
      // Статистика за последние 7 дней
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const today = new Date();

      // Получаем статистику уведомлений
      const notificationCounts = await this.prisma.eventLog.groupBy({
        by: ['action'],
        where: {
          timestamp: {
            gte: weekAgo,
            lte: today,
          },
          action: {
            in: [
              'EXPIRY_REMINDER_SENT',
              'THREE_DAY_REMINDER_SENT',
              'WEEK_REMINDER_SENT',
              'EXPIRED_NOTIFICATION_SENT',
              'WELCOME_NOTIFICATION_SENT',
              'BROADCAST_MESSAGE_SENT',
              'TRIAL_PERIOD_GRANTED',
              'ADMIN_REGISTRATION_NOTIFICATION_SENT',
              'ADMIN_PURCHASE_NOTIFICATION_SENT',
              'SUBSCRIPTION_EXPIRED_ACCESS_DISABLED',
              'DAILY_ACCESS_MANAGEMENT_COMPLETED',
            ],
          },
        },
        _count: {
          action: true,
        },
      });

      // Статистика пользователей
      const [totalUsers, activeSubscriptions, expiredSubscriptions] =
        await Promise.all([
          this.prisma.user.count({ where: { isDeleted: false } }),
          this.prisma.user.count({
            where: {
              subscriptionEnd: { gt: today },
              isDeleted: false,
            },
          }),
          this.prisma.user.count({
            where: {
              subscriptionEnd: { lt: today },
              isDeleted: false,
            },
          }),
        ]);

      let message = `📈 *Статистика уведомлений*\n📅 За последние 7 дней\n\n`;

      message += `👥 *Пользователи:*\n`;
      message += `• Всего: ${totalUsers}\n`;
      message += `• Активных подписок: ${activeSubscriptions}\n`;
      message += `• Истекших подписок: ${expiredSubscriptions}\n\n`;

      message += `🔔 *Отправленные уведомления:*\n`;

      const actionNames = {
        EXPIRY_REMINDER_SENT: 'Напоминания (завтра)',
        THREE_DAY_REMINDER_SENT: 'Напоминания (3 дня)',
        WEEK_REMINDER_SENT: 'Напоминания (неделя)',
        EXPIRED_NOTIFICATION_SENT: 'Уведомления об истечении',
        WELCOME_NOTIFICATION_SENT: 'Приветственные',
        BROADCAST_MESSAGE_SENT: 'Массовые рассылки',
        TRIAL_PERIOD_GRANTED: 'Выдача пробного периода',
        ADMIN_REGISTRATION_NOTIFICATION_SENT:
          'Уведомления о регистрации (админ)',
        ADMIN_PURCHASE_NOTIFICATION_SENT: 'Уведомления о покупке (админ)',
        SUBSCRIPTION_EXPIRED_ACCESS_DISABLED: 'Отключение доступа (истечение)',
        DAILY_ACCESS_MANAGEMENT_COMPLETED: 'Управление доступом (системное)',
      };

      let totalNotifications = 0;
      notificationCounts.forEach((count) => {
        const actionName =
          actionNames[count.action as keyof typeof actionNames] || count.action;
        message += `• ${actionName}: ${count._count.action}\n`;
        totalNotifications += count._count.action;
      });

      message += `\n📊 *Всего уведомлений:* ${totalNotifications}`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error getting notification stats:', error);
      await ctx.reply('❌ Произошла ошибка при получении статистики.');
    }
  }

  // Обработчики callback для рассылок
  @Action('admin_broadcast')
  async handleAdminBroadcastCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const tgId = ctx.from?.id;
    if (!tgId || !this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }

    await ctx.reply(
      '📢 *Массовая рассылка*\n\nДля отправки рассылки используйте команду:\n`/broadcast <тип> <сообщение>`\n\n📋 *Типы получателей:*\n• `all` - все пользователи\n• `active` - с активной подпиской\n• `expired` - с истекшей подпиской\n\n💡 *Пример:*\n`/broadcast all Привет! У нас новые сервера!`',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }],
          ],
        },
      },
    );
  }

  @Action('admin_notifstats')
  async handleAdminNotifStatsCallback(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const tgId = ctx.from?.id;
    if (!tgId || !this.isAdmin(tgId)) {
      await ctx.reply('❌ У вас нет прав для выполнения этой команды.');
      return;
    }
    await this.onNotificationStats(ctx);
  }
}
