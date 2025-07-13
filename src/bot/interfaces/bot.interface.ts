export interface TelegramUserContext {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  text?: string;
  from?: TelegramUserContext;
  chat: {
    id: number;
    type: string;
  };
}

export interface TelegramContext {
  message?: TelegramMessage;
  from?: TelegramUserContext;
  chat?: {
    id: number;
    type: string;
  };
}

export interface KeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface InlineKeyboard {
  inline_keyboard: KeyboardButton[][];
}

export interface CommandResponse {
  text: string;
  keyboard?: InlineKeyboard;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface CallbackData {
  action: string;
  data?: string;
  userId?: number;
  planId?: string;
  page?: number;
}
