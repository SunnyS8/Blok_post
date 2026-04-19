'use client';

import { useState } from 'react';

export default function SupabaseUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('Выберите файл Excel для загрузки в Supabase.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);

    if (!file) {
      setStatus('Пожалуйста, выберите файл.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    setStatus('Загрузка файла...');

    try {
      const response = await fetch('/api/supabase/import-sales', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        setStatus('Ошибка импорта данных.');
        setResult(JSON.stringify(data, null, 2));
      } else {
        setStatus('Импорт завершён успешно.');
        setResult(`Создано заказов: ${data.totalOrders}\n${data.createdOrders?.map((order: any) => `Чек ${order.receiptNumber}: ${order.totalAmount}₽`).join('\n')}`);
        setFile(null);
      }
    } catch (error) {
      setStatus('Ошибка подключения к серверу.');
      setResult(String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Supabase Upload</h1>
      <p>Загрузите Excel-файл, чтобы создать заказы и позиции в Supabase.</p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        <label style={{ display: 'block' }}>
          Файл Excel
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            style={{ display: 'block', marginTop: 8 }}
          />
        </label>

        <button type="submit" disabled={!file || loading} style={{ padding: '12px 18px', borderRadius: 8, border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer' }}>
          {loading ? 'Загрузка...' : 'Импортировать в Supabase'}
        </button>
      </form>

      <section style={{ marginTop: 24, padding: 20, border: '1px solid #d1d5db', borderRadius: 12, backgroundColor: '#f8fafc' }}>
        <h2>Статус</h2>
        <p>{status}</p>
        {result && (
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12, backgroundColor: '#fff', padding: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}>
            {result}
          </pre>
        )}
      </section>

      <section style={{ marginTop: 24, padding: 20, border: '1px solid #d1d5db', borderRadius: 12 }}>
        <h2>Требования к файлу</h2>
        <ul>
          <li><code>store_id</code> — числовой идентификатор магазина</li>
          <li><code>receipt_number</code> — номер чека</li>
          <li><code>product_sku</code> — код товара</li>
          <li><code>quantity</code> — количество</li>
          <li><code>unit_price</code> — цена за единицу</li>
          <li><code>date</code> — дата продажи</li>
        </ul>
      </section>
    </main>
  );
}
