# 🚀 Инструкция по настройке CI/CD для VPN-BOT

## 📋 Необходимые GitHub Secrets

Для автоматического деплоя необходимо настроить следующие секреты в GitHub:

### 🔐 SSH подключение к серверу

```
SSH_HOST=your-server-ip-or-domain
SSH_USER=your-server-username
SSH_KEY=your-private-ssh-key
```

### 🗄️ База данных

```
DATABASE_NAME=nest_tg_bot
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_postgres_password
```

### 📦 Redis

```
REDIS_PASSWORD=your_secure_redis_password
```

### 🤖 Telegram Bot

```
BOT_TOKEN=your_telegram_bot_token
ADMIN_IDS=123456789,987654321
```

### 🔗 WireGuard API

```
WIREGUARD_API=http://your-wireguard-api:51821
WIREGUARD_PASSWORD=your_wireguard_password
```

### 💳 Платежи (опционально)

```
PAYMENT_PROVIDER_TOKEN=your_payment_provider_token
```

### 📢 Уведомления в Telegram

```
TELEGRAM_CHAT_ID=your_chat_id_for_notifications
TELEGRAM_BOT_TOKEN=your_notification_bot_token
```

## 🖥️ Подготовка сервера

### 1. Установка Docker и Docker Compose

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo apt install docker-compose-plugin -y

# Перезапуск сессии или сервера
newgrp docker
```

### 2. Создание директории проекта

```bash
sudo mkdir -p /opt/nest-tg-bot
sudo chown $USER:$USER /opt/nest-tg-bot
cd /opt/nest-tg-bot
```

### 3. Настройка SSH ключей

```bash
# На локальной машине генерируем SSH ключ
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Копируем публичный ключ на сервер
ssh-copy-id your-user@your-server

# Приватный ключ добавляем в GitHub Secrets как SSH_KEY
cat ~/.ssh/id_rsa
```

### 4. Подготовка SSL сертификатов (опционально)

```bash
# Создание директории для SSL
mkdir -p /opt/nest-tg-bot/ssl

# Самоподписанный сертификат для разработки
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/nest-tg-bot/ssl/key.pem \
  -out /opt/nest-tg-bot/ssl/cert.pem

# Или использовать Let's Encrypt для production
sudo apt install certbot -y
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/nest-tg-bot/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/nest-tg-bot/ssl/key.pem
sudo chown $USER:$USER /opt/nest-tg-bot/ssl/*
```

## 🔧 Настройка GitHub Secrets

1. Перейдите в репозиторий на GitHub
2. Settings → Secrets and variables → Actions
3. Нажмите "New repository secret"
4. Добавьте все секреты из списка выше

## 🚀 Процесс деплоя

После push в ветку `main`:

1. ✅ GitHub Action запускается автоматически
2. 🔄 Подключается к серверу по SSH
3. 📥 Клонирует/обновляет код из репозитория
4. 🔧 Создает .env файл с секретами
5. 🐳 Пересобирает и запускает Docker контейнеры
6. 🗄️ Выполняет миграции базы данных
7. 🧹 Очищает старые Docker образы
8. 🏥 Проверяет здоровье приложения
9. 📱 Отправляет уведомление в Telegram

## 📊 Мониторинг

### Проверка статуса контейнеров

```bash
cd /opt/nest-tg-bot
docker-compose ps
docker-compose logs -f app
```

### Health check

```bash
curl http://localhost:3000/health
```

### Просмотр логов

```bash
docker-compose logs --tail=50 app
docker-compose logs --tail=50 postgres
docker-compose logs --tail=50 redis
```

## 🔧 Ручной деплой

Если нужно выполнить деплой вручную:

```bash
cd /opt/nest-tg-bot
git pull origin main
docker-compose down
docker-compose up -d --build
docker-compose exec app npx prisma migrate deploy
```

## 🆘 Решение проблем

### Контейнер не запускается

```bash
docker-compose logs app
docker-compose down
docker-compose up --build
```

### Проблемы с базой данных

```bash
docker-compose exec postgres psql -U postgres -d nest_tg_bot
docker-compose exec app npx prisma migrate status
docker-compose exec app npx prisma migrate reset --force
```

### Очистка Docker

```bash
docker system prune -a -f
docker volume prune -f
```

## 🔒 Безопасность

1. ✅ Используйте сильные пароли для всех сервисов
2. ✅ Регулярно обновляйте сертификаты SSL
3. ✅ Ограничьте SSH доступ только необходимыми IP
4. ✅ Используйте firewall для ограничения портов
5. ✅ Регулярно обновляйте систему и Docker

## 📈 Масштабирование

Для масштабирования можно:

- Добавить несколько реплик приложения в docker-compose.yml
- Использовать Docker Swarm или Kubernetes
- Настроить Load Balancer
- Добавить monitoring с Prometheus + Grafana
