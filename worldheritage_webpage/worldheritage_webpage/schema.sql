-- =========================================================
-- IDM世界遺産部 ログイン機能 データベース定義（Supabase / PostgreSQL）
-- Supabase ダッシュボード → SQL Editor に貼り付けて「Run」
-- =========================================================
-- メールアドレスとパスワード（ハッシュ化済み）は Supabase が auth.users に保存する。
-- ここでは表示用のユーザー名などを profiles テーブルに持たせる。

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null check (char_length(username) between 2 and 20),
  role       text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

-- ユーザー名は大文字・小文字を区別せずに重複禁止
create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- 行レベルセキュリティ：自分の行だけ読める
alter table public.profiles enable row level security;

create policy "自分のプロフィールのみ参照" on public.profiles
  for select using (auth.uid() = id);

-- 新規登録時に profiles の行を自動作成（signUp の options.data.username を使う）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 登録前に「このユーザー名は使えるか」を確認する関数（ログイン前でも呼べる）
create or replace function public.username_available(name text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(name));
$$;

grant execute on function public.username_available(text) to anon, authenticated;
