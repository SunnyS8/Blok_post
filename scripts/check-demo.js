#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDemoData() {
  try {
    console.log('🔍 Проверка демо данных...\n');

    const users = await prisma.user.count();
    const stores = await prisma.store.count();
    const products = await prisma.product.count();
    const sales = await prisma.sale.count();
    const inventory = await prisma.inventory.count();

    console.log(`👤 Пользователи: ${users}`);
    console.log(`🏪 Магазины: ${stores}`);
    console.log(`🛍️ Товары: ${products}`);
    console.log(`💰 Продажи: ${sales}`);
    console.log(`📦 Остатки: ${inventory}`);

    if (users > 0 && stores > 0 && products > 0) {
      console.log('\n✅ Демо данные готовы!');
      console.log('🚀 Запустите приложение командой: npm run dev');
    } else {
      console.log('\n❌ Демо данные отсутствуют!');
      console.log('📦 Создайте демо данные командой: npm run db:seed');
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке данных:', error.message);
    console.log('💡 Возможно, нужно инициализировать базу данных: npm run db:migrate');
  } finally {
    await prisma.$disconnect();
  }
}

checkDemoData();