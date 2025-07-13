# VPN Telegram Bot with Payment System

Telegram бот для управления VPN подпиской с системой платежей через ЮKassa.

## Возможности

### 🔐 Основные функции

- ✅ Регистрация пользователей
- ✅ Выдача WireGuard конфигураций
- ✅ QR-коды для быстрого подключения
- ✅ Скачивание конфигурационных файлов

### 👥 Реферальная система

- ✅ Реферальные ссылки
- ✅ Статистика приглашенных пользователей
- ✅ Отслеживание связей между пользователями

### 🎫 Промокоды

- ✅ Создание промокодов (админ)
- ✅ Активация промокодов пользователями
- ✅ Ограничения по количеству использований
- ✅ Срок действия промокодов

### 💰 Система платежей (NEW!)

- ✅ Интеграция с Telegram Payments
- ✅ Платежи прямо в Telegram (не покидая мессенджер)
- ✅ Несколько планов подписки
- ✅ Автоматическая активация после оплаты
- ✅ Поддержка множества платежных провайдеров
- ✅ Безопасные платежи через Telegram

### 🎛️ Интерфейс

- ✅ Интерактивные inline-клавиатуры
- ✅ Система помощи с подсказками
- ✅ Быстрые действия
- ✅ Админская панель

## Технологии

- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Bot Framework**: Telegraf
- **Payments**: Telegram Payments API
- **VPN**: WireGuard API Integration
- **Image Processing**: Sharp (для QR-кодов)

## Быстрый старт

### 1. Установка зависимостей

\`\`\`bash
npm install
\`\`\`

### 2. Настройка окружения

Скопируйте \`.env.example\` в \`.env\` и заполните переменные:

\`\`\`env

# Telegram Bot

BOT_TOKEN=your_telegram_bot_token

# ЮKassa

YOUKASSA_SHOP_ID=your_shop_id
YOUKASSA_SECRET_KEY=your_secret_key

# WireGuard API

WG_API_URL=your_wireguard_api_url

# Database

DATABASE_URL="postgresql://username:password@localhost:5432/database"

# Admin IDs

ADMIN_IDS=123456789,987654321
\`\`\`

### 3. Настройка базы данных

\`\`\`bash
npx prisma migrate dev
npx prisma generate
\`\`\`

### 4. Запуск

\`\`\`bash

# Development

npm run start:dev

# Production

npm run build
npm run start:prod
\`\`\`

## Команды бота

### Пользовательские команды

- \`/start\` - регистрация и главное меню
- \`/help\` - справка по командам
- \`/menu\` - главное меню
- \`/ref\` - получить реферальную ссылку
- \`/stats\` - статистика рефералов
- \`/qr\` - QR-код для WireGuard
- \`/config\` - скачать конфигурацию
- \`/promo <код>\` - активировать промокод
- \`/subscription\` - информация о подписке
- \`/buy\` - купить подписку
- \`/checkref\` - проверить реферера

### Админские команды

- \`/createpromo <код> <дни> [макс] [описание]\` - создать промокод
- \`/listpromos\` - список промокодов

## Планы подписки

По умолчанию доступны следующие планы:

| План        | Период   | Цена   | Описание              |
| ----------- | -------- | ------ | --------------------- |
| 🟢 Базовый  | 30 дней  | 199 ₽  | Месячная подписка     |
| 🔵 Стандарт | 90 дней  | 499 ₽  | 3 месяца (популярный) |
| 🟡 Премиум  | 365 дней | 1599 ₽ | Годовая подписка      |

Планы можно настроить в \`src/payment/payment.service.ts\`.

## Настройка платежей

Подробная инструкция по настройке Telegram Payments находится в файле [PAYMENT_SETUP.md](./PAYMENT_SETUP.md).

### Основные шаги:

1. Обратитесь к @BotFather
2. Настройте платежного провайдера
3. Получите provider_token
4. Добавьте token в .env

## API Endpoints

_Все взаимодействие происходит через Telegram Bot API_

## Структура проекта

\`\`\`
src/
├── bot/ # Telegram bot logic
│ ├── bot.module.ts
│ └── bot.update.ts
├── user/ # User management
│ ├── user.module.ts
│ └── user.service.ts
├── payment/ # Payment system
│ ├── payment.module.ts
│ └── payment.service.ts
├── webhook/ # Webhook handlers
│ ├── webhook.module.ts
│ └── webhook.controller.ts
├── wireGuardService/ # WireGuard API integration
└── prisma/ # Database schema and client
\`\`\`

## База данных

Используется PostgreSQL с Prisma ORM. Основные модели:

- \`User\` - пользователи
- \`Payment\` - платежи
- \`PromoCode\` - промокоды
- \`SubscriptionPlan\` - планы подписки
- \`EventLog\` - логи событий

## Разработка

\`\`\`bash

# Запуск в dev режиме

npm run start:dev

# Тесты

npm run test

# Линтер

npm run lint

# Форматирование

npm run format
\`\`\`

## Развертывание

1. Настройте production переменные окружения
2. Настройте webhook URL в ЮKassa
3. Убедитесь в наличии HTTPS
4. Запустите миграции БД
5. Запустите приложение

## Безопасность

- Все платежи проходят через ЮKassa
- Webhook'и обрабатываются через HTTPS
- Секретные ключи хранятся в переменных окружения
- Логирование всех критических операций

## Поддержка

Для вопросов и предложений создавайте Issues в репозитории.

## Лицензия

MIT
