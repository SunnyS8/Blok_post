'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

interface User {
  id: number;
  email: string;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/auth/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
    } catch (err) {
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!user) {
    return null;
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: '👑 Собственник',
      analyst: '📈 Аналитик',
      store_manager: '🏪 Менеджер магазина',
    };
    return labels[role] || role;
  };

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <h1 className={styles.logo}>BlokPOST</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Выйти
        </button>
      </nav>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1>Добро пожаловать!</h1>
            <p>Вы вошли как: {getRoleLabel(user.role)}</p>
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
              <strong>{user.role}</strong>
            </div>
          </div>

          <div className={styles.sections}>
            {user.role === 'owner' && (
              <section>
                <h2>👑 Собственник</h2>
                <p>Вы имеете полный доступ ко всем магазинам и метрикам.</p>
                <ul>
                  <li>📊 Просмотр всех магазинов</li>
                  <li>💰 Финансовая аналитика</li>
                  <li>📈 KPI и отчеты</li>
                  <li>👥 Управление пользователями</li>
                </ul>
              </section>
            )}

            {user.role === 'analyst' && (
              <section>
                <h2>📈 Аналитик</h2>
                <p>Вы можете просматривать аналитику и отчеты.</p>
                <ul>
                  <li>📊 Анализ продаж</li>
                  <li>📈 KPI по магазинам</li>
                  <li>📉 Тренды и прогнозы</li>
                </ul>
              </section>
            )}

            {user.role === 'store_manager' && (
              <section>
                <h2>🏪 Менеджер магазина</h2>
                <p>Вы можете управлять данными своего магазина.</p>
                <ul>
                  <li>💰 Управление продажами</li>
                  <li>📦 Остатки товаров</li>
                  <li>🎯 Маркетинговые активности</li>
                </ul>
              </section>
            )}
          </div>

          <div className={styles.nextSteps}>
            <h3>Что дальше?</h3>
            <ul>
              <li>📊 <a href="/upload">Загрузить данные из Excel</a></li>
              <li>📊 Просмотр магазинов и товаров</li>
              <li>💾 Загрузка данных из Excel</li>
              <li>📈 Анализ продаж</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
