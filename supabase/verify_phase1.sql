-- ============================================================
-- Phase 1 manual verification (run in Supabase SQL Editor
-- AFTER migration + seed). Each block is one checklist item.
-- ============================================================

-- 1) automatic slug from name
insert into public.products (name, price) values ('Basic Oversized T-Shirt', 1000);
-- expect: slug = basic-oversized-t-shirt-<n> (unique suffix), NOT a clash

-- 2) duplicate slug attempt is impossible (trigger rewrites from name)
-- cleanup check row:
delete from public.products where name = 'Basic Oversized T-Shirt' and slug <> 'basic-oversized-t-shirt';

-- 3) product variant unique combo
-- (run twice — second must fail with unique violation)
-- insert into public.product_variants (product_id, color_id, size_id)
-- select p.id, c.id, s.id from public.products p, public.colors c, public.sizes s
-- where p.slug='basic-oversized-t-shirt' and c.name='Black' and s.name='M';

-- 4) inventory IN increases stock
-- insert into public.inventory_transactions (variant_id, type, quantity, note)
-- values ('<VARIANT_ID>', 'in', 10, 'test in');

-- 5) inventory OUT decreases stock
-- insert into public.inventory_transactions (variant_id, type, quantity, note)
-- values ('<VARIANT_ID>', 'out', 3, 'test out');

-- 6) current stock = IN - OUT
select * from public.variant_stock where variant_id = '<VARIANT_ID>';
select public.get_variant_stock('<VARIANT_ID>');

-- 7) stock = 0 is allowed (OUT exact balance succeeds)
-- 8) negative stock is rejected (OUT more than balance → P0001 error)
-- insert into public.inventory_transactions (variant_id, type, quantity)
-- values ('<VARIANT_ID>', 'out', 999999);

-- 9) multiple images ordered
select product_id, image_url, sort_order from public.product_images
 where product_id = (select id from public.products where slug='basic-oversized-t-shirt')
 order by sort_order;

-- 10) relationships
select p.slug, c.slug as category, col.name as color, s.name as size, vs.stock
from public.product_variants v
join public.products p on p.id = v.product_id
left join public.categories c on c.id = p.category_id
join public.colors col on col.id = v.color_id
join public.sizes s on s.id = v.size_id
left join public.variant_stock vs on vs.variant_id = v.id
order by p.slug, s.sort_order;
