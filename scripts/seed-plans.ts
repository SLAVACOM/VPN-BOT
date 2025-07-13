import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding subscription plans...');

  const existingPlans = await prisma.subscriptionPlan.count();

  if (existingPlans > 0) {
    console.log('Plans already exist in database. Skipping...');
    return;
  }

  const plans = [
    {
      name: '🟢 Базовый',
      durationDays: 30,
      price: BigInt(19900), 
      currency: 'RUB',
      description: '30 дней VPN доступа',
      isActive: true,
    },
    {
      name: '🔵 Стандарт',
      durationDays: 90,
      price: BigInt(49900), 
      currency: 'RUB',
      description: '3 месяца VPN доступа',
      isActive: true,
    },
    {
      name: '🟡 Премиум',
      durationDays: 365,
      price: BigInt(159900), 
      currency: 'RUB',
      description: '1 год VPN доступа',
      isActive: true,
    },
  ];

  for (const plan of plans) {
    const created = await prisma.subscriptionPlan.create({
      data: plan,
    });
    console.log(`Created plan: ${created.name} (ID: ${created.id})`);
  }

  console.log('Subscription plans added successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
