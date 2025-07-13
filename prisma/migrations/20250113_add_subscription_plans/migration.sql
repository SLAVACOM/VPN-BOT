-- Добавляем начальные планы подписки
INSERT INTO "SubscriptionPlan" (name, "durationDays", price, currency, description, "isActive") VALUES
('🟢 Базовый', 30, 19900, 'RUB', '30 дней VPN доступа', true),
('🔵 Стандарт', 90, 49900, 'RUB', '3 месяца VPN доступа', true),
('🟡 Премиум', 365, 159900, 'RUB', '1 год VPN доступа', true);
