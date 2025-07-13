import { PaymentStatistics } from '../payment/interfaces/payment.interface';

/**
 * Форматирует сумму в копейках в читаемый формат
 * @param amount - сумма в копейках
 * @param currency - валюта
 * @returns отформатированная строка
 */
export function formatAmount(amount: number, currency: string = 'RUB'): string {
  const amountInRubles = amount / 100;
  return `${amountInRubles.toFixed(2)} ${currency}`;
}

/**
 * Форматирует дату в читаемый формат
 * @param date - дата
 * @returns отформатированная строка
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Экранирует специальные символы для Markdown
 * @param text - исходный текст
 * @returns экранированный текст
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+-=|{}.!])/g, '\\$1');
}

/**
 * Форматирует статистику платежей в текстовое сообщение
 * @param stats - статистика платежей
 * @returns отформатированное сообщение
 */
export function formatPaymentStats(stats: PaymentStatistics): string {
  const totalAmountFormatted = formatAmount(stats.totalAmount);
  const avgAmountFormatted = formatAmount(stats.averageAmount);

  let message = `📊 **Статистика платежей**\n\n`;
  message += `📈 Общее количество: ${stats.totalPayments}\n`;
  message += `✅ Завершенных: ${stats.completedPayments}\n`;
  message += `❌ Неуспешных: ${stats.failedPayments}\n`;
  message += `💰 Общая сумма: ${escapeMarkdown(totalAmountFormatted)}\n`;
  message += `📊 Средний чек: ${escapeMarkdown(avgAmountFormatted)}\n\n`;

  if (stats.paymentsByStatus.length > 0) {
    message += `📋 **По статусам:**\n`;
    stats.paymentsByStatus.forEach((stat) => {
      const amount = stat._sum.amount || 0;
      const amountFormatted = formatAmount(amount);
      message += `• ${escapeMarkdown(stat.status)}: ${stat._count.status} (${escapeMarkdown(amountFormatted)})\n`;
    });
    message += `\n`;
  }

  if (stats.paymentsByMethod.length > 0) {
    message += `💳 **По методам:**\n`;
    stats.paymentsByMethod.forEach((stat) => {
      const amount = stat._sum.amount || 0;
      const amountFormatted = formatAmount(amount);
      message += `• ${escapeMarkdown(stat.method)}: ${stat._count.method} (${escapeMarkdown(amountFormatted)})\n`;
    });
    message += `\n`;
  }

  if (stats.recentPayments.length > 0) {
    message += `🕐 **Последние платежи:**\n`;
    stats.recentPayments.slice(0, 5).forEach((payment) => {
      const amountFormatted = formatAmount(payment.amount, payment.currency);
      const dateFormatted = formatDate(payment.createdAt);
      const username = payment.user.username
        ? `@${payment.user.username}`
        : `ID: ${payment.user.telegramId}`;
      message += `• ${escapeMarkdown(amountFormatted)} - ${escapeMarkdown(username)} (${escapeMarkdown(dateFormatted)})\n`;
    });
  }

  return message;
}

/**
 * Форматирует историю платежей пользователя
 * @param history - история платежей
 * @returns отформатированное сообщение
 */
export function formatUserPaymentHistory(history: any): string {
  if (history.payments.length === 0) {
    return '📋 У вас пока нет платежей';
  }

  const totalAmountFormatted = formatAmount(history.totalAmount);

  let message = `📋 **Ваша история платежей**\n\n`;
  message += `📊 Всего платежей: ${history.totalPayments}\n`;
  message += `💰 Общая сумма: ${escapeMarkdown(totalAmountFormatted)}\n\n`;

  history.payments.forEach((payment: any, index: number) => {
    const amountFormatted = formatAmount(payment.amount, payment.currency);
    const dateFormatted = formatDate(payment.createdAt);
    const statusEmoji =
      payment.status === 'completed'
        ? '✅'
        : payment.status === 'failed'
          ? '❌'
          : '⏳';

    message += `${index + 1}. ${statusEmoji} ${escapeMarkdown(amountFormatted)}\n`;
    message += `   📅 ${escapeMarkdown(dateFormatted)}\n`;
    if (payment.plan) {
      message += `   📦 ${escapeMarkdown(payment.plan.name)} (${payment.plan.durationDays} дней)\n`;
    }
    message += `   💳 ${escapeMarkdown(payment.method)}\n\n`;
  });

  return message;
}

/**
 * Вычисляет количество дней до истечения подписки
 * @param expiresAt - дата истечения подписки
 * @returns количество дней
 */
export function calculateDaysLeft(expiresAt: Date): number {
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Создает payload для инвойса
 * @param userId - ID пользователя
 * @param planId - ID плана
 * @returns payload строка
 */
export function createInvoicePayload(userId: number, planId: string): string {
  return JSON.stringify({
    userId,
    planId,
    timestamp: Date.now(),
  });
}

/**
 * Парсит payload из инвойса
 * @param payload - payload строка
 * @returns объект с данными
 */
export function parseInvoicePayload(
  payload: string,
): { userId: number; planId: string; timestamp: number } | null {
  try {
    const parsed = JSON.parse(payload);
    if (
      typeof parsed.userId === 'number' &&
      typeof parsed.planId === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
