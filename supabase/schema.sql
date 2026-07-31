-- ============================================================
-- MRI Service — Peças e Componentes + Contato (schema Supabase)
-- Rode este arquivo inteiro em: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Categorias ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

insert into categories (name, slug) values
  ('Ressonância Magnética', 'ressonancia-magnetica'),
  ('Tomografia Computadorizada', 'tomografia-computadorizada'),
  ('Raio-X', 'raio-x'),
  ('Ultrassom', 'ultrassom');

-- ---------- Peças / Componentes ----------
create table parts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  short_description text not null default '',
  about_description text not null default '',
  model text,
  manufacturer text,
  weight text,
  warranty text,
  is_main boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garante, a nível de banco, que só exista UMA peça "principal" por vez
create unique index one_main_part on parts (is_main) where is_main = true;

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger parts_set_updated_at
  before update on parts
  for each row execute function set_updated_at();

-- ---------- Fotos das peças ----------
create table part_images (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references parts(id) on delete cascade,
  url text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Garante uma única foto "principal" (capa) por peça
create unique index one_primary_image_per_part on part_images (part_id) where is_primary = true;

-- ---------- Formulário de contato ----------
create table contact_submissions (
  id uuid primary key default gen_random_uuid(),
  nome text,
  cargo text,
  email text,
  telefone text,
  empresa text,
  cnpj text,
  cidade text,
  estado text,
  equipamento text,
  urgencia text,
  mensagem text,
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS (Row Level Security) — sem isso, com a chave anon exposta
-- no navegador, qualquer pessoa poderia ler/editar tudo.
-- ============================================================
alter table categories enable row level security;
alter table parts enable row level security;
alter table part_images enable row level security;
alter table contact_submissions enable row level security;

-- Leitura pública: o site precisa mostrar peças para qualquer visitante
create policy "categories are publicly readable" on categories
  for select using (true);

create policy "parts are publicly readable" on parts
  for select using (true);

create policy "part_images are publicly readable" on part_images
  for select using (true);

-- Escrita (insert/update/delete) só para quem estiver logado (o admin)
create policy "authenticated users manage categories" on categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated users manage parts" on parts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated users manage part_images" on part_images
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Contato: qualquer visitante pode enviar o formulário (insert),
-- mas só o admin logado pode ler ou apagar as mensagens recebidas
create policy "anyone can submit contact form" on contact_submissions
  for insert with check (true);

create policy "authenticated users read contact submissions" on contact_submissions
  for select using (auth.role() = 'authenticated');

create policy "authenticated users update contact submissions" on contact_submissions
  for update using (auth.role() = 'authenticated');

create policy "authenticated users delete contact submissions" on contact_submissions
  for delete using (auth.role() = 'authenticated');

-- ============================================================
-- Storage (fotos das peças)
-- 1. Crie o bucket pelo painel: Storage > New bucket > nome "part-images" > Public bucket = ON
-- 2. Depois rode as policies abaixo (troque o nome do bucket se usar outro)
-- ============================================================
create policy "public read part images" on storage.objects
  for select using (bucket_id = 'part-images');

create policy "authenticated upload part images" on storage.objects
  for insert with check (bucket_id = 'part-images' and auth.role() = 'authenticated');

create policy "authenticated update part images" on storage.objects
  for update using (bucket_id = 'part-images' and auth.role() = 'authenticated');

create policy "authenticated delete part images" on storage.objects
  for delete using (bucket_id = 'part-images' and auth.role() = 'authenticated');
