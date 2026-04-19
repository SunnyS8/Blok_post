'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Ошибка входа');
        setLoading(false);
        return;
      }

      // Сохранить токен в localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Перенаправить в дашборд
      router.push('/dashboard');
    } catch (err) {
      setError('Ошибка подключения к серверу');
      setLoading(false);
    }
  };

  const autofill = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>BlokPOST</h1>
        <p className={styles.subtitle}>Вход в систему</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="example@blokpost.ru"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className={styles.divider}>Демо-учетные записи</div>

        <div className={styles.demoAccounts}>
          <button
            type="button"
            className={styles.demoButton}
            onClick={() => autofill('owner@blokpost.ru', 'demo123')}
          >
            👑 Собственник
          </button>
          <button
            type="button"
            className={styles.demoButton}
            onClick={() => autofill('analyst@blokpost.ru', 'demo123')}
          >
            📈 Аналитик
          </button>
          <button
            type="button"
            className={styles.demoButton}
            onClick={() => autofill('manager1@blokpost.ru', 'demo123')}
          >
            🏪 Менеджер 1
          </button>
          <button
            type="button"
            className={styles.demoButton}
            onClick={() => autofill('manager2@blokpost.ru', 'demo123')}
          >
            🏪 Менеджер 2
          </button>
        </div>
      </div>
    </div>
  );
}
