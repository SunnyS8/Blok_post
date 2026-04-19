'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push('/dashboard');
      }
    }

    checkSession();
  }, [router]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '40px', lineHeight: '1.6', maxWidth: '900px', margin: '0 auto' }}>
      <h1>BlokPOST — демо-версия</h1>
      <p>Добро пожаловать! Это упрощенная стартовая страница проекта.</p>

      <section>
        <h2>🚀 Начать</h2>
        <p>
          <Link href="/auth/login" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold' }}>
            Перейти на страницу входа →
          </Link>
        </p>
      </section>

      <section>
        <h2>Доступные демо-аккаунты</h2>
        <ul>
          <li>Собственник: <b>owner@blokpost.ru</b> / <b>demo123</b></li>
          <li>Аналитик: <b>analyst@blokpost.ru</b> / <b>demo123</b></li>
          <li>Менеджер 1: <b>manager1@blokpost.ru</b> / <b>demo123</b></li>
          <li>Менеджер 2: <b>manager2@blokpost.ru</b> / <b>demo123</b></li>
        </ul>
      </section>

      <section>
        <h2>Что сейчас работает</h2>
        <p>В текущей версии в репозитории реализован базовый API и структура проекта.</p>
        <p>Если вы видите эту страницу, приложение запустилось правильно.</p>
      </section>

      <section>
        <h2>Что дальше</h2>
        <ol>
          <li>Добавить страницы входа и дашборд ✅</li>
          <li>Реализовать аутентификацию ✅</li>
          <li>Добавить визуальные отчеты</li>
        </ol>
      </section>

      <section>
        <h2>API</h2>
        <p>Текущий API доступен по адресу:</p>
        <pre style={{ background: '#1f2937', color: '#f8fafc', padding: '12px', borderRadius: '8px' }}>http://localhost:3000/api/hello</pre>
      </section>

      <section>
        <h2>Supabase Prototype</h2>
        <p>
          <a href="/supabase-demo" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold' }}>
            Перейти к демонстрации интеграции Supabase →
          </a>
        </p>
        <p>
          <a href="/supabase-upload" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold' }}>
            Перейти к импорту Excel в Supabase →
          </a>
        </p>
      </section>
    </main>
  );
}
