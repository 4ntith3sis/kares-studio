-- ============================================================
-- KARES STUDIO — Phase 1 schema
-- categories, products, product_images, colors, sizes,
-- product_variants, inventory_transactions, stock view,
-- automatic slugs, negative-stock protection, RLS.
-- Run this in Supabase SQL Editor (or `supabase db push`).
-- ============================================================

-- ---------- helpers ----------
create or replace function public.slugify_name(input text)
returns text
language plpgsql immutable
as $$
declare
  s text;
begin
  s := lower(coalesce(input, ''));
  -- crude transliteration of common accents
  s := translate(s,
    'àáâãäåèéêëìíîïòóôõöùúûüýÿçñ',
    'aaaaaaeeeeiiiiooooouuuuyycn');
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  s := regexp_replace(s, '-{2,}', '-', 'g');
  if s = '' then s := 'item'; end if;
  return substring(s from 1 for 120);
end;
$$;

create or replace function public.unique_slug(table_name text, base text, exclude_id uuid default null)
returns text
language plpgsql
as $$
declare
  root text := public.slugify_name(base);
  candidate text := root;
  n int := 2;
  exists_row int;
  q text;
begin
  if root = '' then root := 'item'; candidate := root; end if;
  loop
    q := format('select 1 from %I where slug = $1 and ($2 is null or id <> $2) limit 1', table_name);
    execute q into exists_row using candidate, exclude_id;
    if not found then
      return candidate;
    end if;
    candidate := root || '-' || n;
    n := n + 1;
  end loop;
end;
$$;

-- ---------- categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text, -- homepage-only category photo (collection doesn't use it)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_category_slug()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.name is distinct from old.name) then
    new.slug := public.unique_slug('categories', new.name, new.id);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_categories_slug on public.categories;
create trigger trg_categories_slug
  before insert or update of name on public.categories
  for each row execute function public.set_category_slug();

-- ---------- products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  material text,
  price integer not null default 0 check (price >= 0),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_featured on public.products(featured) where featured = true;

create or replace function public.set_product_slug()
returns trigger language plpgsql as $$
begin
  -- Admin never types slugs: always derive from name on insert/rename.
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.name is distinct from old.name) then
    new.slug := public.unique_slug('products', new.name, new.id);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_products_slug on public.products;
create trigger trg_products_slug
  before insert or update of name on public.products
  for each row execute function public.set_product_slug();

-- ---------- product_images ----------
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_images_product on public.product_images(product_id, sort_order);

-- ---------- colors ----------
create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  hex_code text not null,
  created_at timestamptz not null default now(),
  constraint colors_hex_format check (hex_code ~ '^#[0-9A-Fa-f]{6}$')
);

-- ---------- sizes ----------
create table if not exists public.sizes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- product_variants ----------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color_id uuid not null references public.colors(id) on delete restrict,
  size_id uuid not null references public.sizes(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_variant_combo unique (product_id, color_id, size_id)
);
create index if not exists idx_variants_product on public.product_variants(product_id);

-- ---------- inventory_transactions ----------
-- Stock is ONLY changed via IN/OUT transactions. No editable stock column.
create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  quantity integer not null check (quantity > 0),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_inventory_variant on public.inventory_transactions(variant_id, created_at desc);

-- ---------- current stock (view + function) ----------
create or replace view public.variant_stock as
select
  v.id as variant_id,
  coalesce(sum(case when t.type = 'in' then t.quantity else 0 end), 0) as total_in,
  coalesce(sum(case when t.type = 'out' then t.quantity else 0 end), 0) as total_out,
  coalesce(sum(case when t.type = 'in' then t.quantity else -t.quantity end), 0) as stock
from public.product_variants v
left join public.inventory_transactions t on t.variant_id = v.id
group by v.id;

create or replace function public.get_variant_stock(p_variant_id uuid)
returns integer
language sql stable
as $$
  select coalesce(sum(case when type = 'in' then quantity else -quantity end), 0)::int
  from public.inventory_transactions
  where variant_id = p_variant_id;
$$;

-- ---------- negative-stock protection (race-safe) ----------
create or replace function public.guard_inventory_stock()
returns trigger language plpgsql as $$
declare
  current_stock int;
begin
  if new.type = 'out' then
    -- Lock the variant row so concurrent OUT transactions serialize.
    perform 1 from public.product_variants where id = new.variant_id for update;
    select public.get_variant_stock(new.variant_id) into current_stock;
    if current_stock < new.quantity then
      raise exception 'Insufficient stock for variant %: have %, tried OUT %',
        new.variant_id, current_stock, new.quantity
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_inventory_stock on public.inventory_transactions;
create trigger trg_guard_inventory_stock
  before insert on public.inventory_transactions
  for each row execute function public.guard_inventory_stock();

-- ---------- storage bucket ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ---------- RLS ----------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.colors enable row level security;
alter table public.sizes enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_transactions enable row level security;

-- Public storefront: read-only access to catalog data + stock view.
-- (Admin auth + write policies arrive in Phase 2; service_role bypasses RLS for seeding.)
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (true);

drop policy if exists "public read product_images" on public.product_images;
create policy "public read product_images" on public.product_images for select using (true);

drop policy if exists "public read colors" on public.colors;
create policy "public read colors" on public.colors for select using (true);

drop policy if exists "public read sizes" on public.sizes;
create policy "public read sizes" on public.sizes for select using (true);

drop policy if exists "public read variants" on public.product_variants;
create policy "public read variants" on public.product_variants for select using (true);

-- Inventory transactions: NO anonymous access (neither read nor write).
-- Phase 2 adds authenticated admin policies.

-- Storage: public read of product images; writes locked down for now.
drop policy if exists "public read product-images" on storage.objects;
create policy "public read product-images" on storage.objects
  for select using (bucket_id = 'product-images');
