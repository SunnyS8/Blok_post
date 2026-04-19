'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import styles from './dashboard.module.css';

interface Store {
  id: number;
  external_id: number;
  code: string | null;
  name: string;
  address: string | null;
  region: string | null;
}

interface Order {
  id: number;
  store_id: number;
  receipt_number: string;
  date: string;
  total_amount: number;
  created_at: string;
  stores?: { name: string };
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [storesCount, setStoresCount] = useState<number | null>(null);
  const [productsCount, setProductsCount] = useState<number | null>(null);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [role, setRole] = useState<string>('user');
  const [error, setError] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setError('Supabase не настроен. Проверьте переменные окружения.');
        setLoading(false);
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user) {
        router.push('/auth/login');
        return;
      }

      setUser(sessionData.session.user);

      const [storesRes, productsRes, ordersRes, profileRes, storesListRes, ordersListRes] = await Promise.all([
        supabase.from('stores').select('id', { count: 'exact' }).limit(1),
        supabase.from('products').select('id', { count: 'exact' }).limit(1),
        supabase.from('orders').select('id', { count: 'exact' }).limit(1),
        supabase.from('profiles').select('role').eq('id', sessionData.session.user.id).single(),
        supabase.from('stores').select('*').order('name'),
        supabase.from('orders').select('*, stores(name)').order('created_at', { ascending: false }).limit(10),
      ]);

      if (!storesRes.error) {
        setStoresCount(storesRes.count ?? 0);
      }
      if (!productsRes.error) {
        setProductsCount(productsRes.count ?? 0);
      }
      if (!ordersRes.error) {
        setOrdersCount(ordersRes.count ?? 0);
      }

      if (!profileRes.error && profileRes.data?.role) {
        setRole(profileRes.data.role);
      } else if (sessionData.session.user.user_metadata?.role) {
        setRole(sessionData.session.user.user_metadata.role);
      }

      if (!storesListRes.error) {
        setStores(storesListRes.data || []);
      }

      if (!ordersListRes.error) {
        setOrders(ordersListRes.data || []);
      }

      setLoading(false);
    }

    loadData();
  }, [router, supabase]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/auth/login');
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!user) {
    return null;
  }

  const getRoleLabel = (roleValue: string) => {
    const labels: Record<string, string> = {
      owner: '👑 Собственник',
      analyst: '📈 Аналитик',
      store_manager: '🏪 Менеджер магазина',
    };
    return labels[roleValue] || roleValue;
  };

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <h1 className={styles.logo}>BlokPOST</h1>
        <div className={styles.navActions}>
          {role === 'owner' && (
            <a href="/profiles" className={styles.navLink}>👥 Профили</a>
          )}
          <button onClick={handleLogout} className={styles.logoutButton}>
            Выйти
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1>Добро пожаловать!</h1>
            <p>Вы вошли как: {getRoleLabel(role)}</p>
          </div>

          <div className={styles.info}>
            <div className={styles.infoItem}>
              <span>Email:</span>
              <strong>{user.email}</strong>
            </div>
            <div className={styles.infoItem}>
              <span>ID пользователя:</span>
              <strong>{user.id}</strong>
            </div>
            <div className={styles.infoItem}>
              <span>Роль:</span>
              <strong>{role}</strong>
            </div>
          </div>

          <div className={styles.stats}>
            <div className={styles.statCard}>
              <h3>Магазинов</h3>
              <p>{storesCount !== null ? storesCount : '—'}</p>
            </div>
            <div className={styles.statCard}>
              <h3>Товаров</h3>
              <p>{productsCount !== null ? productsCount : '—'}</p>
            </div>
            <div className={styles.statCard}>
              <h3>Заказов</h3>
              <p>{ordersCount !== null ? ordersCount : '—'}</p>
            </div>
          </div>

          <div className={styles.nextSteps}>
            <h3>Что дальше?</h3>
            <ul>
              <li>📤 <a href="/supabase-upload">Импорт в Supabase</a></li>
              <li>📊 Просмотр магазинов и товаров</li>
              <li>📈 Анализ продаж</li>
            </ul>
          </div>
        </div>

        <div className={styles.listsSection}>
          <div className={styles.listCard}>
            <h2>🏪 Магазины</h2>
            {stores.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Название</th>
                      <th>Адрес</th>
                      <th>Регион</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store) => (
                      <tr key={store.id}>
                        <td>{store.external_id}</td>
                        <td>{store.name}</td>
                        <td>{store.address || '—'}</td>
                        <td>{store.region || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.empty}>Магазины не найдены</p>
            )}
          </div>

          <div className={styles.listCard}>
            <h2>🛒 Последние заказы</h2>
            {orders.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Чек</th>
                      <th>Магазин</th>
                      <th>Дата</th>
                      <th>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.receipt_number}</td>
                        <td>{order.stores?.name || '—'}</td>
                        <td>{new Date(order.date).toLocaleDateString('ru-RU')}</td>
                        <td>{order.total_amount.toLocaleString('ru-RU')} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.empty}>Заказы не найдены</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
