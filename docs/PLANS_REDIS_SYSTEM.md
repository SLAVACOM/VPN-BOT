# Система управления планами подписки с Redis кэшированием

## Обзор

Система была обновлена для получения планов подписки из базы данных PostgreSQL с кэшированием в Redis для повышения производительности.

## Основные компоненты

### 1. PaymentService

- Получает планы из базы данных с кэшированием
- Автоматически обновляет кэш при изменениях
- Поддерживает fallback при ошибках

### 2. PlanAdminService

- Административный интерфейс для управления планами
- Создание, обновление, деактивация планов
- Статистика по планам и платежам
- Автоматическая очистка кэша при изменениях

### 3. RedisCacheModule

- Настройка Redis для кэширования
- TTL: 24 часа по умолчанию
- Поддержка паролей и кастомных настроек

## Настройка окружения

Добавьте в ваш `.env` файл:

```bash
# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Структура базы данных

### SubscriptionPlan

```sql
CREATE TABLE "SubscriptionPlan" (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  durationDays INTEGER NOT NULL,
  price BIGINT NOT NULL, -- в копейках
  currency VARCHAR NOT NULL,
  description TEXT,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## Использование

### Получение планов

```typescript
// Асинхронное получение планов (с кэшированием)
const plans = await paymentService.getPlans();

// Получение конкретного плана
const plan = await paymentService.getPlanById('1');
```

### Административные операции

```typescript
// Создание нового плана
const newPlan = await planAdminService.createPlan({
  name: '🆕 Новый план',
  durationDays: 60,
  price: 39900, // 399 рублей в копейках
  currency: 'RUB',
  description: '2 месяца VPN доступа',
});

// Обновление плана
await planAdminService.updatePlan(1, {
  price: 49900, // новая цена
});

// Деактивация плана
await planAdminService.deletePlan(1);
```

## Кэширование

### Ключи кэша

- `payment_plans` - активные планы подписки

### TTL (время жизни)

- Планы: 24 часа
- Автоматическая очистка при изменениях

### Стратегия кэширования

1. Проверка кэша
2. Если данных нет - запрос к БД
3. Сохранение в кэш
4. Автоматическая очистка при изменениях

## Миграция данных

Для добавления начальных планов:

```bash
npm run build
npx ts-node scripts/seed-plans.ts
```

## Мониторинг

### Логирование

- `[PAYMENT] Plans loaded from cache` - данные из кэша
- `[PAYMENT] Loading plans from database` - загрузка из БД
- `[PAYMENT] Plans cached for X seconds` - сохранение в кэш
- `[ADMIN] Created/Updated/Deactivated plan` - административные операции

### Статистика

```typescript
const stats = await planAdminService.getPlansStatistics();
console.log(stats);
// {
//   totalPlans: 3,
//   activePlans: 3,
//   inactivePlans: 0,
//   paymentsByPlan: [...]
// }
```

## Производительность

### Преимущества Redis кэширования:

- Снижение нагрузки на базу данных
- Быстрый отклик API (< 1ms из кэша vs ~10-50ms из БД)
- Автоматическое управление кэшем
- Устойчивость к высоким нагрузкам

### Рекомендации:

- Используйте отдельный Redis сервер для продакшена
- Настройте мониторинг Redis
- Регулярно проверяйте hit rate кэша
- При необходимости увеличьте TTL для планов (они редко меняются)

## Troubleshooting

### Проблемы с Redis

1. Проверьте подключение: `redis-cli ping`
2. Проверьте логи приложения на ошибки подключения
3. Fallback: система работает без Redis, но медленнее

### Проблемы с планами

1. Проверьте наличие планов в БД: `SELECT * FROM "SubscriptionPlan";`
2. Очистите кэш: `await paymentService.clearPlansCache()`
3. Проверьте миграции: `npx prisma migrate status`

### Отладка кэша

```typescript
// Ручная очистка кэша
await paymentService.clearPlansCache();

// Проверка содержимого кэша
const cached = await cacheManager.get('payment_plans');
console.log('Cached plans:', cached);
```
