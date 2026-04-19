'use client';

import { useState } from 'react';
import styles from './upload.module.css';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setMessage({ type: 'error', text: 'Выберите файл' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);

    try {
      const response = await fetch('/api/upload/sales', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.message || 'Ошибка загрузки' });
      } else {
        setMessage({ 
          type: 'success', 
          text: `✅ Загружено успешно! Добавлено ${data.count} записей.` 
        });
        setFile(null);
        (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка подключения к серверу' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <h1 className={styles.logo}>BlokPOST</h1>
        <a href="/dashboard" className={styles.backLink}>← Вернуться</a>
      </nav>

      <main className={styles.main}>
        <div className={styles.card}>
          <h1>📤 Загрузка данных</h1>
          <p className={styles.subtitle}>Импортируйте данные из Excel файла</p>

          {message && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fileInput}>
              <label htmlFor="file-upload" className={styles.fileLabel}>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className={styles.fileInputHidden}
                />
                <span className={styles.uploadIcon}>📁</span>
                <span className={styles.uploadText}>
                  {file ? file.name : 'Кликните или перетащите файл'}
                </span>
                <span className={styles.uploadHint}>
                  Поддерживаемые форматы: Excel (.xlsx, .xls), CSV
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              className={styles.button} 
              disabled={!file || loading}
            >
              {loading ? '⏳ Загрузка...' : '📤 Загрузить файл'}
            </button>
          </form>

          <div className={styles.info}>
            <h3>📋 Требования к файлу</h3>
            <p>Файл должен содержать следующие столбцы:</p>
            <ul>
              <li><code>store_id</code> - ID магазина</li>
              <li><code>receipt_number</code> - Номер чека</li>
              <li><code>product_sku</code> - SKU товара</li>
              <li><code>quantity</code> - Количество</li>
              <li><code>unit_price</code> - Цена за единицу</li>
              <li><code>date</code> - Дата продажи</li>
            </ul>
          </div>

          <div className={styles.example}>
            <h3>📝 Пример данных</h3>
            <table>
              <thead>
                <tr>
                  <th>store_id</th>
                  <th>receipt_number</th>
                  <th>product_sku</th>
                  <th>quantity</th>
                  <th>unit_price</th>
                  <th>date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>CHK-001</td>
                  <td>CHEM-001</td>
                  <td>1</td>
                  <td>15000.00</td>
                  <td>2024-01-15</td>
                </tr>
                <tr>
                  <td>1</td>
                  <td>CHK-001</td>
                  <td>GLOV-001</td>
                  <td>3</td>
                  <td>250.00</td>
                  <td>2024-01-15</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
