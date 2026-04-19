# Supabase Schema for BlokPOST

Эта схема описывает минимальный набор таблиц для интеграции проекта с Supabase.

## Таблица stores

```sql
create table stores (
  id serial primary key,
  external_id int unique not null,
  code text,
  name text not null,
  address text,
  region text
);
```

## Таблица products

```sql
create table products (
  id serial primary key,
  sku text unique not null,
  name text not null,
  description text,
  price numeric not null default 0
);
```

## Таблица orders

```sql
create table orders (
  id serial primary key,
  store_id int references stores(id) on delete cascade,
  receipt_number text not null,
  date timestamptz not null,
  total_amount numeric not null default 0,
  created_at timestamptz not null default now()
);
```

## Таблица order_items

```sql
create table order_items (
  id serial primary key,
  order_id int references orders(id) on delete cascade,
  product_id int references products(id) on delete restrict,
  quantity int not null,
  unit_price numeric not null,
  total_amount numeric generated always as (quantity * unit_price) stored
);
```

## Таблица profiles

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'user',
  created_at timestamptz not null default now()
);
```

## Пример данных

```sql
insert into stores (external_id, code, name, address, region)
values
  (1, 'S001', 'Магазин Центральный', 'ул. Ленина, 15', 'Центр'),
  (2, 'S002', 'Магазин Северный', 'пр. Победы, 45', 'Север');

insert into products (sku, name, description, price)
values
  ('CHEM-001', 'Костюм химзащиты', 'Костюм защитный', 15000),
  ('GLOV-001', 'Перчатки нитриловые', 'Перчатки для химработ', 250);
```

## Как использовать

1. Создайте проект в Supabase.
2. Добавьте таблицы по SQL из этого файла.
3. Создайте `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` и `SUPABASE_SERVICE_ROLE_KEY` в `.env.local`.
4. Откройте страницу `http://localhost:3000/supabase-demo`.
5. Для импорта Excel используйте страницу `http://localhost:3000/supabase-upload`.
