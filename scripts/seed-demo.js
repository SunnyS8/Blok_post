#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoData() {
  try {
    console.log('🚀 Создание демо данных для BlokPOST...');

    // Создание пользователей
    console.log('👤 Создание пользователей...');
    const hashedPassword = await bcrypt.hash('demo123', 10);

    const owner = await prisma.user.create({
      data: {
        email: 'owner@blokpost.ru',
        password: hashedPassword,
        role: 'owner'
      }
    });

    const analyst = await prisma.user.create({
      data: {
        email: 'analyst@blokpost.ru',
        password: hashedPassword,
        role: 'analyst'
      }
    });

    const manager1 = await prisma.user.create({
      data: {
        email: 'manager1@blokpost.ru',
        password: hashedPassword,
        role: 'store_manager'
      }
    });

    const manager2 = await prisma.user.create({
      data: {
        email: 'manager2@blokpost.ru',
        password: hashedPassword,
        role: 'store_manager'
      }
    });

    console.log('🏪 Создание магазинов...');
    const store1 = await prisma.store.create({
      data: {
        code: 'Г-1 К',
        name: 'Магазин №1 - Центральный',
        address: 'ул. Ленина, 15',
        region: 'Центральный район',
        managerId: manager1.id
      }
    });

    const store2 = await prisma.store.create({
      data: {
        code: 'Г-2 Б',
        name: 'Магазин №2 - Северный',
        address: 'пр. Победы, 45',
        region: 'Северный район',
        managerId: manager2.id
      }
    });

    console.log('📂 Создание категорий товаров...');
    const category1 = await prisma.productCategory.create({
      data: {
        name: 'Спецодежда'
      }
    });

    const category2 = await prisma.productCategory.create({
      data: {
        name: 'Средства защиты'
      }
    });

    const category3 = await prisma.productCategory.create({
      data: {
        name: 'Обувь'
      }
    });

    console.log('🛍️ Создание товаров...');
    const products = await Promise.all([
      prisma.product.create({
        data: {
          name: 'Костюм химзащиты',
          categoryId: category1.id,
          sku: 'CHEM-001',
          description: 'Комплект химической защиты',
          price: 15000.00
        }
      }),
      prisma.product.create({
        data: {
          name: 'Перчатки нитриловые',
          categoryId: category2.id,
          sku: 'GLOV-001',
          description: 'Защитные перчатки',
          price: 250.00
        }
      }),
      prisma.product.create({
        data: {
          name: 'Ботинки кожаные',
          categoryId: category3.id,
          sku: 'BOOT-001',
          description: 'Рабочие ботинки',
          price: 3500.00
        }
      }),
      prisma.product.create({
        data: {
          name: 'Куртка сигнальная',
          categoryId: category1.id,
          sku: 'JACK-001',
          description: 'Сигнальная куртка',
          price: 2800.00
        }
      }),
      prisma.product.create({
        data: {
          name: 'Очки защитные',
          categoryId: category2.id,
          sku: 'GLAS-001',
          description: 'Защитные очки',
          price: 450.00
        }
      })
    ]);

    console.log('📦 Создание остатков...');
    await Promise.all([
      // Магазин 1
      prisma.inventory.create({
        data: { storeId: store1.id, productId: products[0].id, quantity: 5 }
      }),
      prisma.inventory.create({
        data: { storeId: store1.id, productId: products[1].id, quantity: 50 }
      }),
      prisma.inventory.create({
        data: { storeId: store1.id, productId: products[2].id, quantity: 12 }
      }),
      // Магазин 2
      prisma.inventory.create({
        data: { storeId: store2.id, productId: products[3].id, quantity: 8 }
      }),
      prisma.inventory.create({
        data: { storeId: store2.id, productId: products[4].id, quantity: 30 }
      })
    ]);

    console.log('💰 Создание продаж...');
    const sales = await Promise.all([
      prisma.sale.create({
        data: {
          storeId: store1.id,
          date: new Date('2024-01-15'),
          totalAmount: 15750.00,
          items: JSON.stringify([
            { productId: products[0].id, quantity: 1, unitPrice: 15000.00 },
            { productId: products[1].id, quantity: 3, unitPrice: 250.00 }
          ])
        }
      }),
      prisma.sale.create({
        data: {
          storeId: store1.id,
          date: new Date('2024-01-20'),
          totalAmount: 3500.00,
          items: JSON.stringify([
            { productId: products[2].id, quantity: 1, unitPrice: 3500.00 }
          ])
        }
      }),
      prisma.sale.create({
        data: {
          storeId: store2.id,
          date: new Date('2024-01-18'),
          totalAmount: 3250.00,
          items: JSON.stringify([
            { productId: products[3].id, quantity: 1, unitPrice: 2800.00 },
            { productId: products[4].id, quantity: 1, unitPrice: 450.00 }
          ])
        }
      })
    ]);

    console.log('📊 Создание KPI...');
    const kpi1 = await prisma.kPIDictionary.create({
      data: {
        name: 'Выручка на магазин',
        formula: 'SUM(sales.totalAmount)',
        description: 'Общая выручка магазина за период',
        category: 'Финансовые'
      }
    });

    const kpi2 = await prisma.kPIDictionary.create({
      data: {
        name: 'Средний чек',
        formula: 'AVG(sales.totalAmount)',
        description: 'Средняя сумма одной продажи',
        category: 'Продажи'
      }
    });

    console.log('🎯 Создание маркетинговых активностей...');
    await Promise.all([
      prisma.marketingActivity.create({
        data: {
          storeId: store1.id,
          activityType: 'Реклама в соцсетях',
          description: 'Продвижение в VK и Telegram',
          cost: 15000.00,
          date: new Date('2024-01-10'),
          impactMetric: JSON.stringify({ reach: 5000, engagement: 2.5 })
        }
      }),
      prisma.marketingActivity.create({
        data: {
          storeId: store2.id,
          activityType: 'Листовки',
          description: 'Распространение листовок в районе',
          cost: 5000.00,
          date: new Date('2024-01-12'),
          impactMetric: JSON.stringify({ distributed: 2000, responses: 15 })
        }
      })
    ]);

    console.log('✅ Демо данные успешно созданы!');
    console.log('\n📋 Доступ к демо аккаунтам:');
    console.log('👑 Собственник: owner@blokpost.ru / demo123');
    console.log('📈 Аналитик: analyst@blokpost.ru / demo123');
    console.log('🏪 Менеджер магазина 1: manager1@blokpost.ru / demo123');
    console.log('🏪 Менеджер магазина 2: manager2@blokpost.ru / demo123');

  } catch (error) {
    console.error('❌ Ошибка при создании демо данных:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoData();