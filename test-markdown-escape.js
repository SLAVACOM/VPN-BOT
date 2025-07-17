// Тест экранирования Markdown
const {
  escapeUserInput,
  safeMarkdown,
} = require('./dist/src/utils/format.utils.js');

console.log('🧪 Тестируем экранирование Markdown...\n');

// Тестовые данные с проблемными символами
const testData = [
  'telegram_payments',
  'user_name_with_underscores',
  'plan*with*asterisks',
  'plan[with]brackets',
  'plan(with)parentheses',
  'plan{with}braces',
  'plan.with.dots',
  'plan-with-dashes',
  'plan+with+plus',
  'plan=with=equals',
  'plan|with|pipes',
  'plan~with~tildes',
  'plan`with`backticks',
  'plan>with>greater',
  'plan#with#hash',
  'plan!with!exclamation',
];

console.log('📋 Тестируем escapeUserInput:');
console.log('─'.repeat(50));

testData.forEach((text) => {
  const escaped = escapeUserInput(text);
  console.log(`Исходный: "${text}"`);
  console.log(`Экранированный: "${escaped}"`);
  console.log();
});

console.log('📋 Тестируем safeMarkdown:');
console.log('─'.repeat(50));

const systemMessage = `📊 *Статистика:*
• Метод: telegram_payments
• План: premium_plan
• Статус: completed
*Это системное форматирование*`;

console.log('Исходное сообщение:');
console.log(systemMessage);
console.log('\nОбработанное safeMarkdown:');
console.log(safeMarkdown(systemMessage));

console.log('\n💡 Правильное использование:');
const correctUsage = `📊 *Статистика:*
• Метод: ${escapeUserInput('telegram_payments')}
• План: ${escapeUserInput('premium_plan')}
• Статус: ${escapeUserInput('completed')}
*Это системное форматирование*`;

console.log(correctUsage);
