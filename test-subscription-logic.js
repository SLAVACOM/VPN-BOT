// Тест логики подписки - проверяем правильность работы временных интервалов

// Симуляция данных
function testSubscriptionLogic() {
  console.log('🧪 Тестируем логику подписки...\n');

  // Создаем дату подписки (например, подписка создана 17 июля в 14:30)
  const subscriptionCreated = new Date('2025-07-17T14:30:00.000Z');
  console.log(
    '📅 Подписка создана:',
    subscriptionCreated.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
  );

  // Устанавливаем дату окончания на 7 дней позже, но в конце дня
  const subscriptionEnd = new Date(subscriptionCreated);
  subscriptionEnd.setDate(subscriptionEnd.getDate() + 7);
  subscriptionEnd.setHours(23, 59, 59, 999);
  console.log(
    '⏰ Подписка истекает:',
    subscriptionEnd.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
  );

  // Тестируем разные моменты времени
  const testDates = [
    {
      date: new Date('2025-07-24T10:00:00.000Z'),
      description: 'Утром в день истечения (24 июля, 10:00)',
    },
    {
      date: new Date('2025-07-24T20:00:00.000Z'),
      description: 'Вечером в день истечения (24 июля, 20:00)',
    },
    {
      date: new Date('2025-07-24T23:59:00.000Z'),
      description: 'Почти конец дня истечения (24 июля, 23:59)',
    },
    {
      date: new Date('2025-07-25T00:00:00.000Z'),
      description: 'Полночь следующего дня (25 июля, 00:00)',
    },
    {
      date: new Date('2025-07-25T10:00:00.000Z'),
      description: 'Утром следующего дня (25 июля, 10:00)',
    },
  ];

  console.log('\n📊 Проверяем активность подписки в разное время:');
  console.log('─'.repeat(80));

  testDates.forEach(({ date, description }) => {
    // Логика, которую мы используем в коде
    const todayStart = new Date(date);
    todayStart.setHours(0, 0, 0, 0);

    const isActive = subscriptionEnd >= todayStart;
    const status = isActive ? '✅ АКТИВНА' : '❌ НЕАКТИВНА';

    console.log(`${description}: ${status}`);
    console.log(
      `  Проверяем: ${subscriptionEnd.toISOString()} >= ${todayStart.toISOString()}`,
    );
  });

  console.log('\n🔄 Логика планировщика в 00:00:');
  console.log('─'.repeat(50));

  // Проверяем логику планировщика для 25 июля в 00:00
  const schedulerRun = new Date('2025-07-25T00:00:00.000Z');
  console.log(
    `Планировщик запускается: ${schedulerRun.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
  );

  // Вчерашний день для планировщика
  const yesterday = new Date(schedulerRun);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  console.log(
    `Ищем подписки, истекшие вчера (${yesterday.toLocaleDateString('ru-RU')} - ${endOfYesterday.toLocaleDateString('ru-RU')})`,
  );

  const shouldBeExpired =
    subscriptionEnd >= yesterday && subscriptionEnd <= endOfYesterday;
  console.log(
    `Подписка попадает в интервал вчерашнего дня: ${shouldBeExpired ? 'ДА' : 'НЕТ'}`,
  );
  console.log(
    `Проверяем: ${subscriptionEnd.toISOString()} >= ${yesterday.toISOString()} && ${subscriptionEnd.toISOString()} <= ${endOfYesterday.toISOString()}`,
  );

  if (shouldBeExpired) {
    console.log(
      '🚫 Планировщик отключит доступ и отправит уведомление об истечении',
    );
  } else {
    console.log('✅ Планировщик НЕ будет отключать доступ');
  }

  console.log('\n💡 Вывод:');
  console.log('• Подписка активна весь день истечения (до 23:59:59)');
  console.log('• Уведомление об истечении отправляется в 00:00 следующего дня');
  console.log('• Доступ отключается в 00:00 следующего дня');
}

testSubscriptionLogic();
