import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

const REQUIRED_FIELDS = [
  "store_id",
  "receipt_number",
  "product_sku",
  "quantity",
  "unit_price",
  "date",
];

function normalizeValue(value: any): string {
  if (value === null || value === undefined) return "";
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
  if (value === null || value === undefined || value === "") {
    throw new Error(`Поле ${fieldName} обязательно для заполнения.`);
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Поле ${fieldName} должно быть числом: ${value}`);
  }
  return parsed;
}

async function parseExcel(fileBuffer: ArrayBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Файл не содержит листов.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Файл не содержит данных.");
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
      storeId: parseNumber(normalizedRow.store_id, "store_id"),
      receiptNumber: normalizedRow.receipt_number,
      productSku: normalizedRow.product_sku,
      quantity: parseNumber(normalizedRow.quantity, "quantity"),
      unitPrice: parseNumber(normalizedRow.unit_price, "unit_price"),
      date: parseDate(row["date"] ?? normalizedRow.date),
      rowIndex,
    };
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof (file as Blob).arrayBuffer !== "function") {
      return NextResponse.json({ error: "Файл не был передан. Используйте поле 'file'." }, { status: 400 });
    }

    const buffer = await (file as Blob).arrayBuffer();
    const parsedRows = await parseExcel(buffer);

    const storeIds = [...new Set(parsedRows.map((row) => row.storeId))];
    const productSkus = [...new Set(parsedRows.map((row) => row.productSku))];

    const stores = await prisma.store.findMany({ where: { id: { in: storeIds } } });
    const products = await prisma.product.findMany({ where: { sku: { in: productSkus } } });

    const missingStores = storeIds.filter((id) => !stores.some((store) => store.id === id));
    const missingProducts = productSkus.filter((sku) => !products.some((product) => product.sku === sku));

    if (missingStores.length > 0 || missingProducts.length > 0) {
      return NextResponse.json(
        {
          error: "Ошибка контроля качества данных: найдены несоответствия справочникам.",
          missingStores,
          missingProducts,
        },
        { status: 400 },
      );
    }

    const productsBySku = new Map(products.map((product) => [product.sku, product]));

    const groupedSales = new Map<string, {
      storeId: number;
      date: string;
      receiptNumber: string;
      items: Array<{ productId: number; productSku: string; quantity: number; unitPrice: number }>; 
    }>();

    for (const row of parsedRows) {
      const key = `${row.storeId}::${row.receiptNumber}`;
      const product = productsBySku.get(row.productSku);
      if (!product) {
        return NextResponse.json({ error: `Товар ${row.productSku} не найден в справочнике.` }, { status: 400 });
      }

      const rowData = groupedSales.get(key);
      const item = {
        productId: product.id,
        productSku: product.sku,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
      };

      if (!rowData) {
        groupedSales.set(key, {
          storeId: row.storeId,
          date: row.date,
          receiptNumber: row.receiptNumber,
          items: [item],
        });
      } else {
        if (rowData.date !== row.date) {
          return NextResponse.json(
            {
              error: `Неверная дата для чека ${row.receiptNumber}: строки должны иметь одинаковую дату.`,
            },
            { status: 400 },
          );
        }
        rowData.items.push(item);
      }
    }

    const createdSales = [] as Array<{ id: number; storeId: number; receiptNumber: string; totalAmount: number }>;

    await prisma.$transaction(async (tx) => {
      for (const sale of groupedSales.values()) {
        const totalAmount = sale.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const created = await tx.sale.create({
          data: {
            storeId: sale.storeId,
            date: new Date(sale.date),
            totalAmount,
            items: JSON.stringify(sale.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.unitPrice,
            }))),
          },
        });
        createdSales.push({ id: created.id, storeId: created.storeId, receiptNumber: sale.receiptNumber, totalAmount });
      }
    });

    return NextResponse.json({ message: "Загрузка прошла успешно.", createdSales });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
