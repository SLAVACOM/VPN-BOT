# Архитектура проекта

## Структура кода

Проект был рефакторен для улучшения читаемости и поддерживаемости кода. Все DTOs, интерфейсы и утилиты вынесены в отдельные файлы.

### 📁 src/payment/

- `dto/` - Data Transfer Objects для платежей
- `interfaces/` - Интерфейсы для типизации данных платежей
- `payment.service.ts` - Основной сервис платежей
- `payment-history.service.ts` - Сервис истории платежей
- `plan-admin.service.ts` - Админский сервис управления планами

### 📁 src/user/

- `interfaces/` - Интерфейсы для пользователей
- `user.service.ts` - Сервис управления пользователями

### 📁 src/bot/

- `interfaces/` - Интерфейсы для Telegram бота
- `bot.update.ts` - Обработчик команд и событий бота

### 📁 src/utils/

- `format.utils.ts` - Утилиты для форматирования данных
- `keyboard.utils.ts` - Утилиты для создания клавиатур
- `validation.utils.ts` - Утилиты для валидации данных

## DTOs (Data Transfer Objects)

### PaymentDTO

- `CreatePaymentDto` - для создания нового платежа
- `UpdatePaymentDto` - для обновления платежа
- `PaymentStatsDto` - для статистики платежей

## Интерфейсы

### Payment Interfaces

- `PaymentPlan` - структура плана подписки
- `PaymentCallbackData` - данные callback от платежных систем
- `PaymentStatistics` - статистика платежей
- `PaginatedPayments` - пагинированные платежи

### User Interfaces

- `UserWithSubscription` - пользователь с данными подписки
- `CreateUserData` - данные для создания пользователя
- `UserSubscriptionInfo` - информация о подписке

### Bot Interfaces

- `TelegramContext` - контекст Telegram
- `KeyboardButton` - кнопка клавиатуры
- `InlineKeyboard` - inline клавиатура
- `CommandResponse` - ответ на команду

## Утилиты

### Format Utils

- `formatAmount()` - форматирование суммы
- `formatDate()` - форматирование даты
- `escapeMarkdown()` - экранирование для Markdown
- `formatPaymentStats()` - форматирование статистики платежей
- `formatUserPaymentHistory()` - форматирование истории платежей

### Keyboard Utils

- `createButton()` - создание кнопки
- `createInlineKeyboard()` - создание inline клавиатуры
- `createPlansKeyboard()` - клавиатура планов
- `createPaginationKeyboard()` - пагинация
- `createMainMenuKeyboard()` - главное меню
- `createAdminMenuKeyboard()` - админское меню

### Validation Utils

- `isValidTelegramId()` - валидация Telegram ID
- `isValidAmount()` - валидация суммы
- `isValidEmail()` - валидация email
- `isAdmin()` - проверка админских прав
- `createCallbackData()` - создание callback данных
- `safeParseInt()` - безопасное преобразование в число

## Преимущества рефакторинга

1. **Разделение ответственности** - каждый файл отвечает за конкретную область
2. **Переиспользование кода** - общие утилиты вынесены в отдельные модули
3. **Типобезопасность** - четкие интерфейсы для всех данных
4. **Легкость тестирования** - утилиты можно тестировать отдельно
5. **Улучшенная читаемость** - код стал более структурированным
6. **Облегченная поддержка** - изменения легче вносить и отслеживать

## Импорты

Для удобства созданы индексные файлы, позволяющие импортировать несколько элементов из одного модуля:

```typescript
import { formatAmount, formatDate } from '../utils';
import { PaymentPlan, CreateInvoiceResult } from './interfaces';
import { CreatePaymentDto } from './dto';
```

## Решение проблем

1. **Markdown парсинг** - добавлено экранирование специальных символов
2. **Конфликты имен** - переименованы локальные переменные для избежания конфликтов
3. **Типизация** - добавлены строгие типы для всех данных
4. **Валидация** - централизованная валидация данных
