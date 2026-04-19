import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

const REQUIRED_FIELDS = [
  'store_id',
  'receipt_number',
  'product_sku',
  'quantity',
  'unit_price',
  'date',
];

function normalizeValue(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function parseDate(value: any): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString();
  }

  const normalized = normalizeValue(value);
  const date = new Date(normalized);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Невалидная дата: ${value}`);
  }

  return date.toISOString();
}

function parseNumber(value: any, fieldName: string): number {
  if (value === null || value === undefined || value === '') {
    throw new Error(`Поле ${fieldName} обязательно для заполнения.`);
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Поле ${fieldName} должно быть числом: ${value}`);
  }
  return parsed;
}

function parseExcel(fileBuffer: ArrayBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Файл не содержит листов.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Файл не содержит данных.');
  }

  return rows.map((row, index) => {
    const rowIndex = index + 2;
    const normalizedRow: Record<string, any> = {};

    for (const field of REQUIRED_FIELDS) {
      if (!(field in row)) {
        throw new Error(`Колонка '${field}' отсутствует в строке ${rowIndex}.`);
      }
      normalizedRow[field] = normalizeValue(row[field]);
    }

    if (!normalizedRow.store_id) {
      throw new Error(`store_id обязательно в строке ${rowIndex}.`);
    }
    if (!normalizedRow.receipt_number) {
      throw new Error(`receipt_number обязательно в строке ${rowIndex}.`);
    }
    if (!normalizedRow.product_sku) {
      throw new Error(`product_sku обязательно в строке ${rowIndex}.`);
    }

    return {
      storeId: parseNumber(normalizedRow.store_id, 'store_id'),
      receiptNumber: normalizedRow.receipt_number,
      productSku: normalizedRow.product_sku,
      quantity: parseNumber(normalizedRow.quantity, 'quantity'),
      unitPrice: parseNumber(normalizedRow.unit_price, 'unit_price'),
      date: parseDate(row['date'] ?? normalizedRow.date),
      rowIndex,
    };
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof (file as Blob).arrayBuffer !== 'function') {
      return NextResponse.json(
        { error: "Файл не был передан. Используйте поле 'file'." },
        { status: 400 }
      );
    }

    const buffer = await (file as Blob).arrayBuffer();
    const parsedRows = parseExcel(buffer);

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new Error(
        'Supabase server environment not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
      );
    }

    const storeIds = [...new Set(parsedRows.map((row) => row.storeId))];
    const productSkus = [...new Set(parsedRows.map((row) => row.productSku))];

    const { data: stores, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('id, external_id')
      .in('external_id', storeIds);

    if (storeError) {
      throw new Error(`Ошибка Supabase: ${storeError.message}`);
    }

    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, sku, price')
      .in('sku', productSkus);

    if (productError) {
      throw new Error(`Ошибка Supabase: ${productError.message}`);
    }

    const missingStores = storeIds.filter(
      (id) => !stores?.some((store) => store.external_id === id)
    );
    const missingProducts = productSkus.filter(
      (sku) => !products?.some((product) => product.sku === sku)
    );

    if (missingStores.length > 0 || missingProducts.length > 0) {
      return NextResponse.json(
        {
          error: 'Ошибка контроля качества данных: найдены несоответствия справочникам.',
          missingStores,
          missingProducts,
        },
        { status: 400 }
      );
    }

    const productsBySku = new Map<string, { id: number; sku: string; price: number }>(
      (products || []).map((product) => [product.sku, product as any])
    );

    const storesByExternalId = new Map<number, { id: number; external_id: number }>(
      (stores || []).map((store) => [store.external_id, store as any])
    );

    const groupedOrders = new Map<
      string,
      {
        storeId: number;
        date: string;
        receiptNumber: string;
        items: Array<{ productId: number; productSku: string; quantity: number; unitPrice: number }>;
      }
    >();

    for (const row of parsedRows) {
      const store = storesByExternalId.get(row.storeId);
      if (!store) {
        return NextResponse.json(
          { error: `Магазин ${row.storeId} не найден.` },
          { status: 400 }
        );
      }

      const product = productsBySku.get(row.productSku);
      if (!product) {
        return NextResponse.json(
          { error: `Товар ${row.productSku} не найден.` },
          { status: 400 }
        );
      }

      const key = `${row.storeId}::${row.receiptNumber}`;
      const item = {
        productId: product.id,
        productSku: product.sku,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
      };

      const existing = groupedOrders.get(key);
      if (!existing) {
        groupedOrders.set(key, {
          storeId: store.id,
          date: row.date,
          receiptNumber: row.receiptNumber,
          items: [item],
        });
      } else {
        if (existing.date !== row.date) {
          return NextResponse.json(
            {
              error: `Неверная дата для чека ${row.receiptNumber}: строки должны иметь одинаковую дату.`,
            },
            { status: 400 }
          );
        }
        existing.items.push(item);
      }
    }

    const createdOrders: Array<{ orderId: number; receiptNumber: string; totalAmount: number }> = [];

    for (const order of groupedOrders.values()) {
      const totalAmount = order.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      const { data: createdOrder, error: insertOrderError } = await supabaseAdmin
        .from('orders')
        .insert([
          {
            store_id: order.storeId,
            receipt_number: order.receiptNumber,
            date: order.date,
            total_amount: totalAmount,
          },
        ])
        .select('id')
        .single();

      if (insertOrderError || !createdOrder) {
        throw new Error(`Ошибка создания заказа: ${insertOrderError?.message || 'unknown'}`);
      }

      const orderItemRows = order.items.map((item) => ({
        order_id: createdOrder.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

      const { error: insertItemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItemRows);

      if (insertItemsError) {
        throw new Error(`Ошибка создания позиций заказа: ${insertItemsError.message}`);
      }

      createdOrders.push({
        orderId: createdOrder.id,
        receiptNumber: order.receiptNumber,
        totalAmount,
      });
    }

    return NextResponse.json({
      message: 'Загрузка прошла успешно.',
      createdOrders,
      totalOrders: createdOrders.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
