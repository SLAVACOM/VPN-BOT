import { Logger } from '@nestjs/common';

/**
 * Валидирует Telegram ID
 * @param telegramId - ID для валидации
 * @returns true если валидный
 */
export function isValidTelegramId(telegramId: any): boolean {
  return typeof telegramId === 'number' && telegramId > 0;
}

/**
 * Валидирует сумму платежа
 * @param amount - сумма для валидации
 * @returns true если валидная
 */
export function isValidAmount(amount: any): boolean {
  return typeof amount === 'number' && amount > 0;
}

/**
 * Валидирует email адрес
 * @param email - email для валидации
 * @returns true если валидный
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Валидирует username Telegram
 * @param username - username для валидации
 * @returns true если валидный
 */
export function isValidUsername(username: string): boolean {
  // Username должен быть от 5 до 32 символов, содержать только буквы, цифры и подчеркивания
  const usernameRegex = /^[a-zA-Z0-9_]{5,32}$/;
  return usernameRegex.test(username);
}

/**
 * Валидирует ID плана
 * @param planId - ID плана для валидации
 * @returns true если валидный
 */
export function isValidPlanId(planId: any): boolean {
  return typeof planId === 'string' && planId.length > 0;
}

/**
 * Безопасное преобразование в число
 * @param value - значение для преобразования
 * @param defaultValue - значение по умолчанию
 * @returns число или значение по умолчанию
 */
export function safeParseInt(value: any, defaultValue: number = 0): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Безопасное преобразование в bigint
 * @param value - значение для преобразования
 * @param defaultValue - значение по умолчанию
 * @returns bigint или значение по умолчанию
 */
export function safeParseBigInt(
  value: any,
  defaultValue: bigint = BigInt(0),
): bigint {
  try {
    return BigInt(value);
  } catch {
    return defaultValue;
  }
}

/**
 * Очищает строку от лишних пробелов
 * @param str - строка для очистки
 * @returns очищенная строка
 */
export function sanitizeString(str: string): string {
  return str?.trim() || '';
}

/**
 * Логирует ошибку с контекстом
 * @param logger - экземпляр логгера
 * @param error - ошибка
 * @param context - контекст ошибки
 */
export function logError(logger: Logger, error: any, context: string): void {
  logger.error(`Error in ${context}: ${error.message}`, error.stack);
}

/**
 * Создает уникальный ID для операций
 * @returns уникальная строка
 */
export function generateOperationId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Проверяет, является ли пользователь администратором
 * @param telegramId - Telegram ID пользователя
 * @returns true если администратор
 */
export function isAdmin(telegramId: number): boolean {
  const adminIds =
    process.env.ADMIN_IDS?.split(',').map((id) => parseInt(id.trim(), 10)) ||
    [];
  return adminIds.includes(telegramId);
}

/**
 * Извлекает ID пользователя из callback data
 * @param callbackData - данные callback
 * @returns ID пользователя или null
 */
export function extractUserIdFromCallback(callbackData: string): number | null {
  try {
    const parts = callbackData.split('_');
    const userIdIndex = parts.findIndex((part) => part === 'user') + 1;
    if (userIdIndex > 0 && userIdIndex < parts.length) {
      return parseInt(parts[userIdIndex], 10);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Создает callback data из объекта
 * @param action - основное действие
 * @param data - дополнительные данные
 * @returns строка callback data
 */
export function createCallbackData(
  action: string,
  data: Record<string, any> = {},
): string {
  const parts = [action];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      parts.push(`${key}_${value}`);
    }
  });

  return parts.join('_');
}
