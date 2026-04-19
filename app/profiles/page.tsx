'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import styles from './profiles.module.css';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');
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

      // Получить роль текущего пользователя
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionData.session.user.id)
        .single();

      if (!profileError && profileData?.role) {
        setUserRole(profileData.role);
      }

      // Только owner может видеть профили
      if (userRole !== 'owner') {
        setError('Доступ запрещен. Только собственник может управлять профилями.');
        setLoading(false);
        return;
      }

      // Загрузить все профили
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        setError(`Ошибка загрузки профилей: ${profilesError.message}`);
      } else {
        setProfiles(profilesData || []);
      }

      setLoading(false);
    }

    loadData();
  }, [router, supabase, userRole]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!supabase) return;

    try {
      const response = await fetch('/api/supabase/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка обновления роли');
        return;
      }

      // Обновить локальный список
      setProfiles(profiles.map(p =>
        p.id === userId ? { ...p, role: newRole } : p
      ));

      setError('');
    } catch (err) {
      setError('Ошибка подключения к серверу');
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/auth/login');
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (userRole !== 'owner') {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <h1>Доступ запрещен</h1>
          <p>Только собственник может управлять профилями пользователей.</p>
          <button onClick={() => router.push('/dashboard')} className={styles.backButton}>
            ← Вернуться в дашборд
          </button>
        </div>
      </div>
    );
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
        <div className={styles.navLinks}>
          <a href="/dashboard" className={styles.navLink}>Дашборд</a>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Выйти
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1>👥 Управление профилями</h1>
          <p>Управление ролями пользователей системы</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.profilesGrid}>
          {profiles.map((profile) => (
            <div key={profile.id} className={styles.profileCard}>
              <div className={styles.profileInfo}>
                <h3>{profile.full_name || 'Без имени'}</h3>
                <p className={styles.email}>{profile.email}</p>
                <p className={styles.created}>
                  Создан: {new Date(profile.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>

              <div className={styles.roleSection}>
                <label>Роль:</label>
                <select
                  value={profile.role}
                  onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                  className={styles.roleSelect}
                >
                  <option value="user">Пользователь</option>
                  <option value="store_manager">🏪 Менеджер магазина</option>
                  <option value="analyst">📈 Аналитик</option>
                  <option value="owner">👑 Собственник</option>
                </select>
                <p className={styles.roleLabel}>{getRoleLabel(profile.role)}</p>
              </div>
            </div>
          ))}
        </div>

        {profiles.length === 0 && !error && (
          <div className={styles.empty}>
            <p>Профили пользователей не найдены.</p>
            <p>Пользователи должны войти в систему хотя бы один раз для создания профиля.</p>
          </div>
        )}
      </main>
    </div>
  );
}