-- ============================================================
-- KARES STUDIO — Phase 6 admin + CMS schema
-- 1) products.is_active (soft hide from storefront, no delete)
-- 2) homepage_content (CMS key-value store, content only)
-- Run ONCE in Supabase SQL Editor (project already linked).
-- Does NOT touch existing tables except ADD COLUMN is_active.
-- ============================================================

-- ---------- 1. product active flag ----------
alter table public.products
  add column if not exists is_active boolean not null default true;

create index if not exists idx_products_active
  on public.products(is_active) where is_active = true;

-- Storefront featured query stays fast for active products.
drop index if exists idx_products_featured;
create index if not exists idx_products_featured
  on public.products(featured) where featured = true and is_active = true;

-- ---------- 2. homepage CMS content ----------
-- One row per editable field: (section, key) is unique.
-- value = text content; image_url = object path in a public bucket
-- (product-images reused, or any public path /images/...).
create table if not exists public.homepage_content (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  key text not null,
  value text,
  image_url text,
  updated_at timestamptz not null default now(),
  constraint uq_homepage_content_section_key unique (section, key)
);
create index if not exists idx_homepage_content_section
  on public.homepage_content(section);

-- Keep updated_at fresh on CMS edits.
create or replace function public.touch_homepage_content()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_homepage_content_touch on public.homepage_content;
create trigger trg_homepage_content_touch
  before update on public.homepage_content
  for each row execute function public.touch_homepage_content();

-- ---------- 3. RLS ----------
alter table public.homepage_content enable row level security;

-- Public storefront: read CMS content (anon key).
drop policy if exists "public read homepage_content" on public.homepage_content;
create policy "public read homepage_content" on public.homepage_content
  for select using (true);

-- Writes go through server-side API routes using the Service Role key
-- (service_role bypasses RLS). No anon write policies on purpose.
-- Authenticated admin policies arrive when Admin Auth is introduced
-- (next phase); until then /admin UI calls protected API routes that
-- use SUPABASE_SERVICE_ROLE_KEY server-side only.

-- ---------- 4. seed default CMS rows (content = current homepage copy) ----------
insert into public.homepage_content (section, key, value, image_url) values
  ('hero', 'eyebrow', '//STYLED FOR LIFE.', null),
  ('hero', 'heading', 'where lives|style now', null),
  ('hero', 'description', 'Explore curated collections, exclusive drops and everyday essentials all thoughtfully designed in one stylish shopping destination.', null),
  ('hero', 'button_text', 'Shop Collection', null),
  ('hero', 'image', null, '/images/look-female-front.jpeg'),
  ('hero', 'tagline', 'Step into effortless elegance with Kares Studio', null),

  ('brand_statement', 'heading', 'All — about moments ©26', null),
  ('brand_statement', 'right_label', 'WHERE ELEGANCE MEETS SUSTAINABILITY', null),
  ('brand_statement', 'badge', 'LUXURY MADE ACCESSIBLE', null),
  ('brand_statement', 'quote', 'Every piece carries rhythm beyond clothing, it''s motion and meaning where street energy meets.', null),

  ('categories', 'tag', '[CATEGORIES]', null),

  ('featured', 'tag', '[NEW DROP]', null),
  ('featured', 'heading', 'New Arrivals', null),
  ('featured', 'sub', '[NEW RELEASE DROP]', null),

  ('quality', 'tag', '[QUALITY PROMISE]', null),
  ('quality', 'quote', 'Every piece is crafted with intention. From heavy fabric weights to precise shoulder drops, we design essential garments built to last.', null),
  ('quality', 'image', null, '/images/look-female-side.jpeg'),

  ('manifesto', 'heading', 'At KARES STUDIO, we believe fashion is more than just clothing—it''s an expression of who you are in every moment.', null),

  ('assistance', 'tag', '[07 // CUSTOMER ASSISTANCE]', null),
  ('assistance', 'title', 'Need help|styling it?', null),
  ('assistance', 'description', 'Our team helps with sizing, styling and orders — reach out anytime.', null),
  ('assistance', 'button_text', 'Chat via WhatsApp', null),

  ('footer', 'tagline', 'From editorial design to high-fashion garments, our expert team is here to elevate your style and celebrate every moment.', null),
  ('footer', 'address', '14 Road Street, Jakarta, Indonesia', null)
on conflict (section, key) do nothing;
