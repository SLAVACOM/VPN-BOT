import {
  InlineKeyboard,
  KeyboardButton,
} from '../bot/interfaces/bot.interface';

/**
 * Создает кнопку для inline клавиатуры
 * @param text - текст кнопки
 * @param callbackData - данные для callback
 * @returns объект кнопки
 */
export function createButton(
  text: string,
  callbackData: string,
): KeyboardButton {
  return {
    text,
    callback_data: callbackData,
  };
}

/**
 * Создает кнопку с URL
 * @param text - текст кнопки
 * @param url - URL для перехода
 * @returns объект кнопки
 */
export function createUrlButton(text: string, url: string): KeyboardButton {
  return {
    text,
    url,
  };
}

/**
 * Создает inline клавиатуру из массива кнопок
 * @param buttons - массив массивов кнопок (ряды)
 * @returns объект клавиатуры
 */
export function createInlineKeyboard(
  buttons: KeyboardButton[][],
): InlineKeyboard {
  return {
    inline_keyboard: buttons,
  };
}

/**
 * Создает клавиатуру для планов подписки
 * @param plans - массив планов
 * @returns объект клавиатуры
 */
export function createPlansKeyboard(plans: any[]): InlineKeyboard {
  const buttons = plans.map((plan) => [
    createButton(
      `${plan.name} - ${plan.price / 100} ₽ (${plan.durationDays} дней)`,
      `buy_plan_${plan.id}`,
    ),
  ]);

  return createInlineKeyboard(buttons);
}

/**
 * Создает клавиатуру для навигации по страницам
 * @param currentPage - текущая страница
 * @param totalPages - общее количество страниц
 * @param baseAction - базовое действие для callback
 * @returns объект клавиатуры
 */
export function createPaginationKeyboard(
  currentPage: number,
  totalPages: number,
  baseAction: string,
): InlineKeyboard {
  const buttons: KeyboardButton[][] = [];

  if (totalPages > 1) {
    const row: KeyboardButton[] = [];

    if (currentPage > 1) {
      row.push(
        createButton('◀️ Назад', `${baseAction}_page_${currentPage - 1}`),
      );
    }

    row.push(createButton(`${currentPage}/${totalPages}`, 'noop'));

    if (currentPage < totalPages) {
      row.push(
        createButton('Вперед ▶️', `${baseAction}_page_${currentPage + 1}`),
      );
    }

    buttons.push(row);
  }

  return createInlineKeyboard(buttons);
}

/**
 * Создает главное меню пользователя
 * @returns объект клавиатуры
 */
export function createMainMenuKeyboard(): InlineKeyboard {
  return createInlineKeyboard([
    [createButton('💎 Подписка', 'subscription_info')],
    [createButton('🛒 Планы', 'view_plans')],
    [createButton('📋 История платежей', 'payment_history')],
    [createButton('ℹ️ Помощь', 'help')],
  ]);
}

/**
 * Создает меню администратора
 * @returns объект клавиатуры
 */
export function createAdminMenuKeyboard(): InlineKeyboard {
  return createInlineKeyboard([
    [createButton('📊 Статистика платежей', 'admin_payment_stats')],
    [createButton('👥 Статистика пользователей', 'admin_user_stats')],
    [createButton('💳 Управление планами', 'admin_plans')],
    [createButton('🔄 Очистить кэш', 'admin_clear_cache')],
  ]);
}

/**
 * Создает кнопку "Назад"
 * @param action - действие для возврата
 * @returns массив с одной кнопкой
 */
export function createBackButton(
  action: string = 'main_menu',
): KeyboardButton[][] {
  return [[createButton('🔙 Назад', action)]];
}
