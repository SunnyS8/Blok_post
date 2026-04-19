'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface Product {
  id?: number;
  name?: string;
  sku?: string;
  price?: number;
  description?: string;
}

export default function SupabaseDemoPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('Проверка подключения...');
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [storesCount, setStoresCount] = useState<number | null>(null);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function checkConnection() {
      if (!supabase) {
        setStatus('Необходимо настроить Supabase окружение в .env.local');
        return;
      }

      const [productsResponse, storesResponse, ordersResponse] = await Promise.all([
        supabase.from('products').select('id, name, sku, price').limit(5),
        supabase.from('stores').select('id', { count: 'exact' }).limit(1),
        supabase.from('orders').select('id', { count: 'exact' }).limit(1),
      ]);

      if (productsResponse.error) {
        setStatus(`Ошибка загрузки products: ${productsResponse.error.message}`);
        return;
      }

      if (storesResponse.error) {
        setStatus(`Ошибка загрузки stores: ${storesResponse.error.message}`);
        return;
      }

      if (ordersResponse.error) {
        setStatus(`Ошибка загрузки orders: ${ordersResponse.error.message}`);
        return;
      }

      setProducts(productsResponse.data || []);
      setStoresCount(storesResponse.data ? 1 : 0);
      setOrdersCount(ordersResponse.count ?? null);
      setStatus('Подключено к Supabase');

      const sessionResponse = await supabase.auth.getSession();
      setSession(sessionResponse.data.session);
    }

    checkConnection();
  }, [supabase]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    if (!supabase) {
      setError('Supabase клиент не инициализирован');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message || 'Не удалось войти');
      return;
    }

    setSession(data.session);
    setStatus('Вы успешно вошли в Supabase');
  };

  const handleSignOut = async () => {
    if (!supabase) {
      setSession(null);
      setStatus('Supabase клиент не инициализирован');
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setStatus('Вы вышли из Supabase');
  };

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1>Supabase Prototype</h1>
      <p>Демонстрация интеграции с Supabase Auth и таблицей <code>products</code>.</p>

      <section style={{ marginBottom: 24, padding: 20, border: '1px solid #ddd', borderRadius: 12 }}>
        <h2>Статус</h2>
        <p>{status}</p>
      </section>

      <section style={{ marginBottom: 24, padding: 20, border: '1px solid #ddd', borderRadius: 12 }}>
        <h2>Авторизация</h2>
        {session ? (
          <div>
            <p>В системе как: <strong>{session.user?.email}</strong></p>
            <button onClick={handleSignOut} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#334155', color: '#fff', cursor: 'pointer' }}>
              Выйти
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignIn} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@example.com"
                required
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </label>
            {error && <p style={{ color: 'crimson' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ padding: '12px 18px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
              {loading ? 'Вход...' : 'Войти через Supabase'}
            </button>
          </form>
        )}
      </section>

      <section style={{ padding: 20, border: '1px solid #ddd', borderRadius: 12, marginBottom: 24 }}>
        <h2>Статистика</h2>
        <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
          <li>Магазинов в таблице <code>stores</code>: {storesCount !== null ? storesCount : 'неизвестно'}</li>
          <li>Заказов в таблице <code>orders</code>: {ordersCount !== null ? ordersCount : 'неизвестно'}</li>
          <li>Товаров в таблице <code>products</code>: {products.length}</li>
        </ul>
      </section>

      <section style={{ padding: 20, border: '1px solid #ddd', borderRadius: 12 }}>
        <h2>Продукты</h2>
        {products.length === 0 ? (
          <p>Таблица <code>products</code> пуста или недоступна.</p>
        ) : (
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            {products.map((product) => (
              <li key={product.id} style={{ marginBottom: 12, padding: 12, border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <strong>{product.name || 'Без названия'}</strong>
                <div>SKU: {product.sku || '-'}</div>
                <div>Цена: {product.price !== undefined ? `${product.price} ₽` : '-'}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
