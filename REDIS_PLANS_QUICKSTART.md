# Краткое руководство по новой системе планов

## ✅ Что было реализовано

1. **База данных для планов**: Планы теперь хранятся в PostgreSQL таблице `SubscriptionPlan`
2. **Redis кэширование**: Автоматическое кэширование планов для быстрого доступа
3. **Административный интерфейс**: Команды для управления планами через бота
4. **Автоматическая очистка кэша**: При изменениях планов кэш автоматически обновляется

## 🚀 Запуск системы

### 1. Установите Redis

```bash
# Windows (через Chocolatey)
choco install redis-64

# Ubuntu/Debian
sudo apt install redis-server

# macOS (через Homebrew)
brew install redis
```

### 2. Настройте переменные окружения

```bash
# Добавьте в .env файл
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 3. Запустите миграции и добавьте планы

```bash
npx prisma migrate dev
npx ts-node scripts/seed-plans.ts
```

### 4. Запустите бота

```bash
npm run start:dev
```

## 📋 Новые админские команды

- `/listplans` - Просмотр всех планов и статистики
- `/clearplanscache` - Очистка кэша планов
- Кнопки в админском меню: "📋 Список планов", "🗑️ Очистить кэш"

## 🔧 Преимущества новой системы

1. **Производительность**: Планы кэшируются в Redis на 24 часа
2. **Гибкость**: Легко добавлять новые планы через БД
3. **Масштабируемость**: Система готова к высоким нагрузкам
4. **Мониторинг**: Подробное логирование всех операций
5. **Надежность**: Fallback при недоступности Redis

## 📊 Мониторинг

### Логи системы:

- `[PAYMENT] Plans loaded from cache` - данные из кэша
- `[PAYMENT] Loading plans from database` - загрузка из БД
- `[PAYMENT] Plans cached for 86400 seconds` - сохранение в кэш
- `[ADMIN] Created/Updated/Deactivated plan` - операции с планами

### Команды для мониторинга:

- `/listplans` - показывает количество активных/неактивных планов
- Redis CLI: `redis-cli info keyspace` - информация о кэше

## 🔄 Разработка

### Добавление нового плана через код:

```typescript
const newPlan = await planAdminService.createPlan({
  name: '🆕 Специальный',
  durationDays: 15,
  price: 9900, // 99 рублей в копейках
  currency: 'RUB',
  description: '2 недели VPN доступа',
});
```

### Обновление плана:

```typescript
await planAdminService.updatePlan(planId, {
  price: 14900, // новая цена
  isActive: true,
});
```

## ⚠️ Важные моменты

1. **Цены в копейках**: Все цены хранятся в копейках (199₽ = 19900)
2. **Автоочистка кэша**: При изменении планов кэш очищается автоматически
3. **Fallback**: Если Redis недоступен, система работает напрямую с БД
4. **TTL кэша**: 24 часа, можно изменить в `PaymentService.CACHE_TTL`

## 🔧 Troubleshooting

**Redis не работает:**

- Проверьте: `redis-cli ping` должен вернуть `PONG`
- Система продолжит работать без Redis, но медленнее

**Планы не отображаются:**

- Проверьте БД: `SELECT * FROM "SubscriptionPlan";`
- Очистите кэш: `/clearplanscache`
- Проверьте логи на ошибки

**Проблемы с кэшем:**

- Перезапустите Redis: `redis-server`
- Очистите весь кэш: `redis-cli flushall`
