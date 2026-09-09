/**
 * Phase 1 seed (SERVER ONLY — uses Service Role Key, bypasses RLS).
 *
 * Usage:
 *   1. Apply supabase/migrations/0001_phase1_schema.sql in Supabase SQL Editor.
 *   2. Create Storage bucket `product-images` (the migration does this too).
 *   3. Fill .env from .env.example (needs SUPABASE_SERVICE_ROLE_KEY).
 *   4. Run:  npx tsx scripts/seed.ts   (or: npm run seed — see README)
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile(file: string) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (key && process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.'
  );
}

const supabase = createClient(url, serviceKey);

async function upsertByName(table: string, rows: Record<string, unknown>[], onConflict: string) {
  const { data, error } = await supabase
    .from(table)
    .upsert(rows, { onConflict })
    .select('*');
  if (error) throw new Error(`seed ${table}: ${error.message}`);
  return data;
}

async function main() {
  // ---- categories (4, incl. Accessories) — explicit slugs match the
  // DB auto-slug output, so re-runs upsert instead of duplicating.
  // image_url uses the homepage lookbook photos (temporary local assets;
  // Phase 7 CMS / Storage upload will replace them).
  const categories = (await upsertByName(
    'categories',
    [
      { name: 'Outerwear', slug: 'outerwear', description: 'Premium jackets and coats crafted for everyday layering and essential streetwear style.', image_url: '/images/look-male-coat.jpeg' },
      { name: 'T-Shirts', slug: 't-shirts', description: 'Essential streetwear tees made from heavyweight cotton for everyday comfort.', image_url: '/images/look-female-front.jpeg' },
      { name: 'Bottoms', slug: 'bottoms', description: 'Modern cuts from cargo pants to tailored trousers crafted for everyday style.', image_url: '/images/look-male-triple.jpeg' },
      { name: 'Accessories', slug: 'accessories', description: 'Statement caps, bags, and finishing touches to complete every look.', image_url: '/images/look-female-side.jpeg' },
    ],
    'slug'
  )) as { id: string; name: string; slug: string }[];
  console.log('categories:', categories.map((c) => `${c.name} → ${c.slug}`));

  // ---- colors ----
  const colors = (await upsertByName(
    'colors',
    [
      { name: 'Black', hex_code: '#000000' },
      { name: 'White', hex_code: '#FFFFFF' },
      { name: 'Grey', hex_code: '#808080' },
    ],
    'name'
  )) as { id: string; name: string }[];

  // ---- sizes S/M/L/XL ----
  const sizes = (await upsertByName(
    'sizes',
    [
      { name: 'S', sort_order: 1 },
      { name: 'M', sort_order: 2 },
      { name: 'L', sort_order: 3 },
      { name: 'XL', sort_order: 4 },
    ],
    'name'
  )) as { id: string; name: string }[];

  const colorByName = new Map(colors.map((c) => [c.name, c.id]));
  const sizeByName = new Map(sizes.map((s) => [s.name, s.id]));
  const catByName = new Map(categories.map((c) => [c.name, c.id]));

  // ---- products (3) — explicit slugs (same as trigger output) ----
  const productDefs = [
    {
      name: 'Basic Oversized T-Shirt',
      slug: 'basic-oversized-t-shirt',
      category: 'T-Shirts',
      description: 'Essential oversized tee in heavyweight cotton.',
      material: '100% heavyweight cotton, 220gsm',
      price: 195000,
      featured: true,
      images: ['basic-oversized-t-shirt-1.jpg', 'basic-oversized-t-shirt-2.jpg'],
    },
    {
      name: 'Essential Cargo Pants',
      slug: 'essential-cargo-pants',
      category: 'Bottoms',
      description: 'Modern cargo cut with adjustable hem.',
      material: 'Ripstop cotton twill',
      price: 320000,
      featured: true,
      images: ['essential-cargo-pants-1.jpg'],
    },
    {
      name: 'Classic Utility Jacket',
      slug: 'classic-utility-jacket',
      category: 'Outerwear',
      description: 'Everyday layering jacket with matte hardware.',
      material: 'Water-resistant canvas',
      price: 450000,
      featured: true,
      images: ['classic-utility-jacket-1.jpg', 'classic-utility-jacket-2.jpg'],
    },
  ];

  for (const def of productDefs) {
    const { data: product, error: pErr } = await supabase
      .from('products')
      .upsert(
        {
          name: def.name,
          slug: def.slug,
          category_id: catByName.get(def.category) ?? null,
          description: def.description,
          material: def.material,
          price: def.price,
          featured: def.featured,
        },
        { onConflict: 'slug' }
      )
      .select('*')
      .single();
    if (pErr) throw new Error(`seed product ${def.name}: ${pErr.message}`);
    console.log(`product: ${product.name} → ${product.slug}`);

    // images
    await supabase.from('product_images').delete().eq('product_id', product.id);
    const { error: imgErr } = await supabase.from('product_images').insert(
      def.images.map((file, i) => ({
        product_id: product.id,
        image_url: `product-images/${file}`,
        sort_order: i + 1,
      }))
    );
    if (imgErr) throw new Error(`seed images ${def.name}: ${imgErr.message}`);

    // variants: Black × S/M/L/XL
    for (const sizeName of ['S', 'M', 'L', 'XL']) {
      await supabase.from('product_variants').upsert(
        {
          product_id: product.id,
          color_id: colorByName.get('Black')!,
          size_id: sizeByName.get(sizeName)!,
        },
        { onConflict: 'product_id,color_id,size_id' }
      );
    }
  }

  // ---- inventory: example from spec for Basic Oversized T-Shirt ----
  // Black/S=3, Black/M=5, Black/L=0, Black/XL=2
  const { data: tee } = await supabase
    .from('products')
    .select('id')
    .eq('slug', 'basic-oversized-t-shirt')
    .single();
  if (tee) {
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, size:sizes!inner(name)')
      .eq('product_id', (tee as { id: string }).id);

    const want: Record<string, number> = { S: 3, M: 5, L: 0, XL: 2 };
    type VariantRow = { id: string; size: { name: string } | { name: string }[] };
    const norm = (v: VariantRow): { id: string; sizeName: string } => ({
      id: v.id,
      sizeName: Array.isArray(v.size) ? v.size[0]?.name : v.size?.name,
    });
    for (const v of ((variants ?? []) as VariantRow[]).map(norm)) {
      const qty = want[v.sizeName] ?? 0;
      await supabase.from('inventory_transactions').delete().eq('variant_id', v.id);
      if (qty > 0) {
        const { error } = await supabase.from('inventory_transactions').insert({
          variant_id: v.id,
          type: 'in',
          quantity: qty,
          note: 'Phase 1 seed stock',
        });
        if (error) throw new Error(`seed inventory: ${error.message}`);
      }
    }
    console.log('inventory seeded for basic-oversized-t-shirt (Black): S=3 M=5 L=0 XL=2');
  }

  console.log('Seed complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
